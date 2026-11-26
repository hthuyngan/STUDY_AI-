<#
.SYNOPSIS
  Single mandatory executable entrypoint for STUDY_AI- Dual-Agent Workflow.
  Enforces:
  1. Pre-flight route validation (ECO / STANDARD only; rejects ADVANCED/multi-worker)
  2. Repo-scoped single-writer lock before any writer execution
  3. Optional Codex review (or fail-closed manual review fallback)
  4. Post-flight completion validation (scope, schema, exact SHA, test summary)
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$TaskPacketPath,
    [string]$RepoPath = (Get-Location).Path,
    [string]$TestSummaryJsonPath = "",
    [string]$ReviewJsonPath = "",
    [string]$PlanJsonPath = "",
    [switch]$RunAutomatedCodexReview,
    [switch]$AllowLocalUserBoundary,
    [switch]$HumanApproved,
    [switch]$EvaluateCompletion
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "agent-guard.ps1")

Assert-DatabaseSafety | Out-Null
$routeRaw = & (Join-Path $PSScriptRoot "route-task.ps1") -TaskPacketPath $TaskPacketPath -RepoPath $RepoPath
$route = $routeRaw | ConvertFrom-Json

$lockHandle = Enter-WorkerLock -RepoPath $RepoPath
try {
    $gitState = Get-GitState -RepoPath $RepoPath
    if ($RunAutomatedCodexReview) {
        if ($route.effective_route -eq "ECO") {
            throw "WORKFLOW_INFO: ECO mode does not invoke automated Codex review."
        }
        $taskObj = Get-Content $TaskPacketPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $revOut = if ([string]::IsNullOrWhiteSpace($ReviewJsonPath)) { Join-Path $env:TEMP ("studyai-dual-review-" + $PID + ".json") } else { $ReviewJsonPath }
        $null = & (Join-Path $PSScriptRoot "codex-review.ps1") `
            -RepoPath $RepoPath -BaseSha $taskObj.base_sha -HeadSha $gitState.HeadSha `
            -ReviewMode initial -OutFile $revOut -RegressionSummaryFile $TestSummaryJsonPath `
            -AllowLocalUserBoundary:$AllowLocalUserBoundary
        $ReviewJsonPath = $revOut
    }

    if ($EvaluateCompletion) {
        $evalArgs = @{
            TaskPacketPath      = $TaskPacketPath
            RepoPath            = $RepoPath
            HeadSha             = $gitState.HeadSha
            ReviewJsonPath      = $ReviewJsonPath
            TestSummaryJsonPath = $TestSummaryJsonPath
            PlanJsonPath        = $PlanJsonPath
            EvaluateCompletion  = $true
            HumanApproved       = $HumanApproved
        }
        $finalJson = & (Join-Path $PSScriptRoot "route-task.ps1") @evalArgs
        Write-Output $finalJson
    } else {
        Write-Output $routeRaw
    }
} finally {
    Exit-WorkerLock -LockHandle $lockHandle
}
