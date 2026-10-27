@echo off
title GESTUREDRIVE X — AAA Racing Game Launcher
color 0b

echo =====================================================================
echo           GESTUREDRIVE X - AAA RACING EXPERIENCE
echo           AI-Powered Real-Time Hand Gesture Control
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js runtime...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b
)

echo [2/3] Launching GESTUREDRIVE X Relay Server...
start "GESTUREDRIVE X Relay Server" cmd /k "node server/index.js"

echo Waiting for server to initialize...
timeout /t 2 /nobreak >nul

echo [3/3] Launching AAA Racing Game in Browser...
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:8080/game/
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:8080/game/
) else (
    start http://localhost:8080/game/
)

echo.
echo =====================================================================
echo   GESTUREDRIVE X IS NOW RUNNING!
echo   Main Game Screen:   http://localhost:8080/game/
echo   Phone Controller:   Scan the on-screen QR Code
echo =====================================================================
echo.
pause
