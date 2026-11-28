<#
.SYNOPSIS
  Unified Single Startup Workflow for STUDY_AI- (AI TUTOR - Toán 12).
  Supports Development, QA (isolated StudyAIDb_Clean_{GUID}), and Demo modes.
  Never auto-migrates or auto-seeds StudyAIDb.
#>
[CmdletBinding()]
param(
    [ValidateSet("Development", "QA", "Demo")]
    [string]$Mode = "QA",
    [int]$BackendPort = 8012,
    [int]$FrontendPort = 5175,
    [string]$SqlServer = ".\SQLEXPRESS"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$branch = (& git -C $repoRoot rev-parse --abbrev-ref HEAD 2>$null).Trim()
$sha = (& git -C $repoRoot rev-parse --short HEAD 2>$null).Trim()

Write-Output "=== STUDY_AI- SINGLE STARTUP WORKFLOW ==="
Write-Output "Workspace : $repoRoot"
Write-Output "Branch/SHA: $branch ($sha)"
Write-Output "Mode      : $Mode"

if ($Mode -eq "Development") {
    $envFile = Join-Path $repoRoot "backend\.env"
    if (-not (Test-Path $envFile)) {
        throw "MISSING_CONFIG: backend\.env is required for Development mode. Copy backend\.env.example and configure ConnectionStrings__DefaultConnection."
    }
    $aspEnv = "Development"
    $connStr = ""
    Write-Output "Database  : Persistent StudyAIDb (no auto-migration / no auto-seed)"
} else {
    $guidN = [guid]::NewGuid().ToString("N")
    $dbName = "StudyAIDb_Clean_$guidN"
    $aspEnv = "Testing"
    $connStr = "Server=$SqlServer;Database=$dbName;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
    Write-Output "Database  : Isolated $dbName (auto-migrate + 4-role test bootstrap)"
}

$backendUrl = "http://127.0.0.1:$BackendPort"
$frontendUrl = "http://127.0.0.1:$FrontendPort"

$env:ASPNETCORE_ENVIRONMENT = $aspEnv
if (-not [string]::IsNullOrWhiteSpace($connStr)) {
    $env:ConnectionStrings__DefaultConnection = $connStr
}

Write-Output "Starting Backend on $backendUrl ..."
$backendProc = Start-Process -FilePath "dotnet" -ArgumentList @("run", "--project", (Join-Path $repoRoot "backend\src\StudyAI.Api"), "--urls", $backendUrl, "--no-launch-profile") -WorkingDirectory $repoRoot -PassThru

$env:VITE_BACKEND_URL = $backendUrl
$env:VITE_API_BASE_URL = $backendUrl
Write-Output "Starting Frontend on $frontendUrl ..."
$frontendProc = Start-Process -FilePath "bun" -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "$FrontendPort", "--strictPort") -WorkingDirectory (Join-Path $repoRoot "frontend") -PassThru

Write-Output "Backend PID : $($backendProc.Id) | URL: $backendUrl | Health: $backendUrl/health"
Write-Output "Frontend PID: $($frontendProc.Id) | URL: $frontendUrl"
