<#
.SYNOPSIS
  Sets a new password for the local MySQL root account when the old one is lost.

.DESCRIPTION
  MySQL keeps only a hash of the root password, so it cannot be recovered, only replaced.
  This follows the official procedure ("init-file"), which does not touch your databases:

    1. stop the MySQL Windows service
    2. start mysqld once, on 127.0.0.1 only, with a one-line file that sets the new password
    3. shut that copy down cleanly and delete the file
    4. start the Windows service again and check that the new password works

  The new password is typed here (hidden) and never leaves this machine or goes into a repo file.
  MySQL is unavailable to other programs for about 30 seconds.

  Run in a PowerShell opened with "Run as administrator":
      powershell -ExecutionPolicy Bypass -File .\scripts\reset-mysql-root.ps1

  -DryRun shows what it found and what it would do, changes nothing and needs no admin rights.
  -ServiceName defaults to MySQL80.
#>
param(
    [string]$ServiceName = "MySQL80",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'"
if (-not $service) { throw "No Windows service called $ServiceName. Pass -ServiceName <name> (see services.msc)." }

# The service's command line looks like:  "C:\...\mysqld.exe" --defaults-file="C:\...\my.ini" MySQL80
$exeMatch = [regex]::Match($service.PathName, '^"?(?<exe>[^"]*mysqld\.exe)"?')
$iniMatch = [regex]::Match($service.PathName, '--defaults-file=(?:"(?<quoted>[^"]+)"|(?<bare>\S+))')
if (-not $exeMatch.Success -or -not $iniMatch.Success) {
    throw "Could not read mysqld.exe and my.ini from the service command line: $($service.PathName)"
}
$mysqld = $exeMatch.Groups["exe"].Value
$ini = if ($iniMatch.Groups["quoted"].Success) { $iniMatch.Groups["quoted"].Value } else { $iniMatch.Groups["bare"].Value }
$mysqladmin = Join-Path (Split-Path $mysqld) "mysqladmin.exe"
$mysqlCli = Join-Path (Split-Path $mysqld) "mysql.exe"
foreach ($file in @($mysqld, $ini, $mysqladmin, $mysqlCli)) {
    if (-not (Test-Path $file)) { throw "Expected file not found: $file" }
}
$port = 3306
$portLine = Select-String -Path $ini -Pattern '^\s*port\s*=\s*(\d+)' | Select-Object -First 1
if ($portLine) { $port = [int]$portLine.Matches[0].Groups[1].Value }

Write-Host "Service     : $ServiceName ($($service.State), runs as $($service.StartName))"
Write-Host "mysqld.exe  : $mysqld"
Write-Host "Config file : $ini"
Write-Host "Port        : $port"

if ($DryRun) {
    Write-Host "`nDry run: nothing was changed. A real run would stop the service, set the root password, and start it again."
    return
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Run this in a PowerShell opened with 'Run as administrator'." }

$first = Read-Host "New MySQL root password (12+ characters)" -AsSecureString
$second = Read-Host "Type it again" -AsSecureString
$pw = [System.Net.NetworkCredential]::new("", $first).Password
if ($pw -ne [System.Net.NetworkCredential]::new("", $second).Password) { throw "The two passwords differ. Nothing was changed." }
if ($pw -notmatch '^[A-Za-z0-9!@#%^*_+=.-]{12,100}$') {
    throw "Use 12-100 characters from letters, digits and ! @ # % ^ * _ + = . - (no spaces, quotes, backslashes or `$). Nothing was changed."
}

$initFile = Join-Path $env:TEMP ("mysql-root-reset-" + [Guid]::NewGuid().ToString("N") + ".sql")
$temporary = $null
$serviceWasRunning = $service.State -eq "Running"

try {
    # An init file that only this account can read, deleted in the finally block below.
    Set-Content -Path $initFile -Value "ALTER USER 'root'@'localhost' IDENTIFIED BY '$pw';" -Encoding ASCII
    & icacls $initFile /inheritance:r /grant:r "$($env:USERNAME):(R,D)" | Out-Null

    if ($serviceWasRunning) {
        Write-Host "`nStopping $ServiceName..."
        Stop-Service -Name $ServiceName -Force
        (Get-Service -Name $ServiceName).WaitForStatus("Stopped", [TimeSpan]::FromSeconds(60))
    }

    Write-Host "Starting mysqld once with the reset file (127.0.0.1 only)..."
    $initArg = $initFile -replace '\\', '/'
    $temporary = Start-Process -FilePath $mysqld -PassThru -WindowStyle Hidden -ArgumentList @(
        "--defaults-file=`"$ini`"", "--init-file=`"$initArg`"", "--bind-address=127.0.0.1", "--console")

    $deadline = (Get-Date).AddSeconds(90)
    while (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) {
        if ($temporary.HasExited) { throw "mysqld exited early (code $($temporary.ExitCode)). The service will be restarted." }
        if ((Get-Date) -gt $deadline) { throw "mysqld did not start within 90 seconds. The service will be restarted." }
        Start-Sleep -Milliseconds 500
    }

    # The init file has run by the time the server accepts connections. Check, then shut down cleanly.
    $env:MYSQL_PWD = $pw
    & $mysqlCli -h 127.0.0.1 -P $port -u root -e "SELECT 'new root password accepted' AS result;"
    if ($LASTEXITCODE -ne 0) { throw "The new password was not accepted by the temporary server." }
    Write-Host "Shutting the temporary server down cleanly..."
    & $mysqladmin -h 127.0.0.1 -P $port -u root shutdown
    $temporary.WaitForExit(60000) | Out-Null
}
finally {
    Remove-Item -Path $initFile -Force -ErrorAction SilentlyContinue
    if ($temporary -and -not $temporary.HasExited) {
        Write-Warning "The temporary mysqld is still running; asking it to stop cleanly."
        & $mysqladmin -h 127.0.0.1 -P $port -u root shutdown 2>$null
        $temporary.WaitForExit(60000) | Out-Null
    }
    if ($serviceWasRunning) {
        Write-Host "Starting $ServiceName again..."
        Start-Service -Name $ServiceName
    }
}

# Final check against the real service with the new password.
$env:MYSQL_PWD = $pw
$deadline = (Get-Date).AddSeconds(60)
do {
    & $mysqlCli -h 127.0.0.1 -P $port -u root -e "SELECT VERSION() AS mysql_version;" 2>$null
    $ok = ($LASTEXITCODE -eq 0)
    if (-not $ok) { Start-Sleep -Seconds 2 }
} until ($ok -or (Get-Date) -gt $deadline)
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue

if ($ok) {
    Write-Host "`nDone. The $ServiceName service is running and the new root password works."
    Write-Host "Next: run scripts\setup-dev.ps1 and give it this new root password when MySQL asks."
}
else {
    throw "The service is running but the new root password was not accepted. Check the MySQL error log in the data directory."
}
