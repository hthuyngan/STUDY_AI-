<#
.SYNOPSIS
  Comprehensive adversarial regression suite for R01-R08 on STUDY_AI- Safe Agent Bridge.
  Runs deterministically in Windows PowerShell 5.1 and PowerShell 7 without Codex auth or real DB.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "agent-guard.ps1")

$passed = 0
$failed = 0
function Assert-True {
    param([string]$Name, [bool]$Condition, [string]$Detail = "")
    if ($Condition) {
        $script:passed++
        Write-Host "[PASS] $Name ($Detail)"
    } else {
        $script:failed++
        Write-Host "[FAIL] $Name ($Detail)"
    }
}

function Assert-ThrowsLike {
    param([string]$Name, [scriptblock]$Block, [string]$Pattern)
    $msg = ""
    $threw = $false
    try { & $Block | Out-Null } catch { $threw = $true; $msg = $_.Exception.Message }
    Assert-True $Name ($threw -and $msg -like $Pattern) $msg
}

# ============================================================================
# R01 — DATABASE SAFETY ADVERSARIAL TESTS
# ============================================================================
$validGuidN = "1234567890abcdef1234567890abcdef"
$validGuidD = "12345678-90ab-cdef-1234-567890abcdef"

$r01BlockedCases = @(
    @{ name = "R01_OtherProduction"; conn = "Server=localhost;Database=OtherProduction;Trusted_Connection=True;" },
    @{ name = "R01_NotAGuid"; conn = "Server=localhost;Database=StudyAIDb_Clean_not-a-guid;Trusted_Connection=True;" },
    @{ name = "R01_QuotedStudyAIDb"; conn = 'Server=localhost;Initial Catalog="StudyAIDb";Trusted_Connection=True;' },
    @{ name = "R01_CaseVariation"; conn = "Server=localhost;dAtAbAsE=sTuDyAiDb;Trusted_Connection=True;" },
    @{ name = "R01_ConflictingDuplicates"; conn = "Server=localhost;Database=StudyAIDb_Clean_$validGuidN;Initial Catalog=StudyAIDb;Trusted_Connection=True;" },
    @{ name = "R01_MissingDatabase"; conn = "Server=localhost;Trusted_Connection=True;" },
    @{ name = "R01_MalformedConnStr"; conn = "Server=localhost;BrokenSegmentWithoutEquals;Database=StudyAIDb_Clean_$validGuidN" },
    @{ name = "R01_UnterminatedQuote"; conn = 'Server=localhost;Database="StudyAIDb_Clean_1234' }
)
foreach ($c in $r01BlockedCases) {
    try {
        $env:ConnectionStrings__DefaultConnection = $c.conn
        Assert-ThrowsLike $c.name { Assert-DatabaseSafety } "DB_SAFETY_VIOLATION:*"
    } finally {
        Remove-Item Env:ConnectionStrings__DefaultConnection -ErrorAction SilentlyContinue
    }
}

