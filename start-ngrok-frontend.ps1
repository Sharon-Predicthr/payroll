# Script to start ngrok for frontend (port 3000)
# This will use a different approach to avoid conflicts

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting ngrok for Frontend (port 3000)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is accessible
Write-Host "Checking if frontend is running on port 3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "✓ Frontend is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend is NOT running on port 3000!" -ForegroundColor Red
    Write-Host "  Please start the frontend first:" -ForegroundColor Yellow
    Write-Host "    cd frontend" -ForegroundColor White -BackgroundColor DarkGray
    Write-Host "    npm run dev" -ForegroundColor White -BackgroundColor DarkGray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Starting ngrok for frontend..." -ForegroundColor Yellow
Write-Host "  Command: ngrok http 3000" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "  - This will open ngrok in a new window" -ForegroundColor Gray
Write-Host "  - Copy the 'Forwarding' URL (e.g., https://xyz123.ngrok-free.dev)" -ForegroundColor Gray
Write-Host "  - That URL is what you share with users!" -ForegroundColor Gray
Write-Host ""

# Start ngrok in a new window
Start-Process -FilePath "ngrok" -ArgumentList "http", "3000" -NoNewWindow

Write-Host "ngrok started! Check the ngrok window for the URL." -ForegroundColor Green
Write-Host ""

