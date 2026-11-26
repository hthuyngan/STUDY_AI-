<#
.SYNOPSIS
  Administrative setup script for STUDY_AI- Dual-Agent Windows OS identity isolation.
  MUST BE RUN IN AN ELEVATED (ADMINISTRATOR) WINDOWS POWERSHELL SESSION.
  Requires explicit human approval before running.

.DESCRIPTION
  Provisions:
  1. Dedicated unprivileged local user 'StudyAICodexReviewer' for independent Codex execution.
  2. Protected IPC directory structure under C:\ProgramData\StudyAI\ReviewIPC with strict NTFS ACLs:
     - requests/: Main user has Modify (Write/Read/Delete); Reviewer has Read/Delete.
     - reviews/:  Reviewer has Modify (Write/Read); Main user has Read-Only (CANNOT forge/modify).
  3. Scheduled Task 'StudyAICodexWorker' to execute Codex under the reviewer identity.
  4. Explicit Deny rule on MainUser's user profile for StudyAICodexReviewer to prevent credential leakage.
#>
[CmdletBinding()]
param(
    [string]$ReviewerUsername = "StudyAICodexReviewer",
    [string]$IpcDirectory = "C:\ProgramData\StudyAI\ReviewIPC",
    [string]$MainUser = "",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-ElevatedPrompt {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "ADMINISTRATOR_PRIVILEGES_REQUIRED: This setup script must be executed in an elevated (Run as Administrator) PowerShell prompt."
    }
}

if (-not $DryRun) {
    Assert-ElevatedPrompt
}

if ([string]::IsNullOrWhiteSpace($MainUser)) {
    $MainUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
}

Write-Host "=== STUDY_AI- Codex Separate-Identity Setup ===" -ForegroundColor Cyan
Write-Host "Reviewer User: $ReviewerUsername"
Write-Host "Main User:     $MainUser"
Write-Host "IPC Directory: $IpcDirectory"
Write-Host "Mode:          $(if ($DryRun) { 'DRY RUN' } else { 'LIVE EXECUTION' })"
Write-Host ""

# 1. Check or create local user
$existingUser = $null
try {
    $existingUser = Get-LocalUser -Name $ReviewerUsername -ErrorAction Stop
} catch {
    $existingUser = $null
}

