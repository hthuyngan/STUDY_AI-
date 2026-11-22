# scripts/generate_endpoint_inventory.ps1
# Generates endpoint_inventory.md directly from ASP.NET Core ActionDescriptors (236 endpoints)
[CmdletBinding()]
param(
    [string]$OutputPath = "docs/audit/endpoint_inventory.md"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

$env:ASPNETCORE_ENVIRONMENT = "Development"
if (-not $env:JWT_SECRET_KEY) {
    $env:JWT_SECRET_KEY = "StudyAI_Development_Jwt_Secret_Key_At_Least_32_Characters!"
}

$targetPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
} else {
    Join-Path $repoRoot $OutputPath
}

Write-Host "==> Generating endpoint inventory via ASP.NET Core ActionDescriptors..." -ForegroundColor Cyan
Write-Host "    Target: $targetPath" -ForegroundColor DarkGray

# Stop running StudyAI.Api if locked
Get-Process -Name "StudyAI.Api" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

dotnet run --project backend/src/StudyAI.Api/StudyAI.Api.csproj --no-launch-profile -- --export-endpoint-inventory "$targetPath"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate endpoint inventory. Process exited with code $LASTEXITCODE."
    exit $LASTEXITCODE
}

Write-Host "==> SUCCESS: Inventory generated at $targetPath" -ForegroundColor Green
