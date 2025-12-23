# Script to start both ngrok tunnels properly
# This script will guide you to start ngrok for both frontend and backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PayLens - ngrok Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if frontend is running
Write-Host "Step 1: Checking if frontend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "✓ Frontend is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend is NOT running on port 3000!" -ForegroundColor Red
    Write-Host "  Please start the frontend first:" -ForegroundColor Yellow
    Write-Host "    cd frontend" -ForegroundColor White -BackgroundColor DarkGray
    Write-Host "    npm run dev" -ForegroundColor White -BackgroundColor DarkGray
    Write-Host ""
}

# Check if backend is running
Write-Host ""
Write-Host "Step 2: Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "✓ Backend is running on port 4000" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backend might not be running (this is OK if it's an API)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting ngrok tunnels" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: ngrok free plan allows ONE tunnel at a time!" -ForegroundColor Yellow
Write-Host ""
Write-Host "You have two options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Use ngrok for BACKEND only (recommended for testing)" -ForegroundColor Green
Write-Host "  - Backend: ngrok http 4000" -ForegroundColor White -BackgroundColor DarkGray
Write-Host "  - Frontend: Users access via localhost:3000 (same network/VPN)" -ForegroundColor Gray
Write-Host "  - Frontend will call backend through ngrok automatically" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Use ngrok for FRONTEND (for remote users)" -ForegroundColor Green
Write-Host "  - Frontend: ngrok http 3000" -ForegroundColor White -BackgroundColor DarkGray
Write-Host "  - Backend: Must be accessible (localhost or ngrok)" -ForegroundColor Gray
Write-Host "  - Make sure .env.local points to backend ngrok URL" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Which option? (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Starting ngrok for BACKEND (port 4000)..." -ForegroundColor Yellow
    Write-Host "This will open in a new window." -ForegroundColor Gray
    Start-Process -FilePath "ngrok" -ArgumentList "http", "4000"
    Write-Host ""
    Write-Host "✓ ngrok started for backend!" -ForegroundColor Green
    Write-Host "  Copy the URL from the ngrok window" -ForegroundColor Yellow
    Write-Host "  Update frontend/.env.local with: NEXT_PUBLIC_BACKEND_URL=<ngrok-url>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Users should access frontend via: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "(or your local IP if on same network)" -ForegroundColor Gray
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "Starting ngrok for FRONTEND (port 3000)..." -ForegroundColor Yellow
    Write-Host "This will open in a new window." -ForegroundColor Gray
    Start-Process -FilePath "ngrok" -ArgumentList "http", "3000"
    Write-Host ""
    Write-Host "✓ ngrok started for frontend!" -ForegroundColor Green
    Write-Host "  Copy the URL from the ngrok window" -ForegroundColor Yellow
    Write-Host "  Share this URL with users" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Make sure frontend/.env.local has:" -ForegroundColor Cyan
    Write-Host "  NEXT_PUBLIC_BACKEND_URL=<your-backend-ngrok-url>" -ForegroundColor Gray
} else {
    Write-Host "Invalid choice. Exiting." -ForegroundColor Red
}

Write-Host ""

