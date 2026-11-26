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
$reviewerSid = ""
try {
    $account = Get-LocalUser -Name $reviewerName -ErrorAction Stop
    $accountFound = ($null -ne $account)
    if ($accountFound) { $reviewerSid = $account.SID.Value }
} catch {
    $accountFound = $false
}
$ipcDir = "C:\ProgramData\StudyAI\ReviewIPC"
$ipcConfigured = (Test-Path (Join-Path $ipcDir "requests")) -and (Test-Path (Join-Path $ipcDir "reviews"))
$taskRegistered = $false
try {
    $null = & schtasks.exe /query /tn "StudyAICodexWorker" 2>&1
    $taskRegistered = ($LASTEXITCODE -eq 0)
} catch { $taskRegistered = $false }

$launcherVerified = Test-CodexReviewerIdentityAvailable -ReviewerName $reviewerName -IpcDirectory $ipcDir -and $taskRegistered
$codexAvailable = $false
try {
    $null = Resolve-CodexExecutable
    $codexAvailable = $true
} catch { $codexAvailable = $false }
$blockers = New-Object System.Collections.Generic.List[string]
if (-not $accountFound) { $blockers.Add('Dedicated reviewer Windows account not detected; run elevated setup-reviewer-identity.ps1 after user approval.') }
if (-not $ipcConfigured) { $blockers.Add("Protected IPC directory '$ipcDir' not configured.") }
if (-not $taskRegistered) { $blockers.Add("Scheduled task 'StudyAICodexWorker' is not registered under reviewer identity.") }
if (-not $launcherVerified) { $blockers.Add('Reviewer OS identity launcher not fully verified; existing CreateProcessW inherits current SID.') }
$blockers.Add('Codex sign-in and quota for reviewer profile must be verified; last live review reported CODEX_QUOTA_EXCEEDED.')
if (-not $codexAvailable) { $blockers.Add('Codex CLI executable could not be resolved in this local session.') }
if ($config.policies.automatedCodexEnabled -and -not $launcherVerified) {
    $blockers.Add('UNSAFE_CONFIGURATION: automation flag is enabled without an enforceable reviewer identity boundary.')
}

$status = if ($launcherVerified -and $codexAvailable) { 'READY_FOR_SEPARATE_IDENTITY' } else { 'BLOCKED' }
$report = [ordered]@{
    project = 'STUDY_AI-'
    local_user = $identity.Name
    local_sid = $identity.User.Value
    repo_branch = $gitState.Branch
    repo_head_sha = $gitState.HeadSha
    worktree_dirty = $gitState.IsDirty
    reviewer_account_present = $accountFound
    reviewer_sid = $reviewerSid
    ipc_directory_configured = $ipcConfigured
    scheduled_task_registered = $taskRegistered
    codex_cli_detected = $codexAvailable
    automated_codex_enabled = [bool]$config.policies.automatedCodexEnabled
    reviewer_identity_launcher_verified = $launcherVerified
    one_prompt_automation_status = $status
    blockers = @($blockers.ToArray())
    remediation_command = "In an elevated (Administrator) PowerShell prompt: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\agents\setup-reviewer-identity.ps1"
    next_action = if ($status -eq 'BLOCKED') { 'User review and approval required before running elevated setup-reviewer-identity.ps1.' } else { 'Reviewer identity is ready; verify quota before running full automated cycle.' }
}
$report | ConvertTo-Json -Depth 5
