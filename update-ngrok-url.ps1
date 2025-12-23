# Script to update frontend/.env.local with ngrok backend URL
# Usage: .\update-ngrok-url.ps1 [ngrok-url]
# Example: .\update-ngrok-url.ps1 https://nonclose-pesticidal-elle.ngrok-free.dev

param(
    [string]$NgrokUrl = ""
)

$envFile = "frontend\.env.local"
$envFileFullPath = Join-Path $PSScriptRoot $envFile

# If no URL provided, prompt user
if ([string]::IsNullOrWhiteSpace($NgrokUrl)) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Update Frontend .env.local with ngrok URL" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please enter your ngrok backend URL:" -ForegroundColor Yellow
    Write-Host "Example: https://nonclose-pesticidal-elle.ngrok-free.dev" -ForegroundColor Gray
    Write-Host ""
    $NgrokUrl = Read-Host "ngrok URL"
}

# Validate URL format
if ([string]::IsNullOrWhiteSpace($NgrokUrl)) {
    Write-Host "Error: URL cannot be empty!" -ForegroundColor Red
    exit 1
}

if (-not $NgrokUrl.StartsWith("http://") -and -not $NgrokUrl.StartsWith("https://")) {
    Write-Host "Warning: URL should start with http:// or https://" -ForegroundColor Yellow
    Write-Host "Adding https:// prefix..." -ForegroundColor Yellow
    $NgrokUrl = "https://" + $NgrokUrl
}

# Check if file exists
if (-not (Test-Path $envFileFullPath)) {
    Write-Host "Creating new .env.local file..." -ForegroundColor Yellow
    $content = "# Backend URL Configuration`n"
    $content += "NEXT_PUBLIC_BACKEND_URL=$NgrokUrl`n"
    Set-Content -Path $envFileFullPath -Value $content -Encoding UTF8
    Write-Host "Created $envFile with URL: $NgrokUrl" -ForegroundColor Green
} else {
    Write-Host "Updating existing .env.local file..." -ForegroundColor Yellow
    
    # Read existing content
    $content = Get-Content -Path $envFileFullPath -Raw
    
    # Check if NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_API_BASE_URL exists
    $pattern1 = "NEXT_PUBLIC_BACKEND_URL\s*=\s*.*"
    $pattern2 = "NEXT_PUBLIC_API_BASE_URL\s*=\s*.*"
    
    if ($content -match $pattern1) {
        # Replace existing NEXT_PUBLIC_BACKEND_URL
        $content = $content -replace $pattern1, "NEXT_PUBLIC_BACKEND_URL=$NgrokUrl"
        Write-Host "Updated NEXT_PUBLIC_BACKEND_URL" -ForegroundColor Green
    } elseif ($content -match $pattern2) {
        # Replace existing NEXT_PUBLIC_API_BASE_URL
        $content = $content -replace $pattern2, "NEXT_PUBLIC_BACKEND_URL=$NgrokUrl"
        Write-Host "Replaced NEXT_PUBLIC_API_BASE_URL with NEXT_PUBLIC_BACKEND_URL" -ForegroundColor Green
    } else {
        # Add new line
        if (-not $content.EndsWith("`n") -and -not $content.EndsWith("`r`n")) {
            $content += "`n"
        }
        $content += "NEXT_PUBLIC_BACKEND_URL=$NgrokUrl`n"
        Write-Host "Added NEXT_PUBLIC_BACKEND_URL" -ForegroundColor Green
    }
    
    # Write back to file
    Set-Content -Path $envFileFullPath -Value $content -Encoding UTF8
    Write-Host "Updated $envFile with URL: $NgrokUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Restart your frontend server (Ctrl+C then npm run dev)" -ForegroundColor Yellow
Write-Host "2. Optional: Run ngrok for frontend: ngrok http 3000" -ForegroundColor Yellow
Write-Host "3. Share the frontend URL with users" -ForegroundColor Yellow
Write-Host ""
