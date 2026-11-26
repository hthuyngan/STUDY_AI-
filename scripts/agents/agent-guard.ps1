<#
.SYNOPSIS
  Safety guardrails, locking, secret redaction, DB protection, and review validation
  for the STUDY_AI- Safe Antigravity + Codex Multi-Agent Workflow.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AgentConfig {
    param([string]$ConfigPath = (Join-Path $PSScriptRoot "agent-config.json"))
    if (-not (Test-Path $ConfigPath)) {
        throw "Agent config not found: $ConfigPath"
    }
    return (Get-Content $ConfigPath -Raw | ConvertFrom-Json)
}

function Redact-SensitiveText {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    $redacted = $Text
    $patterns = @(
        '(?i)(Server|Data Source|Initial Catalog|Database|Password|Pwd|User Id|UID)\s*=\s*[^;"\r\n]+',
        '(?i)Bearer\s+[A-Za-z0-9\-._~+/]+=*',
        'gh[pousr]_[A-Za-z0-9_]{16,}',
        'sk-[A-Za-z0-9\-_]{16,}',
        '(?i)(ANTIGRAVITY_CSRF_TOKEN|GITHUB_TOKEN|GH_TOKEN|OPENAI_API_KEY)\s*[:=]\s*[^\s"''\r\n]+'
    )
    foreach ($p in $patterns) {
        $redacted = [regex]::Replace($redacted, $p, '[REDACTED]')
    }
    return $redacted
}

function Write-AgentAuditLog {
    param(
        [string]$EventName,
        [string]$Message,
        [string]$LogDir = (Join-Path $env:TEMP "studyai-agent-audit")
    )
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    $logFile = Join-Path $LogDir ("audit-" + (Get-Date -Format "yyyy-MM-dd") + ".log")
    $entry = "{0} [{1}] {2}" -f (Get-Date -Format "o"), $EventName, (Redact-SensitiveText -Text $Message)
    Add-Content -Path $LogFile -Value $entry -Encoding UTF8
}

function Assert-DatabaseSafety {
    $envKeys = @("ConnectionStrings__DefaultConnection", "STUDYAI_CONNECTION_STRING", "DATABASE_URL", "SQL_CONNECTION_STRING")
    foreach ($key in $envKeys) {
        $val = [Environment]::GetEnvironmentVariable($key)
        if ([string]::IsNullOrWhiteSpace($val)) { continue }
        if ($val -match '(?i)(Initial Catalog|Database)\s*=\s*StudyAIDb(?:\s*;|\s*$)') {
            throw "DB_SAFETY_VIOLATION: Environment variable '$key' targets protected persistent database StudyAIDb."
        }
        if ($val -match '(?i)StudyAIDb_E2E') {
            throw "DB_SAFETY_VIOLATION: Environment variable '$key' targets forbidden StudyAIDb_E2E."
        }
    }
    return $true
}

function Get-GitState {
    param([string]$RepoPath)
    $branch = (& git -C $RepoPath rev-parse --abbrev-ref HEAD 2>&1).Trim()
    if ($LASTEXITCODE -ne 0) { throw "GIT_ERROR: Failed to read branch in $RepoPath" }
    $headSha = (& git -C $RepoPath rev-parse HEAD 2>&1).Trim()
    if ($LASTEXITCODE -ne 0) { throw "GIT_ERROR: Failed to read HEAD SHA in $RepoPath" }
    $porcelain = @(& git -C $RepoPath status --porcelain 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "GIT_ERROR: Failed to read git status in $RepoPath" }
    $dirtyFiles = @($porcelain | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    return [pscustomobject]@{
        RepoPath   = $RepoPath
        Branch     = $branch
        HeadSha    = $headSha
        IsDirty    = ($dirtyFiles.Count -gt 0)
        DirtyFiles = $dirtyFiles
    }
}

function Assert-CleanWorktree {
    param(
        [string]$RepoPath,
        [switch]$AllowDirty
    )
    $state = Get-GitState -RepoPath $RepoPath
    if ($state.IsDirty -and -not $AllowDirty) {
        throw ("DIRTY_WORKTREE: Refusing automated review/snapshot on dirty worktree ({0} uncommitted items)." -f $state.DirtyFiles.Count)
    }
    return $state
}

function Acquire-AgentLock {
    param(
        [string]$LockName = "studyai-codex-bridge",
        [int]$StaleMinutes = 25
    )
    $lockDir = Join-Path $env:TEMP "studyai-agent-locks"
    if (-not (Test-Path $lockDir)) {
        New-Item -ItemType Directory -Path $lockDir -Force | Out-Null
    }
    $lockPath = Join-Path $lockDir "$LockName.lock"
    if (Test-Path $lockPath) {
        try {
            $existing = Get-Content $lockPath -Raw | ConvertFrom-Json
            $createdAt = [datetime]::Parse($existing.createdAt)
            $proc = Get-Process -Id ([int]$existing.pid) -ErrorAction SilentlyContinue
            if ($null -ne $proc -and ((Get-Date) - $createdAt).TotalMinutes -lt $StaleMinutes) {
                throw "CONCURRENT_EXECUTION_BLOCKED: Lock '$LockName' held by PID $($existing.pid) since $($existing.createdAt)."
            }
            Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
        } catch {
            if ($_.Exception.Message -like "CONCURRENT_EXECUTION_BLOCKED:*") { throw }
            Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
        }
    }
    $payload = @{ pid = $PID; createdAt = (Get-Date).ToString("o"); host = $env:COMPUTERNAME } | ConvertTo-Json -Compress
    $fs = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $fs.Write($bytes, 0, $bytes.Length)
    } finally {
        $fs.Dispose()
    }
    return $lockPath
}

