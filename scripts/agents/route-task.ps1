<#
.SYNOPSIS
  Executable Adaptive Router (ECO / STANDARD / ADVANCED) for STUDY_AI-.
  Validates Task Packet schema, enforces risk-based escalation (never downgrading
  security/auth/RBAC/migration/DB/architecture), detects scope expansion, and
  blocks final acceptance without required review and test evidence.
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

if (-not (Test-Path $TaskPacketPath)) {
    throw "ROUTING_ERROR: Task packet not found: $TaskPacketPath"
}
$taskRaw = Get-Content $TaskPacketPath -Raw -Encoding UTF8
$task = Test-TaskPacketValid -JsonText $taskRaw

$highRiskPattern = '(?i)(security|auth|rbac|jwt|token|migration|database|sql|studyaidb|ef\s*core|concurrency|lock|architecture|program\.cs|dbcontext|agents\.md|\.github[\\/]workflows|scripts[\\/]agents)'
$codePattern = '(?i)(\.cs|\.ts|\.tsx|\.js|\.jsx|\.ps1|\.sql|\.json|\.yml|\.yaml|\.csproj)$'
$docsOnlyPattern = '(?i)(\.md|\.txt)$'

$requiresAdvanced = ($task.objective -match $highRiskPattern)
$hasCodeScope = $false
$hasNonDocsScope = $false
foreach ($sf in $task.scope_files) {
    if ($sf -match $highRiskPattern) { $requiresAdvanced = $true }
    if ($sf -match $codePattern) { $hasCodeScope = $true }
    if ($sf -notmatch $docsOnlyPattern) { $hasNonDocsScope = $true }
}

$effectiveRoute = $task.route
if ($requiresAdvanced -and $effectiveRoute -ne "ADVANCED") {
    throw "ROUTING_POLICY_VIOLATION: Task involves high-risk security/DB/auth/architecture scope and cannot be routed as '$($task.route)'. Must be ADVANCED."
}
if ($effectiveRoute -eq "ECO" -and ($hasCodeScope -or $hasNonDocsScope)) {
    throw "ROUTING_POLICY_VIOLATION: ECO route is restricted to small docs/formatting changes and cannot be used for code or config files."
}

$planRequired = ($effectiveRoute -eq "ADVANCED")
$reviewRequired = ($effectiveRoute -in @("STANDARD", "ADVANCED"))

$decision = [ordered]@{
    task_id               = $task.task_id
    requested_route       = $task.route
    effective_route       = $effectiveRoute
    plan_required         = $planRequired
    review_required       = $reviewRequired
    human_approval_needed = ($effectiveRoute -eq "ADVANCED")
    scope_files           = @($task.scope_files)
    status                = "ROUTED"
}

if ($EvaluateCompletion) {
    $resolvedBase = Resolve-GitCommitSha -RepoPath $RepoPath -ShaOrRef $task.base_sha
    $resolvedHead = if ([string]::IsNullOrWhiteSpace($HeadSha)) {
        (Get-GitState -RepoPath $RepoPath).HeadSha
    } else {
        Resolve-GitCommitSha -RepoPath $RepoPath -ShaOrRef $HeadSha
    }
    Assert-AncestorSha -RepoPath $RepoPath -AncestorSha $resolvedBase -DescendantSha $resolvedHead

    $actualChanged = @(& git -C $RepoPath diff --name-only "$resolvedBase..$resolvedHead" 2>&1 | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($LASTEXITCODE -ne 0) { throw "GIT_ERROR: Failed to inspect changed files." }

    # Detect scope expansion
    $normalizedScope = @($task.scope_files | ForEach-Object { ($_ -replace '\\', '/').TrimStart('./') })
    $outOfScope = @($actualChanged | Where-Object {
        $norm = ($_ -replace '\\', '/').TrimStart('./')
        $norm -notin $normalizedScope
    })
    if ($outOfScope.Count -gt 0) {
        throw ("SCOPE_EXPANSION_BLOCKED: Implementation modified files outside Task Packet scope: " + ($outOfScope -join ", "))
    }

    # Re-check actual changed files for high-risk or code changes
    foreach ($cf in $actualChanged) {
        if ($cf -match $highRiskPattern -and $effectiveRoute -ne "ADVANCED") {
            throw "ROUTING_ESCALATION_REQUIRED: Changed file '$cf' triggers ADVANCED route."
        }
        if ($cf -notmatch $docsOnlyPattern -and $effectiveRoute -eq "ECO") {
            throw "ROUTING_POLICY_VIOLATION: ECO task modified non-docs file '$cf'."
        }
    }

    if ($planRequired) {
        if ([string]::IsNullOrWhiteSpace($PlanJsonPath) -or -not (Test-Path $PlanJsonPath)) {
            throw "ACCEPTANCE_BLOCKED: ADVANCED route requires validated PLAN JSON."
        }
        $planObj = Test-PlanOutputValid -JsonText (Get-Content $PlanJsonPath -Raw -Encoding UTF8) -ExpectedBaseSha $resolvedBase
        if ($planObj.requires_human_approval -and -not $HumanApproved) {
            throw "APPROVAL_REQUIRED: Plan requires explicit human approval before acceptance."
        }
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
        $testObj = Get-Content $TestSummaryJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($testObj.status -ne "PASS" -or -not ([string]$testObj.head_sha).Equals($resolvedHead, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "ACCEPTANCE_BLOCKED: Test summary is not PASS for exact HEAD '$resolvedHead'."
        }
    }

    $decision.status = "ACCEPTED"
    $decision.head_sha = $resolvedHead
    $decision.changed_files = $actualChanged
}

Write-Output ($decision | ConvertTo-Json -Depth 5)