# Valid Guid:N and Guid:D: Bridge DB ops disabled by default, allowed only with -AllowCleanGuidEnv
try {
    $env:ConnectionStrings__DefaultConnection = "Server=localhost;Database=StudyAIDb_Clean_$validGuidN;Trusted_Connection=True;"
    Assert-ThrowsLike "R01_BridgeDisabledByDefault" { Assert-DatabaseSafety } "DB_BRIDGE_DISABLED:*"
    Assert-True "R01_ValidGuidN_AllowCleanGuidEnv" (Assert-DatabaseSafety -AllowCleanGuidEnv) "Guid:N allowed with -AllowCleanGuidEnv"

    $env:ConnectionStrings__DefaultConnection = "Server=localhost;Initial Catalog=`"StudyAIDb_Clean_$validGuidD`";Trusted_Connection=True;"
    Assert-True "R01_ValidQuotedGuidD_AllowCleanGuidEnv" (Assert-DatabaseSafety -AllowCleanGuidEnv) "Quoted Guid:D allowed with -AllowCleanGuidEnv"
} finally {
    Remove-Item Env:ConnectionStrings__DefaultConnection -ErrorAction SilentlyContinue
}

# ============================================================================
# R02 — PROCESS LOCK, REAL CONCURRENCY, STALE/PID REUSE, CULTURES
# ============================================================================
$lockDir = Join-Path $env:TEMP ("studyai-r02-locks-" + $PID)
New-Item -ItemType Directory -Path $lockDir -Force | Out-Null
try {
    $h1 = Acquire-AgentLock -LockName "r02-test" -RepoPath "D:\TN-safe-agents" -Role "worker" -LockDir $lockDir
    # Real second process attempting to acquire same lock
    $psExe = (Get-Process -Id $PID).Path
    $cmd = ". '$PSScriptRoot\agent-guard.ps1'; try { Acquire-AgentLock -LockName 'r02-test' -RepoPath 'D:\TN-safe-agents' -Role 'worker' -LockDir '$lockDir' | Out-Null; exit 0 } catch { Write-Output `$_.Exception.Message; exit 42 }"
    $p2 = Start-Process -FilePath $psExe -ArgumentList @("-NoProfile", "-Command", $cmd) -Wait -PassThru -NoNewWindow
    Assert-True "R02_RealTwoProcessConcurrency" ($p2.ExitCode -eq 42) "Second process exit=$($p2.ExitCode)"
    Release-AgentLock -LockHandle $h1

    # Stale lock (dead PID)
    $scopeKey = Get-RepoLockScopeKey -RepoPath "D:\TN-safe-agents"
    $stalePath = Join-Path $lockDir "r02-stale-$scopeKey.lock"
    @{
        lockId = "dead"; pid = 999999; processName = "none"
        processStartTimeUtc = (Get-Date).AddHours(-2).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
        createdAtUtc = (Get-Date).AddHours(-2).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
    } | ConvertTo-Json | Set-Content $stalePath -Encoding UTF8
    $hStale = Acquire-AgentLock -LockName "r02-stale" -RepoPath "D:\TN-safe-agents" -LockDir $lockDir
    Assert-True "R02_StaleDeadPidReplaced" ($null -ne $hStale) "Dead PID lock cleaned and acquired"
    Release-AgentLock -LockHandle $hStale

    # PID reuse (live PID = $PID, but startTimeUtc shifted by 1 hour -> treated as dead/reused PID!)
    $reusePath = Join-Path $lockDir "r02-reuse-$scopeKey.lock"
    @{
        lockId = "reused"; pid = $PID; processName = (Get-Process -Id $PID).ProcessName
        processStartTimeUtc = (Get-Date).AddHours(-3).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
        createdAtUtc = (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
    } | ConvertTo-Json | Set-Content $reusePath -Encoding UTF8
    $hReuse = Acquire-AgentLock -LockName "r02-reuse" -RepoPath "D:\TN-safe-agents" -LockDir $lockDir
    Assert-True "R02_PidReuseHandled" ($null -ne $hReuse) "Reused PID lock safely replaced"
    Release-AgentLock -LockHandle $hReuse

    # Different culture test (vi-VN)
    $origCulture = [System.Threading.Thread]::CurrentThread.CurrentCulture
    try {
        [System.Threading.Thread]::CurrentThread.CurrentCulture = [System.Globalization.CultureInfo]::GetCultureInfo("vi-VN")
        $hCult = Acquire-AgentLock -LockName "r02-culture" -RepoPath "D:\TN-safe-agents" -LockDir $lockDir
        Assert-True "R02_CultureInvariant" ($null -ne $hCult) "Lock acquired under vi-VN culture"
        Release-AgentLock -LockHandle $hCult
    } finally {
        [System.Threading.Thread]::CurrentThread.CurrentCulture = $origCulture
    }
} finally {
    Remove-Item $lockDir -Recurse -Force -ErrorAction SilentlyContinue
}

