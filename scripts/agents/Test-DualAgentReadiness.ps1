<#
.SYNOPSIS
  Read-only readiness report for the local Dual-Agent bridge.
  This does not grant permissions, create users, sign in, run Codex, or enable automation.
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
$reviewerName = 'StudyAICodexReviewer'
$accountFound = $false
try {
    $account = Get-LocalUser -Name $reviewerName -ErrorAction Stop
    $accountFound = ($null -ne $account)
} catch {
    $accountFound = $false
}
$codexAvailable = $false
try {
    $null = Resolve-CodexExecutable
    $codexAvailable = $true
} catch { $codexAvailable = $false }
$blockers = New-Object System.Collections.Generic.List[string]
if (-not $accountFound) { $blockers.Add('Dedicated reviewer Windows account not detected; admin approval needed for provisioning.') }
$blockers.Add('No separately authenticated reviewer process launcher is implemented; existing CreateProcessW inherits the current SID.')
$blockers.Add('Credential ACL isolation, protected IPC, and independent reviewer artifact provenance have not been verified.')
$blockers.Add('Codex sign-in and quota are not verified by this read-only report; last live review reported CODEX_QUOTA_EXCEEDED.')
if (-not $codexAvailable) { $blockers.Add('Codex CLI executable could not be resolved in this local session.') }
if ($config.policies.automatedCodexEnabled) { $blockers.Add('UNSAFE_CONFIGURATION: automation flag is enabled without an enforceable reviewer identity boundary.') }
$report = [ordered]@{
    project = 'STUDY_AI-'
    local_user = $identity.Name
    local_sid = $identity.User.Value
    repo_branch = $gitState.Branch
    repo_head_sha = $gitState.HeadSha
    worktree_dirty = $gitState.IsDirty
    reviewer_account_present = $accountFound
    codex_cli_detected = $codexAvailable
    automated_codex_enabled = [bool]$config.policies.automatedCodexEnabled
    reviewer_identity_launcher_verified = $false
    one_prompt_automation_status = 'BLOCKED'
    blockers = @($blockers.ToArray())
    next_action = 'Implement independently tested Windows separate-identity launcher, then verify ACL, auth, quota, and full review loop before enabling automation.'
}
$report | ConvertTo-Json -Depth 5
