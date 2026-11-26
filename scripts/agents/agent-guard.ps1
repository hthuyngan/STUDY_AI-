<#
.SYNOPSIS
  Hardened safety guardrails, DB ownership verification, culture-invariant atomic locking,
  allowlist secret isolation, Windows Job Object process-tree cleanup, strict SHA/schema
  validation, path canonicalization, and atomic review state for STUDY_AI-.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Compile Windows Job Object helper once per PowerShell session (compatible with PS 5.1 and PS 7)
if (-not ([System.Management.Automation.PSTypeName]'StudyAI.SafeAgent.JobObjectHost').Type) {
    Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace StudyAI.SafeAgent
{
    public sealed class JobObjectHost : IDisposable
    {
        private IntPtr _handle;

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct IO_COUNTERS
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        private const int JobObjectExtendedLimitInformation = 9;
        private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateJobObjectW(IntPtr lpJobAttributes, string lpName);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetInformationJobObject(IntPtr hJob, int infoType, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        public JobObjectHost()
        {
            _handle = CreateJobObjectW(IntPtr.Zero, null);
            if (_handle == IntPtr.Zero)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObjectW failed.");

            var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
            IntPtr ptr = Marshal.AllocHGlobal(length);
            try
            {
                Marshal.StructureToPtr(info, ptr, false);
                if (!SetInformationJobObject(_handle, JobObjectExtendedLimitInformation, ptr, (uint)length))
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "SetInformationJobObject failed.");
            }
            finally
            {
                Marshal.FreeHGlobal(ptr);
            }
        }

        public void AssignProcess(Process proc)
        {
            if (_handle == IntPtr.Zero) throw new ObjectDisposedException("JobObjectHost");
            if (!AssignProcessToJobObject(_handle, proc.Handle))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "AssignProcessToJobObject failed.");
        }

        public void TerminateAll(uint exitCode)
        {
            if (_handle != IntPtr.Zero)
            {
                TerminateJobObject(_handle, exitCode);
            }
        }

        public void Dispose()
        {
            if (_handle != IntPtr.Zero)
            {
                CloseHandle(_handle);
                _handle = IntPtr.Zero;
            }
        }
    }
}
"@
}

