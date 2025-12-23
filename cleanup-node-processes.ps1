# Script to clean up old Node.js processes
# This will stop Node.js processes that might be holding ports

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cleaning up Node.js processes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get all Node.js processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  PID: $($_.Id) | Started: $($_.StartTime) | Path: $($_.Path)" -ForegroundColor Gray
    }
    Write-Host ""
    
    $response = Read-Host "Stop all Node.js processes? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
        $nodeProcesses | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  ✓ Stopped PID $($_.Id)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to stop PID $($_.Id): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Write-Host ""
        Write-Host "✓ Cleanup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now start the backend:" -ForegroundColor Cyan
        Write-Host "  cd backend" -ForegroundColor White -BackgroundColor DarkGray
        Write-Host "  npm run start:dev" -ForegroundColor White -BackgroundColor DarkGray
    } else {
        Write-Host "Cancelled." -ForegroundColor Yellow
    }
} else {
    Write-Host "No Node.js processes found." -ForegroundColor Green
}

Write-Host ""

