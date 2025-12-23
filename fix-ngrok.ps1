# Script to help fix ngrok setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ngrok Setup Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check running ngrok processes
$ngrokProcesses = Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}
if ($ngrokProcesses) {
    Write-Host "Found running ngrok processes:" -ForegroundColor Yellow
    $ngrokProcesses | ForEach-Object {
        Write-Host "  Process ID: $($_.Id) - Started: $($_.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "You have two options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Stop existing ngrok and run both in sequence" -ForegroundColor Cyan
    Write-Host "  1. Stop the current ngrok (Ctrl+C in its terminal)" -ForegroundColor Gray
    Write-Host "  2. Run: ngrok http 4000  (for backend)" -ForegroundColor White -BackgroundColor DarkGray
    Write-Host "  3. In a NEW terminal, run: ngrok http 3000  (for frontend)" -ForegroundColor White -BackgroundColor DarkGray
    Write-Host ""
    Write-Host "Option 2: Use ngrok with different subdomains (requires paid plan)" -ForegroundColor Cyan
    Write-Host "  This requires ngrok paid plan with reserved domains" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "No ngrok processes found running." -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Recommended Solution" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The issue is that ngrok free plan doesn't allow multiple tunnels" -ForegroundColor Yellow
Write-Host "with the same subdomain. Here's what to do:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Keep your current ngrok running for backend (port 4000)" -ForegroundColor Green
Write-Host "   URL: https://nonclose-pesticidal-elle.ngrok-free.dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. For frontend access, you have two options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Option A: Use localhost:3000 (if users are on same network/VPN)" -ForegroundColor Cyan
Write-Host "     - Users access: http://localhost:3000" -ForegroundColor Gray
Write-Host "     - Backend calls go through ngrok automatically" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B: Run ngrok for frontend in a DIFFERENT terminal" -ForegroundColor Cyan
Write-Host "     - Open a NEW PowerShell terminal" -ForegroundColor Gray
Write-Host "     - Run: ngrok http 3000" -ForegroundColor White -BackgroundColor DarkGray
Write-Host "     - You'll get a NEW URL (different from backend)" -ForegroundColor Gray
Write-Host "     - Share that URL with users" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Make sure frontend .env.local is set correctly:" -ForegroundColor Yellow
$envFile = "frontend\.env.local"
if (Test-Path $envFile) {
    $content = Get-Content $envFile
    Write-Host "   Current .env.local:" -ForegroundColor Gray
    $content | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
} else {
    Write-Host "   .env.local file not found!" -ForegroundColor Red
}
Write-Host ""

