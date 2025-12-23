@echo off
REM Batch script wrapper for PowerShell script
REM Usage: update-ngrok-url.bat [ngrok-url]

if "%~1"=="" (
    powershell -ExecutionPolicy Bypass -File "%~dp0update-ngrok-url.ps1"
) else (
    powershell -ExecutionPolicy Bypass -File "%~dp0update-ngrok-url.ps1" -NgrokUrl "%~1"
)

