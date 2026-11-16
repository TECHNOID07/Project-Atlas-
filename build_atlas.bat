@echo off
title PROJECT ATLAS — Offline Production Builder
echo ============================================================================
echo   PROJECT ATLAS — OFFLINE PRODUCTION BUILDER
echo ============================================================================
cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Node.js is not installed on this machine.
    echo The production build in "dist\" is already pre-compiled and ready to run via run_atlas.bat!
    pause
    exit /b 0
)

echo Building production distribution in dist\ ...
node scripts/build.js
echo Running automated offline audit and QA checks...
node tests/run-all-tests.js
echo ============================================================================
echo   BUILD & VERIFICATION COMPLETE! Launch via run_atlas.bat
echo ============================================================================
pause