function Release-AgentLock {
    param([string]$LockPath)
    if (-not [string]::IsNullOrWhiteSpace($LockPath) -and (Test-Path $LockPath)) {
        Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-ReviewRoundStatePath {
    param([string]$Branch, [string]$BaseSha)
    $stateDir = Join-Path $env:TEMP "studyai-agent-state"
    if (-not (Test-Path $stateDir)) {
        New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    }
    $safeKey = ($Branch -replace '[^a-zA-Z0-9_-]', '_') + "_" + $BaseSha.Substring(0, [Math]::Min(8, $BaseSha.Length))
    return (Join-Path $stateDir "$safeKey-rounds.json")
}

function Assert-AndIncrementReviewRound {
    param(
        [string]$Branch,
        [string]$BaseSha,
        [int]$MaxRounds = 3
    )
    $path = Get-ReviewRoundStatePath -Branch $Branch -BaseSha $BaseSha
    $round = 0
    if (Test-Path $path) {
        $data = Get-Content $path -Raw | ConvertFrom-Json
        $round = [int]$data.round
    }
    if ($round -ge $MaxRounds) {
        throw "MAX_REVIEW_ROUNDS_EXCEEDED: Already completed $round of $MaxRounds automatic review rounds for $Branch ($BaseSha). Stop and escalate to user."
    }
    $round++
    @{ branch = $Branch; baseSha = $BaseSha; round = $round; updatedAt = (Get-Date).ToString("o") } |
        ConvertTo-Json | Set-Content -Path $path -Encoding UTF8
    return $round
}

function Test-ReviewOutputValid {
    param(
        [Parameter(Mandatory = $true)][string]$JsonText,
        [Parameter(Mandatory = $true)][string]$ExpectedHeadSha
    )
    try {
        $obj = $JsonText | ConvertFrom-Json -ErrorAction Stop
    } catch {
        throw "INVALID_REVIEW_OUTPUT: Output is not valid JSON."
    }

    $requiredProps = @("base_sha", "head_sha", "reviewed_scope", "verdict", "summary", "findings")
    foreach ($prop in $requiredProps) {
        if ($null -eq $obj.PSObject.Properties[$prop]) {
            throw "INVALID_REVIEW_OUTPUT: Missing required field '$prop'."
        }
    }

    if ($obj.verdict -notin @("PASS", "BLOCKED", "ERROR")) {
        throw "INVALID_REVIEW_OUTPUT: Invalid verdict '$($obj.verdict)'."
    }

    $actualHead = [string]$obj.head_sha
    if (-not ($ExpectedHeadSha.StartsWith($actualHead, [System.StringComparison]::OrdinalIgnoreCase) -or
              $actualHead.StartsWith($ExpectedHeadSha, [System.StringComparison]::OrdinalIgnoreCase))) {
        throw "STALE_REVIEW_REJECTED: Review head_sha '$actualHead' does not match expected '$ExpectedHeadSha'."
    }

    $findingProps = @("finding_id", "severity", "file_path", "line_range", "evidence", "root_cause", "recommended_fix", "required_regression_test")
    $hasBlockingFinding = $false
    foreach ($f in $obj.findings) {
        foreach ($fp in $findingProps) {
            if ($null -eq $f.PSObject.Properties[$fp] -or [string]::IsNullOrWhiteSpace([string]$f.$fp)) {
                throw "INVALID_REVIEW_OUTPUT: Finding missing required field '$fp'."
            }
        }
        if ($f.severity -notin @("P0", "P1", "P2", "P3")) {
            throw "INVALID_REVIEW_OUTPUT: Invalid finding severity '$($f.severity)'."
        }
        if ($f.severity -in @("P0", "P1")) {
            $hasBlockingFinding = $true
        }
    }

    if ($obj.verdict -eq "PASS" -and $hasBlockingFinding) {
        throw "INVALID_REVIEW_OUTPUT: Verdict cannot be PASS when P0/P1 findings are present."
    }

    return $obj
}

function Invoke-CodexSandboxed {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDir,
        [Parameter(Mandatory = $true)][string]$PromptText,
        [Parameter(Mandatory = $true)][string]$SchemaPath,
        [Parameter(Mandatory = $true)][string]$OutputFile,
        [Parameter(Mandatory = $true)][string]$Model,
        [Parameter(Mandatory = $true)][string]$ReasoningEffort,
        [int]$TimeoutSeconds = 1200
    )
    $codexArgs = @(
        "exec",
        "--ignore-user-config",
        "--disable", "plugins",
        "-s", "read-only",
        "--ephemeral",
        "--color", "never",
        "-c", ('model="{0}"' -f $Model),
        "-c", ('model_reasoning_effort="{0}"' -f $ReasoningEffort),
        "--output-schema", ('"{0}"' -f $SchemaPath),
        "-o", ('"{0}"' -f $OutputFile),
        "-C", ('"{0}"' -f $WorkingDir),
        "-"
    ) -join " "

    $codexExe = Get-Command "codex.exe" -ErrorAction SilentlyContinue
    $codexCmd = Get-Command "codex.cmd" -ErrorAction SilentlyContinue
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    if ($null -ne $codexExe) {
        $psi.FileName = $codexExe.Source
        $psi.Arguments = $codexArgs
    } elseif ($null -ne $codexCmd) {
        $psi.FileName = "cmd.exe"
        $psi.Arguments = '/d /s /c ""' + $codexCmd.Source + '" ' + $codexArgs + '"'
    } else {
        throw "CODEX_NOT_FOUND: Neither codex.exe nor codex.cmd found in PATH."
    }
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    # Secret isolation: strip sensitive env vars from reviewer child process
    $secretKeys = @(
        "GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY", "ANTIGRAVITY_CSRF_TOKEN",
        "ConnectionStrings__DefaultConnection", "STUDYAI_CONNECTION_STRING",
        "DATABASE_URL", "SQL_CONNECTION_STRING", "AZURE_CLIENT_SECRET"
    )
    foreach ($sk in $secretKeys) {
        if ($psi.EnvironmentVariables.ContainsKey($sk)) {
            $psi.EnvironmentVariables.Remove($sk)
        }
    }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    if (-not $proc.Start()) {
        throw "CODEX_EXEC_ERROR: Failed to start codex process."
    }

    $proc.StandardInput.Write($PromptText)
    $proc.StandardInput.Close()

    $stdoutTask = $proc.StandardOutput.ReadToEndAsync()
    $stderrTask = $proc.StandardError.ReadToEndAsync()

    $exited = $proc.WaitForExit($TimeoutSeconds * 1000)
    if (-not $exited) {
        try { $proc.Kill() } catch {}
        throw "CODEX_TIMEOUT: Codex execution exceeded ${TimeoutSeconds}s and was terminated."
    }

    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result
    $combined = "$stdout`n$stderr"

    if ($combined -match '(?i)(insufficient_quota|rate_limit_exceeded|usage limit|quota exceeded|too many requests|429)') {
        throw "CODEX_QUOTA_EXCEEDED: Codex reported quota or rate limit exhaustion."
    }
    if ($combined -match '(?i)(not logged in|authentication failed|invalid_api_key|401 unauthorized|please run codex login)') {
        throw "CODEX_AUTH_FAILURE: Codex authentication failed. Run 'codex login status' to verify."
    }
    if ($proc.ExitCode -ne 0) {
        $safeErr = Redact-SensitiveText -Text $stderr
        throw "CODEX_EXEC_ERROR: Codex exited with code $($proc.ExitCode). Details: $safeErr"
    }

    if (-not (Test-Path $OutputFile)) {
        throw "INVALID_REVIEW_OUTPUT: Codex did not produce output file '$OutputFile'."
    }
    return (Get-Content $OutputFile -Raw -Encoding UTF8)
}

# End of agent-guard.ps1 helper module