# ============================================================================
# R03 — ALLOWLIST SECRET ISOLATION, GIT CREDENTIAL ISOLATION & FAIL-CLOSED CODEX
# ============================================================================
try {
    $env:STUDYAI_CANARY_SECRET = "canary-value-999"
    $env:AWS_SECRET_ACCESS_KEY = "aws-secret-999"
    $env:HTTP_PROXY = "http://user:pass@proxy.local:8080"
    $env:GIT_ASKPASS = "C:\secret-askpass.bat"

    $envDict = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($n in @("PATH", "SYSTEMROOT", "COMSPEC", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "HOMEDRIVE", "HOMEPATH", "CODEX_HOME", "PATHEXT", "WINDIR", "OS", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE")) {
        $v = [Environment]::GetEnvironmentVariable($n); if ($v) { $envDict[$n] = $v }
    }
    $envDict["GIT_CONFIG_NOSYSTEM"] = "1"; $envDict["GIT_CONFIG_GLOBAL"] = "NUL"; $envDict["GCM_PROVIDER"] = "none"; $envDict["GIT_ASKPASS"] = ""
    $psExe = (Get-Process -Id $PID).Path
    $jobEnv = New-Object StudyAI.SafeAgent.JobObjectHost
    try {
        $resEnv = $jobEnv.RunSuspendedInJob($psExe, @("-NoProfile", "-Command", "[Environment]::GetEnvironmentVariables().Keys -join ','"), $env:TEMP, $envDict, "", 5000)
        $leaked = ($resEnv.StdOut -match 'STUDYAI_CANARY_SECRET|AWS_SECRET_ACCESS_KEY|HTTP_PROXY')
        Assert-True "R03_AllowlistBlocksAllCanaries" (-not $leaked -and $resEnv.ExitCode -eq 0) "Child env keys isolated"
    } finally { $jobEnv.Dispose() }

    Assert-ThrowsLike "R03_AutomatedCodexDisabledByDefault" {
        Invoke-CodexSandboxed -WorkingDir $env:TEMP -PromptText "x" -SchemaPath "x" -OutputFile "x" -Model "gpt-5.6-sol" -ReasoningEffort "low"
    } "AUTOMATED_CODEX_DISABLED:*"
} finally {
    Remove-Item Env:STUDYAI_CANARY_SECRET, Env:AWS_SECRET_ACCESS_KEY, Env:HTTP_PROXY, Env:GIT_ASKPASS -ErrorAction SilentlyContinue
}

# ============================================================================
# R04 — RACE-FREE CREATE_SUSPENDED + JOB OBJECT PROCESS TREE CLEANUP
# ============================================================================
$psExe = (Get-Process -Id $PID).Path
$job = New-Object StudyAI.SafeAgent.JobObjectHost
try {
    $envTree = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($n in @("PATH", "SYSTEMROOT", "COMSPEC", "TEMP", "TMP")) { $v = [Environment]::GetEnvironmentVariable($n); if ($v) { $envTree[$n] = $v } }
    $treeCmd = "Start-Process '$psExe' -ArgumentList '-NoProfile -Command Start-Sleep 60' -WindowStyle Hidden; Start-Sleep 60"
    $resTree = $job.RunSuspendedInJob($psExe, @("-NoProfile", "-Command", $treeCmd), $env:TEMP, $envTree, "", 1500)
    $childrenAfter = @(Get-ChildProcessIds -ParentPid $resTree.ProcessId)
    Assert-True "R04_SuspendedJobObjectKillsTree" ($resTree.TimedOut -and $childrenAfter.Count -eq 0) "TimedOut=$($resTree.TimedOut), Orphans=$($childrenAfter.Count)"
} finally {
    $job.Dispose()
}

# ============================================================================
# R05 — SHA, LINEAGE & FULL SCHEMA VALIDATION
# ============================================================================
$shaA = "a" * 40
$shaB = "b" * 40
$shaC = "c" * 40
Assert-ThrowsLike "R05_EmptyHead" { Resolve-GitCommitSha -RepoPath "D:\TN-safe-agents" -ShaOrRef "" } "SHA_VALIDATION_ERROR:*"
Assert-ThrowsLike "R05_InvalidSha" { Resolve-GitCommitSha -RepoPath "D:\TN-safe-agents" -ShaOrRef "not-a-sha" } "SHA_VALIDATION_ERROR:*"
Assert-ThrowsLike "R05_WrongHeadExact" {
    $j = @{ base_sha = $shaA; head_sha = $shaB.Substring(0, 7); reviewed_scope = @("a.ts"); verdict = "PASS"; summary = "ok"; findings = @() } | ConvertTo-Json
    Test-ReviewOutputValid -JsonText $j -ExpectedHeadSha $shaB -ExpectedBaseSha $shaA
} "STALE_REVIEW_REJECTED:*"
Assert-ThrowsLike "R05_WrongBaseExact" {
    $j = @{ base_sha = $shaC; head_sha = $shaB; reviewed_scope = @("a.ts"); verdict = "PASS"; summary = "ok"; findings = @() } | ConvertTo-Json
    Test-ReviewOutputValid -JsonText $j -ExpectedHeadSha $shaB -ExpectedBaseSha $shaA
} "STALE_REVIEW_REJECTED:*"
Assert-ThrowsLike "R05_InvalidSeverity" {
    $j = @{ base_sha = $shaA; head_sha = $shaB; reviewed_scope = @("a.ts"); verdict = "BLOCKED"; summary = "x"; findings = @(@{ finding_id="F1"; severity="P9"; file_path="a.ts"; line_range="1"; evidence="e"; root_cause="r"; recommended_fix="f"; required_regression_test="t" }) } | ConvertTo-Json -Depth 4
    Test-ReviewOutputValid -JsonText $j -ExpectedHeadSha $shaB
} "INVALID_REVIEW_OUTPUT:*"
Assert-ThrowsLike "R05_InvalidVerdict" {
    $j = @{ base_sha = $shaA; head_sha = $shaB; reviewed_scope = @("a.ts"); verdict = "MAYBE"; summary = "x"; findings = @() } | ConvertTo-Json
    Test-ReviewOutputValid -JsonText $j -ExpectedHeadSha $shaB
} "INVALID_REVIEW_OUTPUT:*"
Assert-ThrowsLike "R05_InvalidTaskPacket" { Test-TaskPacketValid -JsonText '{"task_id":"T1","route":"FAST"}' } "SCHEMA_VALIDATION_ERROR:*"
Assert-ThrowsLike "R05_InvalidCachedPlan" { Test-PlanOutputValid -JsonText '{"task_title":"X"}' } "SCHEMA_VALIDATION_ERROR:*"

# ============================================================================
# R06 — EXECUTABLE ADAPTIVE ROUTING & R07 PATH HARDENING
# ============================================================================
$r06Dir = Join-Path $env:TEMP ("studyai-r06-repo-" + $PID)
New-Item -ItemType Directory -Path $r06Dir -Force | Out-Null
try {
    & git -C $r06Dir init -q
    & git -C $r06Dir config user.email "r06@studyai.local"
    & git -C $r06Dir config user.name "R06"
    "init" | Set-Content "$r06Dir\README.md" -Encoding UTF8
    & git -C $r06Dir add README.md
    & git -C $r06Dir commit -q -m "base"
    $bSha = (& git -C $r06Dir rev-parse HEAD).Trim()

    # ECO docs task
    $tEco = "$env:TEMP\r06-eco-$PID.json"
    @{ task_id="T1"; route="ECO"; objective="Update README typo"; base_sha=$bSha; scope_files=@("README.md"); constraints=@("none"); acceptance_criteria=@("clean") } | ConvertTo-Json | Set-Content $tEco -Encoding UTF8
    $ecoRes = (& (Join-Path $PSScriptRoot "route-task.ps1") -TaskPacketPath $tEco -RepoPath $r06Dir) | ConvertFrom-Json
    Assert-True "R06_EcoDocsTask" ($ecoRes.effective_route -eq "ECO") "ECO accepted for docs"

    # Security change affecting 1 file -> ECO rejected; ADVANCED disabled
    $tSecBad = "$env:TEMP\r06-secbad-$PID.json"
    @{ task_id="T2"; route="ECO"; objective="Fix auth token check"; base_sha=$bSha; scope_files=@("src/auth.ts"); constraints=@("none"); acceptance_criteria=@("test") } | ConvertTo-Json | Set-Content $tSecBad -Encoding UTF8
    Assert-ThrowsLike "R06_SecurityRejectsEco" { & (Join-Path $PSScriptRoot "route-task.ps1") -TaskPacketPath $tSecBad -RepoPath $r06Dir } "ROUTING_POLICY_VIOLATION:*"

    $tAdv = "$env:TEMP\r06-adv-$PID.json"
    @{ task_id="T2b"; route="ADVANCED"; objective="Add feature"; base_sha=$bSha; scope_files=@("src/app.ts"); constraints=@("none"); acceptance_criteria=@("test") } | ConvertTo-Json | Set-Content $tAdv -Encoding UTF8
    Assert-ThrowsLike "R06_AdvancedDisabled" { & (Join-Path $PSScriptRoot "route-task.ps1") -TaskPacketPath $tAdv -RepoPath $r06Dir } "UNSUPPORTED_MODE_ERROR:*"

    # Malformed test summary & argument injection
    Assert-ThrowsLike "R05_MalformedTestSummaryBlocked" { Test-TestSummaryValid -JsonText '{"head_sha":"bad","status":"PASS","passed":1,"failed":1,"skipped":0,"errors":[],"raw_log_path":"x","suite":"s"}' } "INVALID_TEST_SUMMARY:*"
    Assert-ThrowsLike "R07_ArgumentInjectionModelBlocked" { Test-CodexConfigArgsSafe -Model "gpt-5.6-sol;calc" -ReasoningEffort "low" } "ARGUMENT_INJECTION_BLOCKED:*"
    Assert-ThrowsLike "R07_ArgumentInjectionReasoningBlocked" { Test-CodexConfigArgsSafe -Model "gpt-5.6-sol" -ReasoningEffort "high --bypass" } "ARGUMENT_INJECTION_BLOCKED:*"

    # Mandatory entrypoint invoke-dual-agent.ps1 + Missing Mandatory Review + Context Recovery
    $tEntry = "$env:TEMP\r06-entry-$PID.json"
    @{ task_id="T_ECO"; route="ECO"; objective="Update README"; base_sha=$bSha; scope_files=@("README.md"); constraints=@("none"); acceptance_criteria=@("clean") } | ConvertTo-Json | Set-Content $tEntry -Encoding UTF8
    $entryOut = (& (Join-Path $PSScriptRoot "invoke-dual-agent.ps1") -TaskPacketPath $tEntry -RepoPath $r06Dir) | ConvertFrom-Json
    Assert-True "R06_InvokeDualAgentEntrypoint" ($entryOut.effective_route -eq "ECO" -and $entryOut.status -eq "ROUTED") "Single entrypoint enforced"

    $tMissingRev = "$env:TEMP\r06-missingrev-$PID.json"
    @{ task_id="T_STD_MISS"; route="STANDARD"; objective="Update item"; base_sha=$bSha; scope_files=@("extra.ts"); constraints=@("none"); acceptance_criteria=@("test") } | ConvertTo-Json | Set-Content $tMissingRev -Encoding UTF8
    Assert-ThrowsLike "R06_MissingMandatoryReviewBlocked" {
        & (Join-Path $PSScriptRoot "invoke-dual-agent.ps1") -TaskPacketPath $tMissingRev -RepoPath $r06Dir -EvaluateCompletion
    } "ACCEPTANCE_BLOCKED:*"

    Assert-ThrowsLike "ContextRecovery_RejectsStaleSummary" {
        $staleSum = @{ head_sha=$bSha; suite="s"; status="PASS"; passed=1; failed=0; skipped=0; errors=@(); raw_log_path="x" } | ConvertTo-Json
        Test-TestSummaryValid -JsonText $staleSum -ExpectedHeadSha ("f" * 40)
    } "STALE_TEST_SUMMARY:*"

    # Auth failure & Quota failure detection via JobObjectHost
    $cmdExe = (Get-Command "cmd.exe").Source
    $jobFail = New-Object StudyAI.SafeAgent.JobObjectHost
    try {
        $envFail = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($n in @("PATH", "SYSTEMROOT", "COMSPEC", "TEMP", "TMP")) { $v = [Environment]::GetEnvironmentVariable($n); if ($v) { $envFail[$n] = $v } }
        $rAuth = $jobFail.RunSuspendedInJob($cmdExe, @("/d", "/c", "echo 401 unauthorized please run codex login & exit /b 1"), $env:TEMP, $envFail, "", 10000)
        Assert-True "R04_AuthFailurePatternDetected" ($rAuth.ExitCode -ne 0 -and $rAuth.StdOut -match '(?i)(not logged in|401 unauthorized|please run codex login)') "Auth failure detected"
        $rQuota = $jobFail.RunSuspendedInJob($cmdExe, @("/d", "/c", "echo rate_limit_exceeded 429 & exit /b 1"), $env:TEMP, $envFail, "", 10000)
        Assert-True "R04_QuotaFailurePatternDetected" ($rQuota.ExitCode -ne 0 -and $rQuota.StdOut -match '(?i)(insufficient_quota|rate_limit_exceeded|429)') "Quota failure detected"
    } finally { $jobFail.Dispose() }

    # Scope expansion + missing approval + missing review
    "code" | Set-Content "$r06Dir\extra.ts" -Encoding UTF8
    & git -C $r06Dir add extra.ts
    & git -C $r06Dir commit -q -m "out of scope"
    $hSha = (& git -C $r06Dir rev-parse HEAD).Trim()

    $tStd = "$env:TEMP\r06-std-$PID.json"
    @{ task_id="T3"; route="STANDARD"; objective="Update CRUD item"; base_sha=$bSha; scope_files=@("item.ts"); constraints=@("none"); acceptance_criteria=@("test") } | ConvertTo-Json | Set-Content $tStd -Encoding UTF8
    Assert-ThrowsLike "R06_ScopeExpansionBlocked" { & (Join-Path $PSScriptRoot "route-task.ps1") -TaskPacketPath $tStd -RepoPath $r06Dir -HeadSha $hSha -EvaluateCompletion } "SCOPE_EXPANSION_BLOCKED:*"

    # Lineage non-ancestor test
    & git -C $r06Dir checkout -q -b side $bSha
    "side" | Set-Content "$r06Dir\side.ts" -Encoding UTF8
    & git -C $r06Dir add side.ts
    & git -C $r06Dir commit -q -m "side"
    $sideSha = (& git -C $r06Dir rev-parse HEAD).Trim()
    Assert-ThrowsLike "R05_StaleLineageRejected" { Assert-AncestorSha -RepoPath $r06Dir -AncestorSha $hSha -DescendantSha $sideSha } "STALE_REVIEW_LINEAGE:*"

    # R07 Path hardening
    Assert-ThrowsLike "R07_TraversalBlocked" { Resolve-ApprovedArtifactPath -CandidatePath "$env:TEMP\..\Windows\system.ini" } "PATH_VALIDATION_ERROR:*"
    Assert-ThrowsLike "R07_OutsideApprovedBlocked" { Resolve-ApprovedArtifactPath -CandidatePath "C:\Windows\Temp\evil.json" } "PATH_VALIDATION_ERROR:*"
    $spacePath = Resolve-ApprovedArtifactPath -CandidatePath "$env:TEMP\studyai path with spaces & 'quotes'\out.json"
    Assert-True "R07_SpacesAndMetacharsSafe" ($spacePath -like "*studyai path with spaces*") "Canonicalized safely"
} finally {
    Remove-Item $r06Dir, "$env:TEMP\r06-*" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "ADVERSARIAL SUITE SUMMARY: $passed PASS, $failed FAIL"
if ($failed -gt 0) { throw "Adversarial suite failed with $failed failure(s)." }
exit 0
