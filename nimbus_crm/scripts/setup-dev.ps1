#Requires -Version 5.1
<#
.SYNOPSIS
  One-time local setup for nimbus_crm: creates the MySQL database and the crm_app user,
  then stores the connection string and a random JWT signing key in user-secrets.

.DESCRIPTION
  You are asked for two passwords in this window:
    1. the password you want for the crm_app MySQL user (typed hidden)
    2. your MySQL root password (MySQL's own prompt)
  Nothing is written to a file in the repo. The two secrets go to the user-secrets store
  (%APPDATA%\Microsoft\UserSecrets), which is outside the repo.

  Run it from anywhere:   powershell -ExecutionPolicy Bypass -File .\scripts\setup-dev.ps1
#>

$ErrorActionPreference = "Stop"

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysql)) {
    throw "mysql.exe not found at $mysql. Edit the `$mysql line at the top of this script."
}

$apiProject = Join-Path (Split-Path $PSScriptRoot -Parent) "src\Api"
if (-not (Test-Path $apiProject)) {
    throw "Cannot find $apiProject. Run this script from inside the nimbus_crm folder."
}

$secure = Read-Host "Choose a password for the crm_app MySQL user (12+ characters)" -AsSecureString
$pw = [System.Net.NetworkCredential]::new("", $secure).Password
if ($pw -notmatch '^[A-Za-z0-9!@#%^*_+=.-]{12,100}$') {
    throw "Use 12-100 characters from letters, digits and ! @ # % ^ * _ + = . - (no spaces, quotes, semicolons or `$)."
}

Write-Host "`nCreating database nimbus_crm and user crm_app. MySQL will now ask for the ROOT password..."
$sql = "CREATE DATABASE IF NOT EXISTS nimbus_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; " +
       "CREATE USER IF NOT EXISTS 'crm_app'@'localhost' IDENTIFIED BY '$pw'; " +
       "ALTER USER 'crm_app'@'localhost' IDENTIFIED BY '$pw'; " +
       "GRANT ALL PRIVILEGES ON nimbus_crm.* TO 'crm_app'@'localhost';"
& $mysql -u root -p -e $sql
if ($LASTEXITCODE -ne 0) { throw "MySQL did not accept the commands (exit code $LASTEXITCODE). Nothing was stored." }

Write-Host "`nStoring secrets in user-secrets..."
dotnet user-secrets set "ConnectionStrings:Crm" "Server=localhost;Port=3306;Database=nimbus_crm;User=crm_app;Password=$pw" --project $apiProject | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Could not store the connection string." }

$bytes = [byte[]]::new(48)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
dotnet user-secrets set "Jwt:SigningKey" ([Convert]::ToBase64String($bytes)) --project $apiProject | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Could not store the signing key." }

Write-Host "`nDone. Secrets now set (names only):"
dotnet user-secrets list --project $apiProject | ForEach-Object { ($_ -split ' = ')[0] }
Write-Host "`nNext: tell Claude 'ready', or run:  dotnet ef database update -p src/Infrastructure -s src/Api"
