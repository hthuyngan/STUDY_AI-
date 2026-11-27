<#
.SYNOPSIS
  Review-Cycle-Aware Orchestrator, Packet Planner & Deterministic Verdict Aggregator
  for STUDY_AI- Dual-Agent Workflow.
#>

function Get-ReviewOrchestrationLimits {
    param($Config)
    return [pscustomobject]@{
        MaxRemediationRounds = 3
        MaxPacketsPerSession = 12
        MaxRetriesPerPacket  = 2
        MaxTotalInvocations  = 36
        MaxDurationSeconds   = 1800
        MaxDiffChars         = [int]$Config.tokenOptimization.maxDiffChars
        MaxTotalContextChars = 480000
    }
}

function Get-ChangesetManifest {
    param(
        [Parameter(Mandatory = $true)][string]$RepoPath,
        [Parameter(Mandatory = $true)][string]$BaseSha
    )
    $prevEap = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    try {
        $tracked = @(& git -C $RepoPath diff --name-only "$BaseSha..HEAD" -- . ':(exclude)node_modules' ':(exclude)*/bin/*' ':(exclude)*/obj/*' ':(exclude)*/dist/*' ':(exclude)*lock*' 2>$null)
        $porcelain = @(& git -C $RepoPath status --porcelain -uall 2>$null)
    } finally {
        $ErrorActionPreference = $prevEap
    }

    $entries = New-Object System.Collections.Generic.List[object]
    $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)

    foreach ($p in $porcelain) {
        if ([string]::IsNullOrWhiteSpace($p) -or $p.Length -lt 4) { continue }
        $xy = $p.Substring(0, 2).Trim()
        $rel = $p.Substring(3).Trim().Trim('"')
        if ($rel -match ' -> ') { $rel = ($rel -split ' -> ')[-1].Trim('"') }
        if ($rel -match '(^|[\\/])(node_modules|bin|obj|dist|\.git)([\\/]|$)') { continue }
        if ($rel -match '\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|lockb)$') { continue }
        $full = Join-Path $RepoPath $rel
        $sha = if ($xy -match 'D') { "DELETED" } elseif (Test-Path -LiteralPath $full -PathType Leaf) {
            (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
        } else { "MISSING" }
        if ($seen.Add($rel)) {
            $entries.Add([pscustomobject]@{ path = $rel; status = $xy; sha256 = $sha })
        }
    }

    foreach ($t in $tracked) {
        if ([string]::IsNullOrWhiteSpace($t)) { continue }
        $rel = $t.Trim()
        if ($rel -match '(^|[\\/])(node_modules|bin|obj|dist|\.git)([\\/]|$)') { continue }
        if ($seen.Add($rel)) {
            $full = Join-Path $RepoPath $rel
            $sha = if (Test-Path -LiteralPath $full -PathType Leaf) {
                (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
            } else { "DELETED" }
            $entries.Add([pscustomobject]@{ path = $rel; status = "C"; sha256 = $sha })
        }
    }

    $sorted = @($entries | Sort-Object path)
    $manifestText = ($sorted | ForEach-Object { "$($_.status) $($_.path) $($_.sha256)" }) -join "`n"
    $fingerprint = Get-StringSha256 -InputText $manifestText
    return [pscustomobject]@{
        snapshot_id          = "snap-" + $fingerprint.Substring(0, 12)
        snapshot_fingerprint = $fingerprint
        files                = $sorted
    }
}

function Get-ReviewSessionStatePath {
    param([string]$ReviewSessionId)
    $stateDir = Join-Path $env:TEMP "studyai-agent-state"
    if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Path $stateDir -Force | Out-Null }
    $safe = ($ReviewSessionId -replace '[^a-zA-Z0-9_-]', '_')
    return (Join-Path $stateDir "session-$safe.json")
}

