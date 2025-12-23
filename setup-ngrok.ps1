# Script to setup ngrok for both frontend and backend
# This script will guide you through the setup process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PayLens - ngrok Setup Guide" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANT: You need to run ngrok in SEPARATE terminals!" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Backend ngrok (already running)" -ForegroundColor Green
Write-Host "  URL: https://nonclose-pesticidal-elle.ngrok-free.dev" -ForegroundColor Gray
Write-Host "  This is for API calls only - DO NOT open in browser!" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Frontend ngrok (you need to run this)" -ForegroundColor Yellow
Write-Host "  Open a NEW terminal and run:" -ForegroundColor Yellow
Write-Host "    ngrok http 3000" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""

Write-Host "Step 3: After running frontend ngrok, you'll get a URL like:" -ForegroundColor Yellow
Write-Host "  https://xyz123.ngrok-free.dev" -ForegroundColor White -BackgroundColor DarkGray
Write-Host "  This is the URL to share with users!" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 4: Make sure your frontend is running:" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor White -BackgroundColor DarkGray
Write-Host "  npm run dev" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""

Write-Host "Step 5: Verify .env.local is configured:" -ForegroundColor Yellow
$envFile = "frontend\.env.local"
if (Test-Path $envFile) {
    $content = Get-Content $envFile
    Write-Host "  Current .env.local:" -ForegroundColor Gray
    $content | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  .env.local file not found!" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Start Commands" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White -BackgroundColor DarkGray
Write-Host "  npm run start:dev" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor White -BackgroundColor DarkGray
Write-Host "  npm run dev" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""
Write-Host "Terminal 3 (Backend ngrok - already running):" -ForegroundColor Yellow
Write-Host "  ngrok http 4000" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""
Write-Host "Terminal 4 (Frontend ngrok - you need to run this):" -ForegroundColor Yellow
Write-Host "  ngrok http 3000" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""

