<#
.SYNOPSIS
  Builds (if needed) and starts the Java CRM API on http://localhost:5091 in the dev profile.

.DESCRIPTION
  Needs a running MySQL 8 and two secrets in the environment (names only are ever printed):
    DB_PASSWORD      password of the MySQL account (DB_USER, default "crm")
    JWT_SIGNING_KEY  at least 32 random characters. If it is not set, a throwaway one is generated for this run
                     (fine for development; every restart then signs everyone out).
  Optional: DB_URL (default jdbc:mysql://127.0.0.1:3306/crm...), DB_USER, SERVER_PORT (5091),
  LOGIN_RATE_LIMIT_PER_MINUTE (default 10; use -RaiseLoginLimit for the proof scripts).

  JDK 21 and Maven are taken from PATH, or from C:\Users\<you>\tools if they are installed there.
  Logs go to .run\api.out.log and .run\api.err.log. Stop with .\stop.ps1.
#>
param(
    [switch]$RaiseLoginLimit,
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$port = if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "5091" }

# JDK and Maven: PATH first, then the per-user tools folder.
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    $jdk = Get-ChildItem (Join-Path $env:USERPROFILE "tools") -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName; $env:PATH = "$($jdk.FullName)\bin;$env:PATH" }
}
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    $mvn = Get-ChildItem (Join-Path $env:USERPROFILE "tools") -Directory -Filter "apache-maven*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($mvn) { $env:PATH = "$($mvn.FullName)\bin;$env:PATH" }
}
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw "JDK 21 not found. Put java on PATH or install it under $env:USERPROFILE\tools." }

if (-not $env:DB_PASSWORD) { throw "Set DB_PASSWORD (the MySQL account password) in this shell first." }
if (-not $env:JWT_SIGNING_KEY) {
    $env:JWT_SIGNING_KEY = (1..4 | ForEach-Object { [guid]::NewGuid().ToString("N") }) -join ""
    Write-Host "JWT_SIGNING_KEY was not set: using a throwaway key for this run."
}
if ($RaiseLoginLimit) { $env:LOGIN_RATE_LIMIT_PER_MINUTE = "1000" }

if (Get-NetTCPConnection -LocalPort ([int]$port) -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $port is already in use. Run .\stop.ps1, or set SERVER_PORT."
}

$jar = Join-Path $here "target\crm.jar"
if (-not (Test-Path $jar)) {
    Write-Host "Building..."
    Push-Location $here
    try { mvn -q -B -DskipTests package; if ($LASTEXITCODE -ne 0) { throw "Build failed." } } finally { Pop-Location }
}

$env:SPRING_PROFILES_ACTIVE = "dev"
if ($Foreground) { & java -jar $jar; return }

$runDir = Join-Path $here ".run"
New-Item -ItemType Directory -Force $runDir | Out-Null
$p = Start-Process java -ArgumentList "-jar", "`"$jar`"" -WorkingDirectory $here -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $runDir "api.out.log") -RedirectStandardError (Join-Path $runDir "api.err.log") -PassThru
$p.Id | Set-Content (Join-Path $runDir "api.pid")

Write-Host "Waiting for http://localhost:$port/health ..."
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        if ((Invoke-WebRequest "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) {
            Write-Host "Java CRM API is up: http://localhost:$port  (dev accounts: admin and demo, see README)"
            return
        }
    } catch { }
    if ($p.HasExited) { throw "The API exited. See $runDir\api.err.log and api.out.log." }
}
throw "The API did not answer in 60 seconds. See $runDir\api.out.log."