function New-ReviewSessionState {
    param(
        [string]$ReviewSessionId,
        [string]$Branch,
        [string]$BaseSha,
        [string]$SnapshotId,
        [string]$SnapshotFingerprint,
        [int]$RemediationRound = 1
    )
    $state = [ordered]@{
        reviewSessionId     = $ReviewSessionId
        branch              = $Branch
        baseSha             = $BaseSha
        snapshotId          = $SnapshotId
        snapshotFingerprint = $SnapshotFingerprint
        remediationRound    = $RemediationRound
        totalInvocations    = 0
        totalContextChars   = 0
        startedAtUtc        = (Get-Date).ToUniversalTime().ToString("o", [System.Globalization.CultureInfo]::InvariantCulture)
        packets             = [ordered]@{}
    }
    Write-AtomicJsonFile -Path (Get-ReviewSessionStatePath -ReviewSessionId $ReviewSessionId) -Content ($state | ConvertTo-Json -Depth 8)
    return $state
}

function Assert-PacketInvocationAllowed {
    param(
        [string]$ReviewSessionId,
        [string]$PacketId,
        [string]$SnapshotFingerprint,
        [int]$RemediationRound,
        [int]$ContextChars = 0,
        $Limits = $null
    )
    if ($null -eq $Limits) { $Limits = Get-ReviewOrchestrationLimits -Config (Get-AgentConfig) }
    if ($RemediationRound -lt 1 -or $RemediationRound -gt $Limits.MaxRemediationRounds) {
        throw "MAX_REMEDIATION_ROUNDS_EXCEEDED: RemediationRound $RemediationRound exceeds limit $($Limits.MaxRemediationRounds)."
    }

    $path = Get-ReviewSessionStatePath -ReviewSessionId $ReviewSessionId
    if (-not (Test-Path $path)) {
        throw "REVIEW_SESSION_MISSING: Session '$ReviewSessionId' does not exist."
    }
    $state = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($state.snapshotFingerprint -ne $SnapshotFingerprint) {
        throw "STALE_SNAPSHOT: Session '$ReviewSessionId' snapshot '$($state.snapshotFingerprint)' != '$SnapshotFingerprint'."
    }

    $elapsed = ((Get-Date).ToUniversalTime() - [datetime]::Parse($state.startedAtUtc).ToUniversalTime()).TotalSeconds
    if ($elapsed -gt $Limits.MaxDurationSeconds) {
        throw "REVIEW_DURATION_EXCEEDED: Session '$ReviewSessionId' exceeded $($Limits.MaxDurationSeconds)s."
    }

    if ([int]$state.totalInvocations -ge $Limits.MaxTotalInvocations) {
        throw "MAX_TOTAL_INVOCATIONS_EXCEEDED: Reached $($Limits.MaxTotalInvocations) invocations."
    }
    if (([int]$state.totalContextChars + $ContextChars) -gt $Limits.MaxTotalContextChars) {
        throw "MAX_CONTEXT_BUDGET_EXCEEDED: Context budget $($Limits.MaxTotalContextChars) exceeded."
    }

    $packetNames = @($state.packets.PSObject.Properties | Select-Object -ExpandProperty Name)
    if (-not ($packetNames -contains $PacketId) -and $packetNames.Count -ge $Limits.MaxPacketsPerSession) {
        throw "MAX_PACKETS_EXCEEDED: Session '$ReviewSessionId' already has $($packetNames.Count) packets (limit $($Limits.MaxPacketsPerSession))."
    }

    $existingPkt = if ($packetNames -contains $PacketId) { $state.packets.$PacketId } else { $null }
    if ($null -ne $existingPkt) {
        if ([int]$existingPkt.retries -ge $Limits.MaxRetriesPerPacket) {
            throw "MAX_PACKET_RETRIES_EXCEEDED: Packet '$PacketId' reached $($Limits.MaxRetriesPerPacket) technical retries."
        }
        $existingPkt.retries = [int]$existingPkt.retries + 1
    } else {
        $pktObj = [pscustomobject]@{
            packetId            = $PacketId
            snapshotFingerprint = $SnapshotFingerprint
            retries             = 0
            verdict             = "PENDING"
            findings            = @()
        }
        $state.packets | Add-Member -NotePropertyName $PacketId -NotePropertyValue $pktObj -Force
    }

    $state.totalInvocations = [int]$state.totalInvocations + 1
    $state.totalContextChars = [int]$state.totalContextChars + $ContextChars
    Write-AtomicJsonFile -Path $path -Content ($state | ConvertTo-Json -Depth 8)
}

