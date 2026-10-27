@echo off
setlocal enabledelayedexpansion
title GESTUREDRIVE X — Unreal Engine 5 Build & Package Automation
color 0c

echo =====================================================================
echo    GESTUREDRIVE X - UNREAL ENGINE 5 AUTOMATED BUILD PIPELINE
echo =====================================================================
echo.

cd /d "%~dp0"
set PROJECT_FILE=%~dp0GestureDriveX.uproject

:: 1. Search for Unreal Engine 5 Installation
set UE_ROOT=
for %%P in (
    "C:\Program Files\Epic Games\UE_5.5"
    "C:\Program Files\Epic Games\UE_5.4"
    "C:\Program Files\Epic Games\UE_5.3"
    "D:\Program Files\Epic Games\UE_5.5"
    "D:\Program Files\Epic Games\UE_5.4"
    "D:\Program Files\Epic Games\UE_5.3"
    "D:\Epic Games\UE_5.5"
    "D:\Epic Games\UE_5.4"
    "D:\Epic Games\UE_5.3"
    "D:\UE_5.4"
    "D:\UE_5.3"
    "C:\UE_5.4"
    "C:\UE_5.3"
) do (
    if exist "%%~P\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.dll" (
        set "UE_ROOT=%%~P"
        goto :FOUND_UE
    )
)

:FOUND_UE
if "%UE_ROOT%"=="" (
    echo [ERROR] Unreal Engine 5 installation was not found in standard directories!
    echo.
    echo To build this native UE5 game:
    echo 1. Install Unreal Engine 5.3 or 5.4 from the Epic Games Launcher.
    echo 2. Open GestureDriveX.uproject or run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Found Unreal Engine at: %UE_ROOT%
echo.

:: 2. Generate Visual Studio Project Files
echo [1/3] Generating Visual Studio Project Files...
call "%UE_ROOT%\Engine\Build\BatchFiles\GenerateProjectFiles.bat" "%PROJECT_FILE%"
if %errorlevel% neq 0 (
    echo [WARNING] Project generation completed with exit code %errorlevel%.
)

:: 3. Compile C++ Game Module
echo [2/3] Compiling GestureDriveX Win64 Development Editor...
call "%UE_ROOT%\Engine\Build\BatchFiles\Build.bat" GestureDriveXEditor Win64 Development "%PROJECT_FILE%" -waitmutex
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Check compiler logs above.
    pause
    exit /b %errorlevel%
)

:: 4. Build Standalone Shipping Game
echo [3/3] Packaging Standalone Windows Executable (Win64 Shipping)...
set OUTPUT_DIR=%~dp0Saved\StagedBuilds\Windows
call "%UE_ROOT%\Engine\Build\BatchFiles\RunUAT.bat" BuildCookRun ^
    -project="%PROJECT_FILE%" ^
    -noP4 -clientconfig=Shipping -serverconfig=Shipping ^
    -platform=Win64 -targetplatform=Win64 ^
    -build -cook -stage -pak -archive ^
    -archivedirectory="%OUTPUT_DIR%"

echo.
echo =====================================================================
echo  BUILD COMPLETE! Standalone Game executable is located in:
echo  %OUTPUT_DIR%
echo =====================================================================
echo.
pause