function Get-AgentConfig {
    param([string]$ConfigPath = (Join-Path $PSScriptRoot "agent-config.json"))
    if (-not (Test-Path $ConfigPath)) {
        throw "Agent config not found: $ConfigPath"
    }
    return (Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Get-StringSha256 {
    param([string]$InputText)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputText)
        $hash = $sha.ComputeHash($bytes)
        return ([System.BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
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
        '(?i)(ANTIGRAVITY_CSRF_TOKEN|GITHUB_TOKEN|GH_TOKEN|OPENAI_API_KEY|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*[^\s"''\r\n]+'
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
    $entry = "{0} [{1}] {2}" -f (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture), $EventName, (Redact-SensitiveText -Text $Message)
    Add-Content -Path $logFile -Value $entry -Encoding UTF8
}

# ============================================================================
# R01 — DATABASE SAFETY (Strict Parser + Whitelist + Ownership Verification)
# ============================================================================

function Parse-SqlConnectionStringStrict {
    param([Parameter(Mandatory = $true)][string]$ConnectionString)

    if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
        throw "DB_SAFETY_VIOLATION: Connection string is empty."
    }

    $pairs = New-Object System.Collections.Generic.List[object]
    $i = 0
    $len = $ConnectionString.Length
    while ($i -lt $len) {
        while ($i -lt $len -and ($ConnectionString[$i] -eq ';' -or [char]::IsWhiteSpace($ConnectionString[$i]))) { $i++ }
        if ($i -ge $len) { break }

        $eqIdx = $ConnectionString.IndexOf('=', $i)
        if ($eqIdx -lt 0) {
            throw "DB_SAFETY_VIOLATION: Malformed connection string segment (missing '=')."
        }
        $key = $ConnectionString.Substring($i, $eqIdx - $i).Trim()
        if ([string]::IsNullOrWhiteSpace($key)) {
            throw "DB_SAFETY_VIOLATION: Malformed connection string segment (empty key)."
        }
        $i = $eqIdx + 1
        while ($i -lt $len -and [char]::IsWhiteSpace($ConnectionString[$i])) { $i++ }

        $valBuilder = New-Object System.Text.StringBuilder
        if ($i -lt $len -and ($ConnectionString[$i] -eq '"' -or $ConnectionString[$i] -eq "'")) {
            $quote = $ConnectionString[$i]
            $i++
            $closed = $false
            while ($i -lt $len) {
                if ($ConnectionString[$i] -eq $quote) {
                    if (($i + 1) -lt $len -and $ConnectionString[$i + 1] -eq $quote) {
                        [void]$valBuilder.Append($quote)
                        $i += 2
                        continue
                    }
                    $i++
                    $closed = $true
                    break
                }
                [void]$valBuilder.Append($ConnectionString[$i])
                $i++
            }
            if (-not $closed) {
                throw "DB_SAFETY_VIOLATION: Unterminated quoted value in connection string."
            }
            while ($i -lt $len -and [char]::IsWhiteSpace($ConnectionString[$i])) { $i++ }
            if ($i -lt $len -and $ConnectionString[$i] -ne ';') {
                throw "DB_SAFETY_VIOLATION: Unexpected trailing characters after quoted value."
            }
        } else {
            while ($i -lt $len -and $ConnectionString[$i] -ne ';') {
                [void]$valBuilder.Append($ConnectionString[$i])
                $i++
            }
        }
        $val = $valBuilder.ToString().Trim()
        $pairs.Add([pscustomobject]@{ Key = $key; Value = $val })
    }

    # Validate via SqlConnectionStringBuilder as secondary structural check
    try {
        Add-Type -AssemblyName System.Data -ErrorAction SilentlyContinue
        $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder($ConnectionString)
        $null = $builder.InitialCatalog
    } catch {
        throw "DB_SAFETY_VIOLATION: Connection string failed SQL Server parser validation."
    }

    # Detect duplicate or conflicting Database / Initial Catalog keys
    $dbEntries = @($pairs | Where-Object { $_.Key -match '^(?i)(Database|Initial\s+Catalog)$' })
    if ($dbEntries.Count -eq 0) {
        throw "DB_SAFETY_VIOLATION: Connection string is missing Database or Initial Catalog."
    }
    $uniqueDbValues = @($dbEntries | ForEach-Object { $_.Value.Trim('[', ']') } | Select-Object -Unique)
    if ($dbEntries.Count -gt 1 -and $uniqueDbValues.Count -gt 1) {
        throw "DB_SAFETY_VIOLATION: Conflicting duplicate Database / Initial Catalog keys detected."
    }

    $dbName = $dbEntries[0].Value.Trim('[', ']')
    if ([string]::IsNullOrWhiteSpace($dbName)) {
        throw "DB_SAFETY_VIOLATION: Target database name is empty."
    }

    return [pscustomobject]@{
        DatabaseName = $dbName
        Pairs        = $pairs
    }
}

function Test-AuthorizedDisposableDatabaseName {
    param([string]$DatabaseName)
    if ([string]::IsNullOrWhiteSpace($DatabaseName)) { return $false }
    $normalized = $DatabaseName.Trim().Trim('[', ']')
    if ($normalized -match '^(?i)StudyAIDb_Clean_([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$') {
        return $true
    }
    return $false
}

function Assert-DatabaseOwnershipManifest {
    param(
        [Parameter(Mandatory = $true)][string]$DatabaseName,
        [string]$ManifestDir = $(if ($env:STUDYAI_DISPOSABLE_MANIFEST_DIR) { $env:STUDYAI_DISPOSABLE_MANIFEST_DIR } else { Join-Path $env:TEMP "studyai-disposable-runs" }),
        [string]$ExpectedOwnershipToken = ""
    )
    if (-not (Test-Path $ManifestDir)) {
        throw "DB_SAFETY_VIOLATION: Disposable database ownership manifest directory not found."
    }
    $manifestFiles = @(Get-ChildItem -Path $ManifestDir -Filter "*.json" -File -ErrorAction SilentlyContinue)
    $matched = $null
    foreach ($mf in $manifestFiles) {
        try {
            $entry = Get-Content $mf.FullName -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop
            if ($entry.databaseName -eq $DatabaseName) {
                $matched = $entry
                break
            }
        } catch {}
    }
    if ($null -eq $matched) {
        throw "DB_SAFETY_VIOLATION: Database '$DatabaseName' has no ownership manifest entry."
    }
    if ($matched.status -notin @("provisioning", "active")) {
        throw "DB_SAFETY_VIOLATION: Database '$DatabaseName' manifest status '$($matched.status)' is not active."
    }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedOwnershipToken) -and $matched.ownershipToken -ne $ExpectedOwnershipToken) {
        throw "DB_SAFETY_VIOLATION: Ownership token mismatch for database '$DatabaseName'."
    }
    return $matched
}

function Assert-DatabaseSafety {
    param(
        [switch]$RequireOwnership,
        [string]$ManifestDir = $(if ($env:STUDYAI_DISPOSABLE_MANIFEST_DIR) { $env:STUDYAI_DISPOSABLE_MANIFEST_DIR } else { Join-Path $env:TEMP "studyai-disposable-runs" }),
        [string]$ExpectedOwnershipToken = ""
    )
    $envKeys = @("ConnectionStrings__DefaultConnection", "STUDYAI_CONNECTION_STRING", "DATABASE_URL", "SQL_CONNECTION_STRING")
    $foundAny = $false
    foreach ($key in $envKeys) {
        $val = [Environment]::GetEnvironmentVariable($key)
        if ([string]::IsNullOrWhiteSpace($val)) { continue }
        $foundAny = $true
        $parsed = Parse-SqlConnectionStringStrict -ConnectionString $val
        if (-not (Test-AuthorizedDisposableDatabaseName -DatabaseName $parsed.DatabaseName)) {
            throw "DB_SAFETY_VIOLATION: Database '$($parsed.DatabaseName)' in '$key' is rejected. Only StudyAIDb_Clean_{Guid:N|Guid:D} is permitted."
        }
        if ($RequireOwnership -or $env:STUDYAI_ENFORCE_DB_OWNERSHIP -eq "1" -or -not [string]::IsNullOrWhiteSpace($ExpectedOwnershipToken)) {
            $null = Assert-DatabaseOwnershipManifest -DatabaseName $parsed.DatabaseName -ManifestDir $ManifestDir -ExpectedOwnershipToken $ExpectedOwnershipToken
        }
    }
    if ($RequireOwnership -and -not $foundAny) {
        throw "DB_SAFETY_VIOLATION: No database connection string found while ownership verification was requested."
    }
    return $true
}