function Record-PacketReviewResult {
    param(
        [string]$ReviewSessionId,
        [string]$PacketId,
        [string]$SnapshotFingerprint,
        [string]$Verdict,
        [array]$Findings = @()
    )
    $path = Get-ReviewSessionStatePath -ReviewSessionId $ReviewSessionId
    if (-not (Test-Path $path)) { throw "REVIEW_SESSION_MISSING: '$ReviewSessionId'" }
    $state = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
    $pkt = $state.packets.$PacketId
    if ($null -eq $pkt) { throw "PACKET_NOT_FOUND: '$PacketId'" }
    $pkt.snapshotFingerprint = $SnapshotFingerprint
    $pkt.verdict = $Verdict
    $pkt.findings = @($Findings)
    Write-AtomicJsonFile -Path $path -Content ($state | ConvertTo-Json -Depth 8)
}

function Get-AggregatedReviewVerdict {
    param(
        [Parameter(Mandatory = $true)][string]$ReviewSessionId,
        [Parameter(Mandatory = $true)][string[]]$RequiredPackets,
        [Parameter(Mandatory = $true)][string]$ExpectedSnapshotFingerprint,
        [array]$PacketResultsOverride = $null
    )
    $packetsMap = @{}
    if ($null -ne $PacketResultsOverride) {
        foreach ($pr in $PacketResultsOverride) {
            if ($packetsMap.ContainsKey($pr.packetId)) {
                return [pscustomobject]@{ verdict = "ERROR"; reason = "DUPLICATE_PACKET: $($pr.packetId)"; missing = @(); blocking = @() }
            }
            $packetsMap[$pr.packetId] = $pr
        }
    } else {
        $path = Get-ReviewSessionStatePath -ReviewSessionId $ReviewSessionId
        if (-not (Test-Path $path)) {
            return [pscustomobject]@{ verdict = "INCOMPLETE"; reason = "SESSION_NOT_FOUND"; missing = $RequiredPackets; blocking = @() }
        }
        $state = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($prop in $state.packets.PSObject.Properties) {
            $packetsMap[$prop.Name] = $prop.Value
        }
    }

    $missing = @()
    $stale = @()
    $errors = @()
    $blocking = @()

    foreach ($reqId in $RequiredPackets) {
        if (-not $packetsMap.ContainsKey($reqId)) {
            $missing += $reqId
            continue
        }
        $pkt = $packetsMap[$reqId]
        if ($pkt.snapshotFingerprint -ne $ExpectedSnapshotFingerprint) {
            $stale += $reqId
        }
        if ($pkt.verdict -eq "ERROR" -or $pkt.verdict -eq "PENDING") {
            $errors += $reqId
        }
        $p0p1 = @($pkt.findings | Where-Object { $_.severity -in @("P0", "P1") })
        if ($pkt.verdict -eq "BLOCKED" -or $p0p1.Count -gt 0) {
            $blocking += $reqId
        }
    }

    if ($stale.Count -gt 0) {
        return [pscustomobject]@{ verdict = "STALE"; reason = "Snapshot mismatch on: $($stale -join ',')"; missing = $missing; blocking = $blocking }
    }
    if ($missing.Count -gt 0) {
        return [pscustomobject]@{ verdict = "INCOMPLETE"; reason = "Missing required packets: $($missing -join ',')"; missing = $missing; blocking = $blocking }
    }
    if ($errors.Count -gt 0) {
        return [pscustomobject]@{ verdict = "ERROR"; reason = "Packet errors: $($errors -join ',')"; missing = @(); blocking = $blocking }
    }
    if ($blocking.Count -gt 0) {
        return [pscustomobject]@{ verdict = "BLOCKED"; reason = "Blocking P0/P1 findings in: $($blocking -join ',')"; missing = @(); blocking = $blocking }
    }

    return [pscustomobject]@{ verdict = "APPROVED"; reason = "All required packets passed on matching snapshot."; missing = @(); blocking = @() }
}
