<#
.SYNOPSIS
  Stops what run-all.ps1 started: whatever is listening on the API port (5090) and the frontend port (5180).
  It does not touch MySQL.
#>
foreach ($entry in @(@{ Port = 5090; Name = "API" }, @{ Port = 5180; Name = "frontend" })) {
    $listeners = Get-NetTCPConnection -LocalPort $entry.Port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) {
        Write-Host "$($entry.Name): nothing was listening on port $($entry.Port)."
        continue
    }
    $listeners | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Write-Host "$($entry.Name): stopped (port $($entry.Port))."
}
