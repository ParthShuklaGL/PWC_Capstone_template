<#
.SYNOPSIS
  Stops the Java CRM API started by run.ps1 (only that process, found by its saved process id).
#>
$pidFile = Join-Path $PSScriptRoot ".run\api.pid"
if (-not (Test-Path $pidFile)) { Write-Host "Nothing to stop (no .run\api.pid)."; return }
$apiPid = [int](Get-Content $pidFile)
$proc = Get-Process -Id $apiPid -ErrorAction SilentlyContinue
if ($proc -and $proc.ProcessName -like "java*") {
    Stop-Process -Id $apiPid -Force
    Write-Host "Stopped the Java CRM API (process $apiPid)."
} else {
    Write-Host "Process $apiPid is not running."
}
Remove-Item $pidFile -Force
