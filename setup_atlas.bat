@echo off
title PROJECT ATLAS — Setup & Build Verification
echo ============================================================================
echo   PROJECT ATLAS — OFFLINE 3D UNIVERSE EXPLORER (SETUP)
echo   Target Hardware: HP ProBook 640 (Intel Core i5-6300U, 8 GB DDR4)
echo ============================================================================
cd /d "%~dp0"

echo [1/3] Checking pre-bundled production distribution in dist\ ...
if exist "dist\index.html" (
    echo   [OK] Pre-built production bundle found in dist\index.html.
    echo   Note: Node.js is NOT required to run the finished application!
) else (
    echo   [INFO] dist\index.html not found. Checking Node.js to build from source...
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [2/3] Node.js detected. Running local offline production build & test suite...
    node scripts/build.js
    node tests/run-all-tests.js
) else (
    echo [2/3] Node.js not installed on this machine. Using pre-built dist\ bundle directly.
)

echo [3/3] Setup complete! Run "run_atlas.bat" to launch PROJECT ATLAS offline.
pause
