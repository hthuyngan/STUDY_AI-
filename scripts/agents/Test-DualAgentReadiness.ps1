<#
.SYNOPSIS
  Read-only readiness report for the STUDY_AI- Trusted Local Dual-Agent workflow.
  Verifies local environment, Codex CLI availability, worktree cleanliness, and configuration.
#>
[CmdletBinding()]
param([string]$RepoPath = (Get-Location).Path)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptRoot 'agent-guard.ps1')

$config = Get-AgentConfig
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$gitState = Get-GitState -RepoPath $RepoPath

$codexAvailable = $false
$resolvedCodex = $null
try {
    $resolvedCodex = Resolve-CodexExecutable
    $codexAvailable = ($null -ne $resolvedCodex)
} catch { $codexAvailable = $false }

$codexLogin = "unknown"
if ($codexAvailable -and $null -ne $resolvedCodex) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $loginOut = (& $resolvedCodex.ExePath $resolvedCodex.PrefixArgs "login" "status" 2>&1) -join " "
        if ($loginOut -match '(?i)Logged in') { $codexLogin = "Logged in using ChatGPT" }
        else { $codexLogin = $loginOut.Trim() }
    } catch {
        $codexLogin = "error checking login: " + $_.Exception.Message
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

$blockers = New-Object System.Collections.Generic.List[string]
if (-not $codexAvailable) { $blockers.Add('Codex CLI executable could not be resolved in this local session.') }
if ($gitState.IsDirty) { $blockers.Add('Git worktree has uncommitted changes. Commit or clean worktree before review.') }
if (-not [bool]$config.policies.automatedCodexEnabled) { $blockers.Add('automatedCodexEnabled is set to false in agent-config.json.') }

$isReady = ($codexAvailable -and [bool]$config.policies.automatedCodexEnabled -and -not $gitState.IsDirty)
$status = if ($isReady) { 'READY' } else { 'BLOCKED' }

$report = [ordered]@{
    project                      = 'STUDY_AI-'
    workflow_model               = 'trusted-local-developer'
    local_user                   = $identity.Name
    local_sid                    = $identity.User.Value
    repo_branch                  = $gitState.Branch
    repo_head_sha                = $gitState.HeadSha
    worktree_dirty               = $gitState.IsDirty
    codex_cli_detected           = $codexAvailable
    codex_auth_status            = $codexLogin
    automated_codex_enabled      = [bool]$config.policies.automatedCodexEnabled
    one_prompt_automation_status = $status
    security_boundary            = 'Trusted local developer workflow (same Windows user; official read-only sandbox, minimal allowlist env, immutable git snapshot, JobObject process containment).'
    blockers                     = @($blockers.ToArray())
    next_action                  = if ($isReady) { 'Ready for single-prompt Antigravity implementation + automated Codex review loop.' } else { 'Resolve listed blockers before starting automated workflow.' }
}
$report | ConvertTo-Json -Depth 5
