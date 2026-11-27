<#
.SYNOPSIS
  Comprehensive tests for the Review-Cycle-Aware Orchestrator and Verdict Aggregator.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "agent-guard.ps1")
. (Join-Path $PSScriptRoot "review-orchestrator.ps1")

$passed = 0
function Assert-True {
    param([bool]$Cond, [string]$Name)
    if (-not $Cond) { throw "TEST_FAILED: $Name" }
    $script:passed++
    Write-Output "[PASS] $Name"
}

function Assert-Throws {
    param([scriptblock]$Block, [string]$ExpectedPattern, [string]$Name)
    $threw = $false
    try { & $Block } catch {
        $threw = ($_.Exception.Message -match $ExpectedPattern)
        if (-not $threw) { throw "TEST_FAILED: $Name threw unexpected: $($_.Exception.Message)" }
    }
    if (-not $threw) { throw "TEST_FAILED: $Name did not throw '$ExpectedPattern'" }
    $script:passed++
    Write-Output "[PASS] $Name"
}

$sid = "test-sess-" + ([guid]::NewGuid().ToString("N").Substring(0, 8))
$fp = "abc123def456"
$null = New-ReviewSessionState -ReviewSessionId $sid -Branch "feature/test" -BaseSha "0143e2dfc5c4db80c0bae0ce322971cfec5f3f11" -SnapshotId "snap-abc123" -SnapshotFingerprint $fp -RemediationRound 1

# 1. Nine packets in one logical review round do not burn remediation rounds
$nine = @("A", "B", "C", "D", "E", "F", "G", "H", "FINAL")
foreach ($p in $nine) {
    Assert-PacketInvocationAllowed -ReviewSessionId $sid -PacketId $p -SnapshotFingerprint $fp -RemediationRound 1 -ContextChars 1000
    Record-PacketReviewResult -ReviewSessionId $sid -PacketId $p -SnapshotFingerprint $fp -Verdict "PASS" -Findings @()
}
$agg = Get-AggregatedReviewVerdict -ReviewSessionId $sid -RequiredPackets $nine -ExpectedSnapshotFingerprint $fp
Assert-True ($agg.verdict -eq "APPROVED") "NinePackets_OneRound_Approved"

# 2. Max remediation rounds enforced
Assert-Throws { Assert-PacketInvocationAllowed -ReviewSessionId $sid -PacketId "A" -SnapshotFingerprint $fp -RemediationRound 4 } "MAX_REMEDIATION_ROUNDS_EXCEEDED" "MaxRemediationRounds_Enforced"

# 3. Max retries per packet enforced (2 retries allowed, 3rd throws)
Assert-PacketInvocationAllowed -ReviewSessionId $sid -PacketId "A" -SnapshotFingerprint $fp -RemediationRound 1 -ContextChars 100
Assert-PacketInvocationAllowed -ReviewSessionId $sid -PacketId "A" -SnapshotFingerprint $fp -RemediationRound 1 -ContextChars 100
Assert-Throws { Assert-PacketInvocationAllowed -ReviewSessionId $sid -PacketId "A" -SnapshotFingerprint $fp -RemediationRound 1 -ContextChars 100 } "MAX_PACKET_RETRIES_EXCEEDED" "MaxRetriesPerPacket_Enforced"

# 4. Max packets per session enforced
$sid2 = "test-maxpkt-" + ([guid]::NewGuid().ToString("N").Substring(0, 8))
$null = New-ReviewSessionState -ReviewSessionId $sid2 -Branch "feature/test" -BaseSha "0143e2dfc5c4db80c0bae0ce322971cfec5f3f11" -SnapshotId "snap-2" -SnapshotFingerprint $fp -RemediationRound 1
for ($i = 1; $i -le 12; $i++) {
    Assert-PacketInvocationAllowed -ReviewSessionId $sid2 -PacketId "P$i" -SnapshotFingerprint $fp -RemediationRound 1 -ContextChars 10
}
Assert-Throws { Assert-PacketInvocationAllowed -ReviewSessionId $sid2 -PacketId "P13" -SnapshotFingerprint $fp -RemediationRound 1 -ContextChars 10 } "MAX_PACKETS_EXCEEDED" "MaxPacketsPerSession_Enforced"

# 5. Missing packet -> INCOMPLETE
$aggMissing = Get-AggregatedReviewVerdict -ReviewSessionId $sid -RequiredPackets ($nine + @("EXTRA")) -ExpectedSnapshotFingerprint $fp
Assert-True ($aggMissing.verdict -eq "INCOMPLETE") "MissingPacket_Returns_INCOMPLETE"

# 6. Duplicate packet -> ERROR
$dupResults = @(
    [pscustomobject]@{ packetId = "A"; snapshotFingerprint = $fp; verdict = "PASS"; findings = @() },
    [pscustomobject]@{ packetId = "A"; snapshotFingerprint = $fp; verdict = "PASS"; findings = @() }
)
$aggDup = Get-AggregatedReviewVerdict -ReviewSessionId "override" -RequiredPackets @("A") -ExpectedSnapshotFingerprint $fp -PacketResultsOverride $dupResults
Assert-True ($aggDup.verdict -eq "ERROR") "DuplicatePacket_Returns_ERROR"

# 7. Snapshot fingerprint mismatch -> STALE (session & aggregator)
Assert-Throws { Assert-PacketInvocationAllowed -ReviewSessionId $sid -PacketId "B" -SnapshotFingerprint "different_fp" -RemediationRound 1 } "STALE_SNAPSHOT" "SnapshotMismatch_Throws_STALE"
$aggStale = Get-AggregatedReviewVerdict -ReviewSessionId $sid -RequiredPackets $nine -ExpectedSnapshotFingerprint "newer_fp"
Assert-True ($aggStale.verdict -eq "STALE") "Aggregator_SnapshotMismatch_Returns_STALE"

# 8. Packet ERROR -> overall ERROR (never APPROVED)
$errResults = @(
    [pscustomobject]@{ packetId = "A"; snapshotFingerprint = $fp; verdict = "PASS"; findings = @() },
    [pscustomobject]@{ packetId = "B"; snapshotFingerprint = $fp; verdict = "ERROR"; findings = @() }
)
$aggErr = Get-AggregatedReviewVerdict -ReviewSessionId "override" -RequiredPackets @("A", "B") -ExpectedSnapshotFingerprint $fp -PacketResultsOverride $errResults
Assert-True ($aggErr.verdict -eq "ERROR") "PacketError_Prevents_APPROVED"

# 9. P0/P1 finding -> BLOCKED
$blkResults = @(
    [pscustomobject]@{ packetId = "A"; snapshotFingerprint = $fp; verdict = "PASS"; findings = @([pscustomobject]@{ severity = "P1"; finding_id = "F1" }) }
)
$aggBlk = Get-AggregatedReviewVerdict -ReviewSessionId "override" -RequiredPackets @("A") -ExpectedSnapshotFingerprint $fp -PacketResultsOverride $blkResults
Assert-True ($aggBlk.verdict -eq "BLOCKED") "P1Finding_Returns_BLOCKED"

# Cleanup test session files
Remove-Item (Get-ReviewSessionStatePath -ReviewSessionId $sid) -Force -ErrorAction SilentlyContinue
Remove-Item (Get-ReviewSessionStatePath -ReviewSessionId $sid2) -Force -ErrorAction SilentlyContinue

Write-Output "REVIEW_ORCHESTRATOR_TESTS: $passed PASS, 0 FAIL"
