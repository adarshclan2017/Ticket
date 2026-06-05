$ErrorActionPreference = "Continue"

Write-Host "=== Test loadRaisedSupportTickets (Recent Records API) ==="
Write-Host "--- With InternalUserID=7 (user '2') ---"
try {
    $r = Invoke-WebRequest -Uri 'http://148.72.215.143:155/unniService.asmx/loadRaisedSupportTickets?InternalUserID=7' -UseBasicParsing -TimeoutSec 15
    Write-Host "Status: $($r.StatusCode)"
    Write-Host $r.Content.Substring(0, [Math]::Min(1000, $r.Content.Length))
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "--- With InternalUserID=4 (default fallback) ---"
try {
    $r2 = Invoke-WebRequest -Uri 'http://148.72.215.143:155/unniService.asmx/loadRaisedSupportTickets?InternalUserID=4' -UseBasicParsing -TimeoutSec 15
    Write-Host "Status: $($r2.StatusCode)"
    Write-Host $r2.Content.Substring(0, [Math]::Min(1000, $r2.Content.Length))
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
