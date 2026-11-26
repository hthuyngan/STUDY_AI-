<#
.SYNOPSIS
  Deterministic log filter and TEST-SUMMARY.json generator.
  Keeps full raw logs outside model context in %TEMP%\studyai-agent-logs\ and emits
  only compact structured counts and error lines without hiding failures.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$LogPath,
    [Parameter(Mandatory = $true)][string]$Suite,
    [string]$HeadSha = "0000000",
    [int]$MaxErrorLines = 25,
    [string]$OutSummaryPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogPath)) {
    throw "LOG_NOT_FOUND: $LogPath"
}

$lines = @(Get-Content $LogPath -Encoding UTF8)
$passed = 0
$failed = 0
$skipped = 0
$durationMs = 0

foreach ($line in $lines) {
    # dotnet test summary: Passed!  - Failed:     0, Passed:   295, Skipped:     0, Total:   295, Duration: 12 s
    if ($line -match 'Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+)') {
        $failed += [int]$Matches[1]
        $passed += [int]$Matches[2]
        $skipped += [int]$Matches[3]
    }
    # bun test summary: " 2 pass" / " 0 fail" / " 1 skip"
    elseif ($line -match '^\s*(\d+)\s+pass\b') {
        $passed += [int]$Matches[1]
    } elseif ($line -match '^\s*(\d+)\s+fail\b') {
        $failed += [int]$Matches[1]
    } elseif ($line -match '^\s*(\d+)\s+skip\b') {
        $skipped += [int]$Matches[1]
    }
    # vitest / playwright: "Tests  5 passed (5)" or "2 failed"
    elseif ($line -match '\b(\d+)\s+passed\b' -and $line -notmatch 'Passed:') {
        $passed += [int]$Matches[1]
    } elseif ($line -match '\b(\d+)\s+failed\b' -and $line -notmatch 'Failed:') {
        $failed += [int]$Matches[1]
    }
    if ($line -match '\[(\d+(?:\.\d+)?)ms\]') {
        $durationMs = [int][double]$Matches[1]
    }
}

$errorLines = @(
    $lines | Where-Object {
        $_ -match '(?i)(^|\s)(error\s+[A-Z]+\d+|FAIL\b|\(fail\)|Exception:|Unhandled|Assert\.|DB_SAFETY_VIOLATION|StackTrace)'
    } | Select-Object -First $MaxErrorLines
)

$status = if ($failed -gt 0 -or $errorLines.Count -gt 0) { "FAIL" } else { "PASS" }

$summary = [ordered]@{
    head_sha     = $HeadSha
    suite        = $Suite
    status       = $status
    passed       = $passed
    failed       = $failed
    skipped      = $skipped
    duration_ms  = $durationMs
    errors       = @($errorLines)
    raw_log_path = (Resolve-Path $LogPath).Path
}

$json = $summary | ConvertTo-Json -Depth 5
if (-not [string]::IsNullOrWhiteSpace($OutSummaryPath)) {
    $json | Set-Content -Path $OutSummaryPath -Encoding UTF8
}
Write-Output $json
