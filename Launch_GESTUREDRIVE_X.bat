@echo off
setlocal
title GESTUREDRIVE X — Standalone Windows AAA Racing Game
color 0c

echo =====================================================================
echo            GESTUREDRIVE X - AAA PC RACING EXPERIENCE
echo           Natural Two-Hand Laptop Webcam Gesture Control
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

echo [2/3] Initializing Standalone Racing Engine & Vision Pipeline...
:: Start Electron Standalone Windows App
if exist "node_modules\electron\dist\electron.exe" (
    echo [3/3] Launching GESTUREDRIVE X Native Windows Game...
    npx electron .
    goto :EXIT
)

:: Fallback if electron not installed yet
echo [INFO] Starting Standalone Local Server...
start "GESTUREDRIVE X Server" cmd /c "node server/index.js"
timeout /t 2 /nobreak >nul

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:8080/game/ --start-fullscreen
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:8080/game/ --start-fullscreen
) else (
    start http://localhost:8080/game/
)

:EXIT
echo.
echo GESTUREDRIVE X is running! Enjoy your race!