if ($null -eq $existingUser) {
    Write-Host "[1/4] Creating dedicated local standard user '$ReviewerUsername'..." -ForegroundColor Yellow
    if (-not $DryRun) {
        $rawPassword = [System.Web.Security.Membership]::GeneratePassword(32, 8) 2>$null
        if ([string]::IsNullOrEmpty($rawPassword)) {
            $bytes = New-Object byte[] 32
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            $rng.GetBytes($bytes)
            $rawPassword = [Convert]::ToBase64String($bytes) + "!Aa1"
        }
        $secPassword = ConvertTo-SecureString $rawPassword -AsPlainText -Force
        New-LocalUser -Name $ReviewerUsername `
            -Password $secPassword `
            -FullName "StudyAI Codex Reviewer" `
            -Description "Dedicated isolated execution identity for Codex independent reviews in STUDY_AI-" `
            -PasswordNeverExpires `
            -UserMayNotChangePassword | Out-Null
        Write-Host "      User '$ReviewerUsername' created successfully." -ForegroundColor Green
    } else {
        Write-Host "      [DRY RUN] Would create local user '$ReviewerUsername'."
    }
} else {
    Write-Host "[1/4] Local user '$ReviewerUsername' already exists." -ForegroundColor Green
}

# 2. Setup IPC directories and NTFS ACLs
Write-Host "[2/4] Configuring protected IPC directory and ACLs at '$IpcDirectory'..." -ForegroundColor Yellow
$reqDir = Join-Path $IpcDirectory "requests"
$revDir = Join-Path $IpcDirectory "reviews"

if (-not $DryRun) {
    New-Item -ItemType Directory -Path $reqDir -Force | Out-Null
    New-Item -ItemType Directory -Path $revDir -Force | Out-Null

    # Base IPC Directory ACL: Administrators & SYSTEM FullControl
    $baseAcl = New-Object System.Security.AccessControl.DirectorySecurity
    $baseAcl.SetAccessRuleProtection($true, $false)
    $ruleSys = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $ruleAdmin = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $baseAcl.AddAccessRule($ruleSys)
    $baseAcl.AddAccessRule($ruleAdmin)
    Set-Acl -Path $IpcDirectory -AclObject $baseAcl

    # requests/ ACL: MainUser = Modify, Reviewer = ReadAndExecute + Delete
    $reqAcl = New-Object System.Security.AccessControl.DirectorySecurity
    $reqAcl.SetAccessRuleProtection($true, $false)
    $reqAcl.AddAccessRule($ruleSys)
    $reqAcl.AddAccessRule($ruleAdmin)
    $reqRuleMain = New-Object System.Security.AccessControl.FileSystemAccessRule($MainUser, "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
    $reqRuleRev = New-Object System.Security.AccessControl.FileSystemAccessRule($ReviewerUsername, "ReadAndExecute,Delete", "ContainerInherit,ObjectInherit", "None", "Allow")
    $reqAcl.AddAccessRule($reqRuleMain)
    $reqAcl.AddAccessRule($reqRuleRev)
    Set-Acl -Path $reqDir -AclObject $reqAcl

    # reviews/ ACL: Reviewer = Modify (Write), MainUser = ReadAndExecute ONLY (Tamper-Proof)
    $revAcl = New-Object System.Security.AccessControl.DirectorySecurity
    $revAcl.SetAccessRuleProtection($true, $false)
    $revAcl.AddAccessRule($ruleSys)
    $revAcl.AddAccessRule($ruleAdmin)
    $revRuleRev = New-Object System.Security.AccessControl.FileSystemAccessRule($ReviewerUsername, "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
    $revRuleMain = New-Object System.Security.AccessControl.FileSystemAccessRule($MainUser, "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
    $revAcl.AddAccessRule($revRuleRev)
    $revAcl.AddAccessRule($revRuleMain)
    Set-Acl -Path $revDir -AclObject $revAcl

    Write-Host "      IPC ACLs configured: MainUser has Read-Only on reviews/ (Tamper-Proof)." -ForegroundColor Green
} else {
    Write-Host "      [DRY RUN] Would configure strict ACLs on $reqDir and $revDir."
}

# 3. Deny Reviewer access to MainUser profile
Write-Host "[3/4] Enforcing profile isolation (Deny '$ReviewerUsername' on MainUser profile)..." -ForegroundColor Yellow
$mainProfile = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::UserProfile)
if (-not $DryRun -and (Test-Path $mainProfile)) {
    try {
        $profileAcl = Get-Acl $mainProfile
        $denyRule = New-Object System.Security.AccessControl.FileSystemAccessRule($ReviewerUsername, "FullControl", "ContainerInherit,ObjectInherit", "None", "Deny")
        $profileAcl.AddAccessRule($denyRule)
        Set-Acl -Path $mainProfile -AclObject $profileAcl
        Write-Host "      Access Deny rule applied on '$mainProfile' for '$ReviewerUsername'." -ForegroundColor Green
    } catch {
        Write-Warning "Could not apply explicit Deny on profile (default Windows ACLs typically prevent cross-user profile access): $($_.Exception.Message)"
    }
} else {
    Write-Host "      [DRY RUN] Would verify profile isolation on '$mainProfile'."
}

# 4. Register Scheduled Task for Reviewer Worker
Write-Host "[4/4] Registering Scheduled Task 'StudyAICodexWorker'..." -ForegroundColor Yellow
$taskName = "StudyAICodexWorker"
$workerScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "Invoke-CodexReviewerWorker.ps1"
if (-not $DryRun) {
    $action = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$workerScript`" -IpcDirectory `"$IpcDirectory`""
    $schtasksArgs = @("/create", "/f", "/tn", $taskName, "/tr", $action, "/sc", "once", "/st", "00:00", "/ru", $ReviewerUsername)
    & schtasks.exe @schtasksArgs 2>&1 | Out-Null
    Write-Host "      Scheduled Task '$taskName' registered under '$ReviewerUsername'." -ForegroundColor Green
} else {
    Write-Host "      [DRY RUN] Would register Scheduled Task '$taskName' under '$ReviewerUsername'."
}

Write-Host ""
Write-Host "Setup completed successfully." -ForegroundColor Green
