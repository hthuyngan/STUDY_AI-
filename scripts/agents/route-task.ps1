<#
.SYNOPSIS
  Executable Dual-Agent Router (ECO / STANDARD only) for STUDY_AI-.
  Disables ADVANCED/multi-worker modes, enforces risk-based escalation, validates
  TASK.json / TEST-SUMMARY.json / REVIEW.json schemas, and blocks scope expansion.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$TaskPacketPath,
    [string]$RepoPath = (Get-Location).Path,
    [string]$HeadSha = "",
    [string]$ReviewJsonPath = "",
    [string]$TestSummaryJsonPath = "",
    [string]$PlanJsonPath = "",
    [switch]$EvaluateCompletion,
    [switch]$HumanApproved
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "agent-guard.ps1")

if (-not (Test-Path $TaskPacketPath)) { throw "ROUTING_ERROR: Task packet not found: $TaskPacketPath" }
$taskRaw = Get-Content $TaskPacketPath -Raw -Encoding UTF8
$task = Test-TaskPacketValid -JsonText $taskRaw

$highRiskPattern = '(?i)(security|auth|rbac|jwt|token|migration|database|sql|studyaidb|ef\s*core|concurrency|lock|architecture|program\.cs|dbcontext|agents\.md|\.github[\\/]workflows|scripts[\\/]agents)'
$codePattern = '(?i)(\.cs|\.ts|\.tsx|\.js|\.jsx|\.ps1|\.sql|\.json|\.yml|\.yaml|\.csproj)$'
$docsOnlyPattern = '(?i)(\.md|\.txt)$'

$isHighRisk = ($task.objective -match $highRiskPattern)
$hasCodeScope = $false
$hasNonDocsScope = $false
foreach ($sf in $task.scope_files) {
    if ($sf -match $highRiskPattern) { $isHighRisk = $true }
    if ($sf -match $codePattern) { $hasCodeScope = $true }
    if ($sf -notmatch $docsOnlyPattern) { $hasNonDocsScope = $true }
}

$effectiveRoute = $task.route
if ($isHighRisk -and $effectiveRoute -eq "ECO") {
    throw "ROUTING_POLICY_VIOLATION: High-risk security/DB/auth/architecture scope cannot be downgraded to ECO. Must be STANDARD."
}
if ($effectiveRoute -eq "ECO" -and ($hasCodeScope -or $hasNonDocsScope)) {
    throw "ROUTING_POLICY_VIOLATION: ECO route is restricted to docs/formatting only and cannot include code or config files."
}

$reviewRequired = ($effectiveRoute -eq "STANDARD")
$decision = [ordered]@{
    task_id               = $task.task_id
    requested_route       = $task.route
    effective_route       = $effectiveRoute
    is_high_risk          = $isHighRisk
    plan_recommended      = $isHighRisk
    review_required       = $reviewRequired
    human_approval_needed = $isHighRisk
    scope_files           = @($task.scope_files)
    status                = "ROUTED"
}

if ($EvaluateCompletion) {
    $resolvedBase = Resolve-GitCommitSha -RepoPath $RepoPath -ShaOrRef $task.base_sha
    $resolvedHead = if ([string]::IsNullOrWhiteSpace($HeadSha)) { (Get-GitState -RepoPath $RepoPath).HeadSha } else { Resolve-GitCommitSha -RepoPath $RepoPath -ShaOrRef $HeadSha }
    Assert-AncestorSha -RepoPath $RepoPath -AncestorSha $resolvedBase -DescendantSha $resolvedHead

    $actualChanged = @(& git -C $RepoPath diff --name-only "$resolvedBase..$resolvedHead" 2>&1 | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($LASTEXITCODE -ne 0) { throw "GIT_ERROR: Failed to inspect changed files." }

    $normalizedScope = @($task.scope_files | ForEach-Object { ($_ -replace '\\', '/').TrimStart('./') })
    $outOfScope = @($actualChanged | Where-Object {
        $norm = ($_ -replace '\\', '/').TrimStart('./')
        $norm -notin $normalizedScope
    })
    if ($outOfScope.Count -gt 0) {
        throw ("SCOPE_EXPANSION_BLOCKED: Implementation modified files outside Task Packet scope: " + ($outOfScope -join ", "))
    }

    foreach ($cf in $actualChanged) {
        if ($cf -match $highRiskPattern -and $effectiveRoute -eq "ECO") {
            throw "ROUTING_ESCALATION_REQUIRED: Changed file '$cf' requires STANDARD route."
        }
        if ($cf -notmatch $docsOnlyPattern -and $effectiveRoute -eq "ECO") {
            throw "ROUTING_POLICY_VIOLATION: ECO task modified non-docs file '$cf'."
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($PlanJsonPath)) {
        if (-not (Test-Path $PlanJsonPath)) { throw "ACCEPTANCE_BLOCKED: Plan file not found: $PlanJsonPath" }
        $planObj = Test-PlanOutputValid -JsonText (Get-Content $PlanJsonPath -Raw -Encoding UTF8) -ExpectedBaseSha $resolvedBase
        if ($planObj.requires_human_approval -and -not $HumanApproved) {
            throw "APPROVAL_REQUIRED: Plan requires explicit human approval before acceptance."
        }
    } elseif ($isHighRisk -and -not $HumanApproved) {
        throw "APPROVAL_REQUIRED: High-risk STANDARD task requires explicit human approval."
    }

    if ($reviewRequired) {
        if ([string]::IsNullOrWhiteSpace($ReviewJsonPath) -or -not (Test-Path $ReviewJsonPath)) {
            throw "ACCEPTANCE_BLOCKED: Mandatory Codex independent review JSON is missing."
        }
        $revObj = Test-ReviewOutputValid -JsonText (Get-Content $ReviewJsonPath -Raw -Encoding UTF8) -ExpectedHeadSha $resolvedHead -ExpectedBaseSha $resolvedBase
        if ($revObj.verdict -ne "PASS") {
            throw "ACCEPTANCE_BLOCKED: Review verdict is '$($revObj.verdict)', not PASS."
        }
        if ([string]::IsNullOrWhiteSpace($TestSummaryJsonPath) -or -not (Test-Path $TestSummaryJsonPath)) {
            throw "ACCEPTANCE_BLOCKED: Acceptance test summary JSON is missing."
        }
        $null = Test-TestSummaryValid -JsonText (Get-Content $TestSummaryJsonPath -Raw -Encoding UTF8) -ExpectedHeadSha $resolvedHead
    }

    $decision.status = "ACCEPTED"
    $decision.head_sha = $resolvedHead
    $decision.changed_files = $actualChanged
}

Write-Output ($decision | ConvertTo-Json -Depth 5)
