<#
.SYNOPSIS
  Starts the whole CRM for development: the .NET API (http://localhost:5090) and the React frontend
  (http://localhost:5180), each in its own window.

.DESCRIPTION
  Checks the prerequisites first and says what is missing:
    - the MySQL Windows service is running
    - the API's secrets are set (connection string and JWT signing key), by user-secrets or environment variables
    - the frontend's packages are installed (it runs `npm install` if not)
    - ports 5090 and 5180 are free
  Then starts both, waits until they answer, and prints the addresses and the development accounts.

  Stop them with .\stop-all.ps1 (or close the two windows).

.PARAMETER Hidden
  Run without windows, writing the logs to reference-solution\.run\ (for scripts and tests).

.PARAMETER RaiseLoginLimit
  Raise the API's sign-in rate limit to 1000 a minute. Needed for `npm run e2e`, which signs in about 30
  times; leave it off for normal use.

.PARAMETER NoBrowser
  Do not open the app in your browser when it is ready.
#>
param(
    [switch]$Hidden,
    [switch]$RaiseLoginLimit,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$apiFolder = Join-Path (Split-Path $PSScriptRoot -Parent) "nimbus_crm"
$uiFolder = Join-Path $PSScriptRoot "frontend"
$apiUrl = "http://localhost:5090"
$uiUrl = "http://localhost:5180"
$problems = @()

foreach ($folder in @($apiFolder, $uiFolder)) {
    if (-not (Test-Path $folder)) { throw "Cannot find $folder." }
}

# 1. MySQL
#    A warning, not a blocker: your connection string may point at a MySQL that is not this Windows service.
$mysql = Get-Service -Name MySQL80 -ErrorAction SilentlyContinue
if (-not $mysql) { Write-Host "Note: no MySQL80 Windows service found. Fine if your database runs elsewhere." -ForegroundColor Yellow }
elseif ($mysql.Status -ne "Running") { Write-Host "Note: the MySQL80 service is $($mysql.Status). If your database is that one, start it (Start-Service MySQL80, as Administrator)." -ForegroundColor Yellow }

# 2. Secrets: names only, never values
$haveEnv = $env:ConnectionStrings__Crm -and $env:Jwt__SigningKey
if (-not $haveEnv) {
    $names = dotnet user-secrets list --project (Join-Path $apiFolder "src\Api") 2>$null | ForEach-Object { ($_ -split " = ")[0] }
    foreach ($needed in @("ConnectionStrings:Crm", "Jwt:SigningKey")) {
        if ($names -notcontains $needed) { $problems += "Secret '$needed' is not set. Run nimbus_crm\scripts\setup-dev.ps1 first." }
    }
}

# 3. Ports
foreach ($port in @(5090, 5180)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        $problems += "Port $port is already in use. Run .\stop-all.ps1, or stop whatever is using it."
    }
}

if ($problems.Count -gt 0) {
    Write-Host "`nCannot start yet:" -ForegroundColor Yellow
    $problems | ForEach-Object { Write-Host "  - $_" }
    throw "Fix the items above and run again."
}

# 4. Frontend packages
if (-not (Test-Path (Join-Path $uiFolder "node_modules"))) {
    Write-Host "Installing the frontend's packages (first run only)..."
    Push-Location $uiFolder
    try { npm install --no-audit --no-fund | Out-Null } finally { Pop-Location }
}

# 5. Start both
$apiArgs = @("run", "--project", "src/Api", "--launch-profile", "http")
$limitPrefix = if ($RaiseLoginLimit) { "`$env:Auth__LoginRateLimitPerMinute='1000'; " } else { "" }

if ($Hidden) {
    $logs = Join-Path $PSScriptRoot ".run"
    New-Item -ItemType Directory -Force $logs | Out-Null
    if ($RaiseLoginLimit) { $env:Auth__LoginRateLimitPerMinute = "1000" }
    Start-Process dotnet -ArgumentList $apiArgs -WorkingDirectory $apiFolder -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logs "api.log") -RedirectStandardError (Join-Path $logs "api.err.log") | Out-Null
    Start-Process npm.cmd -ArgumentList @("run", "dev") -WorkingDirectory $uiFolder -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logs "ui.log") -RedirectStandardError (Join-Path $logs "ui.err.log") | Out-Null
    Write-Host "Started without windows. Logs: $logs"
}
else {
    Start-Process powershell -ArgumentList @("-NoExit", "-Command",
        "`$Host.UI.RawUI.WindowTitle='Nimbus CRM API'; Set-Location '$apiFolder'; $limitPrefix dotnet run --project src/Api --launch-profile http")
    Start-Process powershell -ArgumentList @("-NoExit", "-Command",
        "`$Host.UI.RawUI.WindowTitle='Nimbus CRM frontend'; Set-Location '$uiFolder'; npm run dev")
}

# 6. Wait until both answer
function Wait-Until($url, $name) {
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
        try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return }
        catch { if ($_.Exception.Response) { return } }   # any HTTP answer (even 401) means it is up
        Start-Sleep -Seconds 1
    }
    throw "$name did not answer at $url within 2 minutes. Check its window (or the logs in .run\ with -Hidden)."
}
Wait-Until "$apiUrl/health" "The API"
Wait-Until "$uiUrl/" "The frontend"

Write-Host "`nThe whole CRM is running." -ForegroundColor Green
Write-Host "  App         $uiUrl"
Write-Host "  API         $apiUrl        (API docs: $apiUrl/scalar)"
Write-Host "  Sign in as  admin / Admin#Dev-2026!   (ADMIN)    or    demo / User#Dev-2026!   (USER)"
Write-Host "  Stop        .\stop-all.ps1"
if (-not $NoBrowser -and -not $Hidden) { Start-Process $uiUrl }