# ============================================================================
# R07 — PATH CANONICALIZATION & SNAPSHOT HARDENING
# ============================================================================

function Test-PathHasReparsePoint {
    param([string]$FullPath)
    $current = $FullPath
    while (-not [string]::IsNullOrWhiteSpace($current)) {
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
            if ($null -ne $item -and ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
                return $true
            }
        }
        $parent = Split-Path -Path $current -Parent
        if ($parent -eq $current) { break }
        $current = $parent
    }
    return $false
}

function Resolve-ApprovedArtifactPath {
    param(
        [Parameter(Mandatory = $true)][string]$CandidatePath,
        [string]$RepoPath = ""
    )
    if ([string]::IsNullOrWhiteSpace($CandidatePath)) {
        throw "PATH_VALIDATION_ERROR: Artifact path cannot be empty."
    }
    if ($CandidatePath -match '(^|[\\/])\.\.([\\/]|$)') {
        throw "PATH_VALIDATION_ERROR: Path traversal ('..') is forbidden: $CandidatePath"
    }
    $fullCandidate = [System.IO.Path]::GetFullPath($CandidatePath)
    if (Test-PathHasReparsePoint -FullPath $fullCandidate) {
        throw "PATH_VALIDATION_ERROR: Symlink or junction detected in path: $fullCandidate"
    }

    $approvedRoots = New-Object System.Collections.Generic.List[string]
    $tempRoot = [System.IO.Path]::GetFullPath($env:TEMP)
    $approvedRoots.Add($tempRoot)
    if (-not [string]::IsNullOrWhiteSpace($RepoPath)) {
        $repoArtifacts = [System.IO.Path]::GetFullPath((Join-Path $RepoPath "docs\agents\.artifacts"))
        $approvedRoots.Add($repoArtifacts)
    }

    $inApprovedRoot = $false
    foreach ($root in $approvedRoots) {
        $rootWithSep = $root.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
        if ($fullCandidate.StartsWith($rootWithSep, [System.StringComparison]::OrdinalIgnoreCase) -or
            $fullCandidate.Equals($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $inApprovedRoot = $true
            break
        }
    }
    if (-not $inApprovedRoot) {
        throw "PATH_VALIDATION_ERROR: Path '$fullCandidate' is outside approved artifact directories."
    }

    # Prevent overwriting source or config files even inside temp fixtures
    if (-not [string]::IsNullOrWhiteSpace($RepoPath)) {
        $fullRepo = [System.IO.Path]::GetFullPath($RepoPath).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
        $repoArtifactsPrefix = [System.IO.Path]::GetFullPath((Join-Path $RepoPath "docs\agents\.artifacts")).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
        if ($fullCandidate.StartsWith($fullRepo, [System.StringComparison]::OrdinalIgnoreCase) -and
            -not $fullCandidate.StartsWith($repoArtifactsPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "PATH_VALIDATION_ERROR: Refusing artifact write inside repository source/config tree: $fullCandidate"
        }
    }

    return $fullCandidate
}

# ============================================================================
# R02 — CULTURE-INVARIANT ATOMIC LOCKING & SINGLE-WRITER ENFORCEMENT
# ============================================================================

function Get-RepoLockScopeKey {
    param([string]$RepoPath)
    $full = [System.IO.Path]::GetFullPath($RepoPath).TrimEnd('\', '/').ToLowerInvariant()
    return (Get-StringSha256 -InputText $full).Substring(0, 16)
}

function Test-LockOwnerAlive {
    param($LockObj)
    if ($null -eq $LockObj -or $null -eq $LockObj.pid) { return $false }
    $proc = Get-Process -Id ([int]$LockObj.pid) -ErrorAction SilentlyContinue
    if ($null -eq $proc) { return $false }
    if (-not [string]::IsNullOrWhiteSpace([string]$LockObj.processStartTimeUtc)) {
        try {
            $expectedStart = [datetimeoffset]::ParseExact([string]$LockObj.processStartTimeUtc, "o", [System.Globalization.CultureInfo]::InvariantCulture)
            $actualStart = [datetimeoffset]$proc.StartTime.ToUniversalTime()
            # PID reuse guard: if start time differs by more than 2 seconds, it's a different process
            if ([Math]::Abs(($actualStart - $expectedStart).TotalSeconds) -gt 2) {
                return $false
            }
        } catch {
            # Some protected/elevated processes may deny StartTime access; check processName fallback
            if (-not [string]::IsNullOrWhiteSpace([string]$LockObj.processName) -and $proc.ProcessName -ne $LockObj.processName) {
                return $false
            }
        }
    }
    return $true
}

function Acquire-AgentLock {
    param(
        [string]$LockName = "studyai-codex-bridge",
        [string]$RepoPath = "",
        [string]$Role = "codex",
        [int]$StaleMinutes = 25,
        [string]$LockDir = (Join-Path $env:TEMP "studyai-agent-locks")
    )
    if (-not (Test-Path $LockDir)) {
        New-Item -ItemType Directory -Path $LockDir -Force | Out-Null
    }
    $scopedName = if ([string]::IsNullOrWhiteSpace($RepoPath)) {
        $LockName
    } else {
        "$LockName-" + (Get-RepoLockScopeKey -RepoPath $RepoPath)
    }
    $lockPath = Join-Path $LockDir "$scopedName.lock"

    if (Test-Path $lockPath) {
        $existing = $null
        try {
            $existing = Get-Content $lockPath -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop
        } catch {
            throw "CONCURRENT_EXECUTION_BLOCKED: Unreadable lock file '$lockPath' exists; fail closed."
        }

        $alive = Test-LockOwnerAlive -LockObj $existing
        $createdUtc = [datetimeoffset]::MinValue
        $parsedOk = $false
        try {
            $createdUtc = [datetimeoffset]::ParseExact(
                [string]$existing.createdAtUtc,
                "o",
                [System.Globalization.CultureInfo]::InvariantCulture,
                [System.Globalization.DateTimeStyles]::RoundtripKind
            )
            $parsedOk = $true
        } catch {
            $parsedOk = $false
        }
        if (-not $parsedOk) {
            throw "CONCURRENT_EXECUTION_BLOCKED: Lock '$scopedName' has invalid timestamp; fail closed."
        }
        $ageMinutes = ((Get-Date).ToUniversalTime() - $createdUtc.UtcDateTime).TotalMinutes
        if ($alive -and $ageMinutes -lt $StaleMinutes) {
            throw "CONCURRENT_EXECUTION_BLOCKED: Lock '$scopedName' ($Role) held by live PID $($existing.pid) since $($existing.createdAtUtc)."
        }
        if ($alive -and $ageMinutes -ge $StaleMinutes) {
            throw "CONCURRENT_EXECUTION_BLOCKED: Lock '$scopedName' ($Role) exceeds ${StaleMinutes}m but owner PID $($existing.pid) is still alive; never delete live lock."
        }
        # Only remove lock when owner process is confirmed dead (stale or PID reused)
        Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
    }

    $currentProc = Get-Process -Id $PID
    $lockId = [guid]::NewGuid().ToString("N")
    $payload = [ordered]@{
        lockId              = $lockId
        pid                 = $PID
        processName         = $currentProc.ProcessName
        processStartTimeUtc = $currentProc.StartTime.ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
        createdAtUtc        = (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
        repoPath            = $RepoPath
        role                = $Role
        host                = $env:COMPUTERNAME
    } | ConvertTo-Json -Compress

    $fs = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $fs.Write($bytes, 0, $bytes.Length)
    } finally {
        $fs.Dispose()
    }
    return [pscustomobject]@{
        LockPath = $lockPath
        LockId   = $lockId
        Pid      = $PID
    }
}

function Release-AgentLock {
    param($LockHandle)
    if ($null -eq $LockHandle) { return }
    $lockPath = if ($LockHandle -is [string]) { $LockHandle } else { $LockHandle.LockPath }
    if ([string]::IsNullOrWhiteSpace($lockPath) -or -not (Test-Path $lockPath)) { return }
    if ($LockHandle -isnot [string] -and -not [string]::IsNullOrWhiteSpace($LockHandle.LockId)) {
        try {
            $existing = Get-Content $lockPath -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop
            if ($existing.lockId -ne $LockHandle.LockId) {
                throw "LOCK_OWNERSHIP_ERROR: Refusing to release lock owned by another run ($($existing.lockId))."
            }
        } catch {
            if ($_.Exception.Message -like "LOCK_OWNERSHIP_ERROR:*") { throw }
        }
    }
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}

function Enter-WorkerLock {
    param([Parameter(Mandatory = $true)][string]$RepoPath)
    return (Acquire-AgentLock -LockName "studyai-worker" -RepoPath $RepoPath -Role "implementation-worker" -StaleMinutes 60)
}

function Exit-WorkerLock {
    param($LockHandle)
    Release-AgentLock -LockHandle $LockHandle
}

# ============================================================================
# R05 — GIT SHA, LINEAGE & FULL SCHEMA VALIDATION
# ============================================================================

function Resolve-GitCommitSha {
    param(
        [Parameter(Mandatory = $true)][string]$RepoPath,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$ShaOrRef
    )
    if ([string]::IsNullOrWhiteSpace($ShaOrRef)) {
        throw "SHA_VALIDATION_ERROR: Commit SHA or ref cannot be empty."
    }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $resolved = (& git -C $RepoPath rev-parse --verify "$ShaOrRef^{commit}" 2>&1 | Out-String).Trim()
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($exitCode -ne 0 -or $resolved -notmatch '^[0-9a-fA-F]{40}$') {
        throw "SHA_VALIDATION_ERROR: Invalid or nonexistent commit SHA '$ShaOrRef'."
    }
    return $resolved.ToLowerInvariant()
}

function Assert-AncestorSha {
    param(
        [Parameter(Mandatory = $true)][string]$RepoPath,
        [Parameter(Mandatory = $true)][string]$AncestorSha,
        [Parameter(Mandatory = $true)][string]$DescendantSha
    )
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & git -C $RepoPath merge-base --is-ancestor $AncestorSha $DescendantSha 2>&1 | Out-Null
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($exitCode -ne 0) {
        throw "STALE_REVIEW_LINEAGE: SHA '$AncestorSha' is not an ancestor of '$DescendantSha'."
    }
}

function Get-GitState {
    param([string]$RepoPath)
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $branch = (& git -C $RepoPath rev-parse --abbrev-ref HEAD 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prevEap; throw "GIT_ERROR: Failed to read branch in $RepoPath" }
    $headSha = (& git -C $RepoPath rev-parse HEAD 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $headSha -notmatch '^[0-9a-fA-F]{40}$') { $ErrorActionPreference = $prevEap; throw "GIT_ERROR: Failed to read HEAD SHA in $RepoPath" }
    $porcelain = @(& git -C $RepoPath status --porcelain 2>&1)
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prevEap; throw "GIT_ERROR: Failed to read git status in $RepoPath" }
    $ErrorActionPreference = $prevEap
    $dirtyFiles = @($porcelain | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    return [pscustomobject]@{
        RepoPath   = $RepoPath
        Branch     = $branch
        HeadSha    = $headSha.ToLowerInvariant()
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

function Assert-ObjectMatchesSchema {
    param(
        [Parameter(Mandatory = $true)]$Obj,
        [Parameter(Mandatory = $true)][string]$SchemaName,
        [string[]]$RequiredProps,
        [string[]]$AllowedProps
    )
    if ($null -eq $Obj) { throw "SCHEMA_VALIDATION_ERROR: $SchemaName object is null." }
    foreach ($req in $RequiredProps) {
        if ($null -eq $Obj.PSObject.Properties[$req]) {
            throw "SCHEMA_VALIDATION_ERROR: $SchemaName missing required property '$req'."
        }
    }
    foreach ($prop in $Obj.PSObject.Properties) {
        if ($prop.Name -notin $AllowedProps) {
            throw "SCHEMA_VALIDATION_ERROR: $SchemaName contains disallowed property '$($prop.Name)'."
        }
    }
}

function Test-TaskPacketValid {
    param([Parameter(Mandatory = $true)][string]$JsonText)
    try { $obj = $JsonText | ConvertFrom-Json -ErrorAction Stop } catch { throw "INVALID_TASK_PACKET: Not valid JSON." }
    Assert-ObjectMatchesSchema -Obj $obj -SchemaName "task-schema" `
        -RequiredProps @("task_id", "route", "objective", "base_sha", "scope_files", "constraints", "acceptance_criteria") `
        -AllowedProps @("task_id", "route", "objective", "base_sha", "plan_ref", "scope_files", "constraints", "acceptance_criteria")
    if ([string]::IsNullOrWhiteSpace([string]$obj.task_id)) { throw "INVALID_TASK_PACKET: task_id is empty." }
    if ($obj.route -notin @("ECO", "STANDARD", "ADVANCED")) { throw "INVALID_TASK_PACKET: Invalid route '$($obj.route)'." }
    if ([string]::IsNullOrWhiteSpace([string]$obj.objective)) { throw "INVALID_TASK_PACKET: objective is empty." }
    if ([string]$obj.base_sha -notmatch '^[0-9a-fA-F]{40}$') { throw "INVALID_TASK_PACKET: base_sha must be a full 40-char hex SHA." }
    if ($obj.scope_files.Count -eq 0 -or $obj.constraints.Count -eq 0 -or $obj.acceptance_criteria.Count -eq 0) {
        throw "INVALID_TASK_PACKET: scope_files, constraints, and acceptance_criteria must be non-empty."
    }
    return $obj
}

function Test-PlanOutputValid {
    param(
        [Parameter(Mandatory = $true)][string]$JsonText,
        [string]$ExpectedBaseSha = ""
    )
    try { $obj = $JsonText | ConvertFrom-Json -ErrorAction Stop } catch { throw "INVALID_PLAN_OUTPUT: Not valid JSON." }
    Assert-ObjectMatchesSchema -Obj $obj -SchemaName "plan-schema" `
        -RequiredProps @("task_title", "base_sha", "scope_files", "risk_level", "requires_human_approval", "workstreams", "acceptance_criteria", "database_safety_notes") `
        -AllowedProps @("task_title", "base_sha", "scope_files", "risk_level", "requires_human_approval", "workstreams", "acceptance_criteria", "database_safety_notes")
    if ([string]::IsNullOrWhiteSpace([string]$obj.task_title)) { throw "INVALID_PLAN_OUTPUT: task_title is empty." }
    if ([string]$obj.base_sha -notmatch '^[0-9a-fA-F]{40}$') { throw "INVALID_PLAN_OUTPUT: base_sha must be a full 40-char hex SHA." }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedBaseSha) -and -not $obj.base_sha.Equals($ExpectedBaseSha, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "STALE_PLAN_REJECTED: Plan base_sha '$($obj.base_sha)' does not match expected '$ExpectedBaseSha'."
    }
    if ($obj.risk_level -notin @("LOW", "MEDIUM", "HIGH")) { throw "INVALID_PLAN_OUTPUT: Invalid risk_level '$($obj.risk_level)'." }
    if ($obj.requires_human_approval -isnot [bool]) { throw "INVALID_PLAN_OUTPUT: requires_human_approval must be boolean." }
    foreach ($ws in $obj.workstreams) {
        Assert-ObjectMatchesSchema -Obj $ws -SchemaName "plan-workstream" `
            -RequiredProps @("id", "title", "owner", "files", "steps") `
            -AllowedProps @("id", "title", "owner", "files", "steps")
        if ($ws.owner -ne "ImplementationWorker") { throw "INVALID_PLAN_OUTPUT: Invalid workstream owner '$($ws.owner)'." }
    }
    return $obj
}

function Test-ReviewOutputValid {
    param(
        [Parameter(Mandatory = $true)][string]$JsonText,
        [Parameter(Mandatory = $true)][string]$ExpectedHeadSha,
        [string]$ExpectedBaseSha = ""
    )
    try {
        $obj = $JsonText | ConvertFrom-Json -ErrorAction Stop
    } catch {
        throw "INVALID_REVIEW_OUTPUT: Output is not valid JSON."
    }

    Assert-ObjectMatchesSchema -Obj $obj -SchemaName "review-schema" `
        -RequiredProps @("base_sha", "head_sha", "reviewed_scope", "verdict", "summary", "findings") `
        -AllowedProps @("base_sha", "head_sha", "reviewed_scope", "verdict", "summary", "findings")

    if ($obj.verdict -notin @("PASS", "BLOCKED", "ERROR")) {
        throw "INVALID_REVIEW_OUTPUT: Invalid verdict '$($obj.verdict)'."
    }
    if ([string]::IsNullOrWhiteSpace([string]$obj.summary)) {
        throw "INVALID_REVIEW_OUTPUT: summary cannot be empty."
    }

    $actualHead = [string]$obj.head_sha
    $actualBase = [string]$obj.base_sha
    if ($actualHead -notmatch '^[0-9a-fA-F]{40}$' -or -not $actualHead.Equals($ExpectedHeadSha, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "STALE_REVIEW_REJECTED: Review head_sha '$actualHead' does not exactly match expected 40-char SHA '$ExpectedHeadSha'."
    }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedBaseSha) -and
        ($actualBase -notmatch '^[0-9a-fA-F]{40}$' -or -not $actualBase.Equals($ExpectedBaseSha, [System.StringComparison]::OrdinalIgnoreCase))) {
        throw "STALE_REVIEW_REJECTED: Review base_sha '$actualBase' does not exactly match expected 40-char SHA '$ExpectedBaseSha'."
    }

    $findingProps = @("finding_id", "severity", "file_path", "line_range", "evidence", "root_cause", "recommended_fix", "required_regression_test")
    $hasBlockingFinding = $false
    foreach ($f in $obj.findings) {
        Assert-ObjectMatchesSchema -Obj $f -SchemaName "review-finding" -RequiredProps $findingProps -AllowedProps $findingProps
        foreach ($fp in $findingProps) {
            if ([string]::IsNullOrWhiteSpace([string]$f.$fp)) {
                throw "INVALID_REVIEW_OUTPUT: Finding field '$fp' cannot be empty."
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

# ============================================================================
# R08 — ATOMIC REVIEW STATE & ROUND TRACKING
# ============================================================================

function Get-ReviewRoundStatePath {
    param([string]$Branch, [string]$BaseSha)
    $stateDir = Join-Path $env:TEMP "studyai-agent-state"
    if (-not (Test-Path $stateDir)) {
        New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    }
    $safeKey = (Get-StringSha256 -InputText "$Branch|$BaseSha").Substring(0, 20)
    return (Join-Path $stateDir "$safeKey-rounds.json")
}

function Write-AtomicJsonFile {
    param([string]$Path, [string]$Content)
    $tmp = "$Path.tmp.$PID." + ([guid]::NewGuid().ToString("N").Substring(0, 8))
    [System.IO.File]::WriteAllText($tmp, $Content, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::Copy($tmp, $Path, $true)
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}

function Get-ReviewRoundState {
    param([string]$Branch, [string]$BaseSha)
    $path = Get-ReviewRoundStatePath -Branch $Branch -BaseSha $BaseSha
    if (-not (Test-Path $path)) {
        return [pscustomobject]@{
            branch               = $Branch
            baseSha              = $BaseSha
            attempted            = 0
            completed            = 0
            failed               = 0
            lastReviewedSha      = ""
            lastVerdict          = ""
            unresolvedFindingIds = @()
        }
    }
    return (Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Start-ReviewAttempt {
    param([string]$Branch, [string]$BaseSha, [int]$MaxRounds = 3)
    $state = Get-ReviewRoundState -Branch $Branch -BaseSha $BaseSha
    if ([int]$state.attempted -ge $MaxRounds) {
        throw "MAX_REVIEW_ROUNDS_EXCEEDED: Already attempted $($state.attempted) of $MaxRounds automatic review rounds for $Branch ($BaseSha)."
    }
    $newAttempt = [int]$state.attempted + 1
    $updated = [ordered]@{
        branch               = $Branch
        baseSha              = $BaseSha
        attempted            = $newAttempt
        completed            = [int]$state.completed
        failed               = [int]$state.failed
        lastReviewedSha      = [string]$state.lastReviewedSha
        lastVerdict          = [string]$state.lastVerdict
        unresolvedFindingIds = @($state.unresolvedFindingIds)
        updatedAtUtc         = (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
    }
    Write-AtomicJsonFile -Path (Get-ReviewRoundStatePath -Branch $Branch -BaseSha $BaseSha) -Content ($updated | ConvertTo-Json -Depth 5)
    return $newAttempt
}

function Complete-ReviewAttempt {
    param(
        [string]$Branch,
        [string]$BaseSha,
        [string]$HeadSha,
        [string]$Verdict,
        [string[]]$UnresolvedFindingIds = @(),
        [bool]$Failed = $false
    )
    $state = Get-ReviewRoundState -Branch $Branch -BaseSha $BaseSha
    $updated = [ordered]@{
        branch               = $Branch
        baseSha              = $BaseSha
        attempted            = [int]$state.attempted
        completed            = $(if ($Failed) { [int]$state.completed } else { [int]$state.completed + 1 })
        failed               = $(if ($Failed) { [int]$state.failed + 1 } else { [int]$state.failed })
        lastReviewedSha      = $(if ($Failed) { [string]$state.lastReviewedSha } else { $HeadSha })
        lastVerdict          = $(if ($Failed) { "ERROR" } else { $Verdict })
        unresolvedFindingIds = @($UnresolvedFindingIds)
        updatedAtUtc         = (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
    }
    Write-AtomicJsonFile -Path (Get-ReviewRoundStatePath -Branch $Branch -BaseSha $BaseSha) -Content ($updated | ConvertTo-Json -Depth 5)
}

# ============================================================================
# R03 + R04 — ALLOWLIST SECRET ISOLATION & JOB OBJECT PROCESS TREE CLEANUP
# ============================================================================

function Get-ChildProcessIds {
    param([int]$ParentPid)
    try {
        return @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentPid" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessId)
    } catch {
        return @()
    }
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

    $codexExe = Get-Command "codex.exe" -ErrorAction SilentlyContinue
    $codexCmd = Get-Command "codex.cmd" -ErrorAction SilentlyContinue
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $argList = @(
        "exec",
        "--ignore-user-config",
        "--disable", "plugins",
        "-s", "read-only",
        "--ephemeral",
        "--json",
        "--color", "never",
        "-c", ('model="{0}"' -f $Model),
        "-c", ('model_reasoning_effort="{0}"' -f $ReasoningEffort),
        "--output-schema", ('"{0}"' -f $SchemaPath),
        "-o", ('"{0}"' -f $OutputFile),
        "-C", ('"{0}"' -f $WorkingDir),
        "-"
    ) -join " "

    if ($null -ne $codexExe) {
        $psi.FileName = $codexExe.Source
        $psi.Arguments = $argList
    } elseif ($null -ne $codexCmd) {
        $psi.FileName = "cmd.exe"
        $psi.Arguments = '/d /s /c ""' + $codexCmd.Source + '" ' + $argList + '"'
    } else {
        throw "CODEX_NOT_FOUND: Neither codex.exe nor codex.cmd found in PATH."
    }

    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    # R03: Strict minimal environment allowlist (never inherit parent secrets)
    $allowlist = @(
        "PATH", "SYSTEMROOT", "COMSPEC", "TEMP", "TMP",
        "USERPROFILE", "LOCALAPPDATA", "APPDATA", "HOMEDRIVE", "HOMEPATH",
        "CODEX_HOME", "PATHEXT", "WINDIR", "OS",
        "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"
    )
    $saved = @{}
    foreach ($name in $allowlist) {
        $val = [Environment]::GetEnvironmentVariable($name)
        if (-not [string]::IsNullOrEmpty($val)) {
            $saved[$name] = $val
        }
    }
    $psi.EnvironmentVariables.Clear()
    foreach ($kv in $saved.GetEnumerator()) {
        $psi.EnvironmentVariables[$kv.Key] = $kv.Value
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $job = New-Object StudyAI.SafeAgent.JobObjectHost
    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $rootPid = 0
    try {
        if (-not $proc.Start()) {
            throw "CODEX_EXEC_ERROR: Failed to start codex process."
        }
        $rootPid = $proc.Id
        $job.AssignProcess($proc)

        $proc.StandardInput.Write($PromptText)
        $proc.StandardInput.Close()

        $stdoutTask = $proc.StandardOutput.ReadToEndAsync()
        $stderrTask = $proc.StandardError.ReadToEndAsync()

        $exited = $proc.WaitForExit($TimeoutSeconds * 1000)
        $sw.Stop()
        if (-not $exited) {
            $job.TerminateAll(137)
            $null = $proc.WaitForExit(5000)
            $remaining = @(Get-ChildProcessIds -ParentPid $rootPid)
            if ($remaining.Count -gt 0 -or -not $proc.HasExited) {
                throw "PROCESS_CLEANUP_FAILED: Orphan descendant processes remained after timeout."
            }
            throw "CODEX_TIMEOUT: Codex execution exceeded ${TimeoutSeconds}s and process tree was terminated."
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

        $usage = @{ input_tokens = 0; cached_input_tokens = 0; output_tokens = 0; reasoning_output_tokens = 0 }
        foreach ($line in ($stdout -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line) -or -not $line.TrimStart().StartsWith("{")) { continue }
            try {
                $evt = $line | ConvertFrom-Json -ErrorAction Stop
                if ($evt.type -eq "turn.completed" -and $null -ne $evt.usage) {
                    $usage.input_tokens = [int]$evt.usage.input_tokens
                    $usage.cached_input_tokens = [int]$evt.usage.cached_input_tokens
                    $usage.output_tokens = [int]$evt.usage.output_tokens
                    $usage.reasoning_output_tokens = [int]$evt.usage.reasoning_output_tokens
                }
            } catch {}
        }
        Write-UsageMetric -Action "codex_exec" -Model $Model -ReasoningEffort $ReasoningEffort `
            -DurationMs ([int]$sw.ElapsedMilliseconds) -CacheHit $false `
            -InputTokens $usage.input_tokens -CachedInputTokens $usage.cached_input_tokens `
            -OutputTokens $usage.output_tokens -ReasoningOutputTokens $usage.reasoning_output_tokens

        return (Get-Content $OutputFile -Raw -Encoding UTF8)
    } finally {
        try {
            if ($null -ne $proc -and -not $proc.HasExited) {
                $job.TerminateAll(1)
                $null = $proc.WaitForExit(3000)
            }
        } catch {}
        $job.Dispose()
        $proc.Dispose()
    }
}

function Write-UsageMetric {
    param(
        [string]$Action,
        [string]$Model,
        [string]$ReasoningEffort,
        [int]$DurationMs,
        [bool]$CacheHit,
        [int]$InputTokens = 0,
        [int]$CachedInputTokens = 0,
        [int]$OutputTokens = 0,
        [int]$ReasoningOutputTokens = 0,
        [string]$UsageDir = (Join-Path $env:TEMP "studyai-agent-usage")
    )
    if (-not (Test-Path $UsageDir)) {
        New-Item -ItemType Directory -Path $UsageDir -Force | Out-Null
    }
    $entry = [ordered]@{
        timestamp               = (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
        action                  = $Action
        model                   = $Model
        reasoning_effort        = $ReasoningEffort
        duration_ms             = $DurationMs
        cache_hit               = $CacheHit
        input_tokens            = $InputTokens
        cached_input_tokens     = $CachedInputTokens
        uncached_input_tokens   = [Math]::Max(0, ($InputTokens - $CachedInputTokens))
        output_tokens           = $OutputTokens
        reasoning_output_tokens = $ReasoningOutputTokens
    } | ConvertTo-Json -Compress
    Add-Content -Path (Join-Path $UsageDir "usage.jsonl") -Value $entry -Encoding UTF8
}

function Get-ReviewCacheKey {
    param(
        [string]$BaseSha,
        [string]$HeadSha,
        [string]$ReviewMode,
        [string]$ScopeSignature,
        [string]$PolicyHash
    )
    return (Get-StringSha256 -InputText "$BaseSha|$HeadSha|$ReviewMode|$ScopeSignature|$PolicyHash")
}

function Get-CachedReview {
    param(
        [string]$CacheKey,
        [string]$ExpectedHeadSha,
        [string]$ExpectedBaseSha = "",
        [int]$TtlHours = 24,
        [string]$CacheDir = (Join-Path $env:TEMP "studyai-agent-cache")
    )
    $path = Join-Path $CacheDir "$CacheKey.json"
    if (-not (Test-Path $path)) { return $null }
    $item = Get-Item $path
    if (((Get-Date) - $item.LastWriteTime).TotalHours -gt $TtlHours) {
        Remove-Item $path -Force -ErrorAction SilentlyContinue
        return $null
    }
    $raw = Get-Content $path -Raw -Encoding UTF8
    $null = Test-ReviewOutputValid -JsonText $raw -ExpectedHeadSha $ExpectedHeadSha -ExpectedBaseSha $ExpectedBaseSha
    return $raw
}

function Set-CachedReview {
    param(
        [string]$CacheKey,
        [string]$ReviewJson,
        [string]$CacheDir = (Join-Path $env:TEMP "studyai-agent-cache")
    )
    if (-not (Test-Path $CacheDir)) {
        New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
    }
    Write-AtomicJsonFile -Path (Join-Path $CacheDir "$CacheKey.json") -Content $ReviewJson
}
