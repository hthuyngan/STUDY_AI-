<#
.SYNOPSIS
  Worker script executed under the isolated Windows identity of 'StudyAICodexReviewer'.
  Polls and executes review requests from the protected IPC directory.
#>
[CmdletBinding()]
param(
    [string]$IpcDirectory = "C:\ProgramData\StudyAI\ReviewIPC",
    [string]$RequestId = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptRoot "agent-guard.ps1")

$currentIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$currentSid = $currentIdentity.User.Value
$currentName = $currentIdentity.Name

$reqDir = Join-Path $IpcDirectory "requests"
$revDir = Join-Path $IpcDirectory "reviews"

if (-not (Test-Path $reqDir)) { return }
if (-not (Test-Path $revDir)) { return }

$filter = if ([string]::IsNullOrWhiteSpace($RequestId)) { "*.json" } else { "$RequestId.json" }
$pendingRequests = Get-ChildItem -Path $reqDir -Filter $filter -File -ErrorAction SilentlyContinue

foreach ($reqFile in $pendingRequests) {
    try {
        $raw = Get-Content $reqFile.FullName -Raw -Encoding UTF8
        $req = $raw | ConvertFrom-Json

        # Verify CallerSid vs ReviewerSid
        if (-not [string]::IsNullOrWhiteSpace($req.caller_sid)) {
            if ($req.caller_sid -eq $currentSid) {
                throw "SID_ISOLATION_FAILURE: Reviewer process is running under the caller's SID ($currentSid)."
            }
        }

        # Validate arguments
        Test-CodexConfigArgsSafe -Model $req.model -ReasoningEffort $req.reasoning_effort
        $resolved = Resolve-CodexExecutable

        $argList = New-Object System.Collections.Generic.List[string]
        foreach ($pa in $resolved.PrefixArgs) { $argList.Add($pa) }
        @(
            "exec", "--ignore-user-config", "--disable", "plugins",
            "-s", "read-only", "--ephemeral", "--json", "--color", "never",
            "-c", ('model="{0}"' -f $req.model),
            "-c", ('model_reasoning_effort="{0}"' -f $req.reasoning_effort),
            "--output-schema", $req.schema_path,
            "-o", (Join-Path $revDir ($req.request_id + ".raw.json")),
            "-C", $req.working_dir,
            "-"
        ) | ForEach-Object { $argList.Add($_) }

        # Environment allowlist
        $allowlist = @("PATH", "SYSTEMROOT", "COMSPEC", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "HOMEDRIVE", "HOMEPATH", "CODEX_HOME", "PATHEXT", "WINDIR", "OS", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE")
        $envDict = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($name in $allowlist) {
            $val = [Environment]::GetEnvironmentVariable($name)
            if (-not [string]::IsNullOrEmpty($val)) { $envDict[$name] = $val }
        }
        $envDict["GIT_CONFIG_NOSYSTEM"] = "1"
        $envDict["GIT_CONFIG_GLOBAL"] = "NUL"
        $envDict["GIT_TERMINAL_PROMPT"] = "0"
        $envDict["GCM_PROVIDER"] = "none"
        $envDict["GCM_INTERACTIVE"] = "never"
        $envDict["GIT_ASKPASS"] = ""
        $envDict["SSH_ASKPASS"] = ""

        $job = New-Object StudyAI.SafeAgent.JobObjectHost
        $rawOutputFile = Join-Path $revDir ($req.request_id + ".raw.json")
        try {
            $timeoutMs = if ($req.timeout_seconds) { [int]$req.timeout_seconds * 1000 } else { 1200000 }
            $res = $job.RunSuspendedInJob($resolved.ExePath, $argList.ToArray(), $req.working_dir, $envDict, $req.prompt_text, $timeoutMs)

            if ($res.TimedOut) {
                throw "CODEX_TIMEOUT: Execution timed out in reviewer worker."
            }
            if ($res.ExitCode -ne 0) {
                throw ("CODEX_EXEC_ERROR: Reviewer worker failed with exit code $($res.ExitCode). " + (Redact-SensitiveText -Text $res.StdErr))
            }
            if (-not (Test-Path $rawOutputFile)) {
                throw "INVALID_REVIEW_OUTPUT: Reviewer worker did not produce output file."
            }

            $rawContent = Get-Content $rawOutputFile -Raw -Encoding UTF8
            $reviewObj = $rawContent | ConvertFrom-Json

            # Add cryptographically signed / authenticated provenance metadata
            $sha256 = [System.Security.Cryptography.SHA256]::Create()
            $contentBytes = [System.Text.Encoding]::UTF8.GetBytes($rawContent)
            $contentHash = [BitConverter]::ToString($sha256.ComputeHash($contentBytes)).Replace("-", "").ToLowerInvariant()

            $provenance = [ordered]@{
                reviewer_sid        = $currentSid
                reviewer_identity   = $currentName
                caller_sid          = $req.caller_sid
                request_id          = $req.request_id
                executed_at_utc     = (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
                content_sha256      = $contentHash
                status              = "VERIFIED"
            }

            $finalOutputFile = Join-Path $revDir ($req.request_id + ".json")
            $provenanceFile  = Join-Path $revDir ($req.request_id + ".provenance.json")

            Set-Content -Path $finalOutputFile -Value $rawContent -Encoding UTF8
            $provenance | ConvertTo-Json -Depth 5 | Set-Content -Path $provenanceFile -Encoding UTF8
        } finally {
            $job.Dispose()
            if (Test-Path $rawOutputFile) { Remove-Item $rawOutputFile -Force -ErrorAction SilentlyContinue }
        }

        # Remove processed request
        Remove-Item $reqFile.FullName -Force -ErrorAction SilentlyContinue
    } catch {
        # Write error record to reviews directory
        $errFile = Join-Path $revDir ($reqFile.BaseName + ".error.json")
        @{
            request_id   = $reqFile.BaseName
            reviewer_sid = $currentSid
            error        = $_.Exception.Message
            failed_at    = (Get-Date).ToUniversalTime().ToString("o")
        } | ConvertTo-Json | Set-Content -Path $errFile -Encoding UTF8
        Remove-Item $reqFile.FullName -Force -ErrorAction SilentlyContinue
    }
}
