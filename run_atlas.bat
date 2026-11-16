@echo off
title PROJECT ATLAS — Interactive 3D Universe Explorer (127.0.0.1:8080)
echo ============================================================================
echo   PROJECT ATLAS — INTERACTIVE 3D UNIVERSE EXPLORER
echo   Mode: 100%% OFFLINE LOCAL PRODUCTION SERVER (http://127.0.0.1:8080)
echo   Hardware Profile: HP ProBook 640 (Intel Core i5-6300U, 8 GB RAM)
echo ============================================================================
cd /d "%~dp0"

set PORT=8080
set URL=http://127.0.0.1:%PORT%/index.html

REM Launch browser in application/presentation mode after brief server startup delay
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" "%URL%""

REM Prefer Python 3 local HTTP server bound strictly to 127.0.0.1 (no Node.js required at runtime)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting Python local static server on http://127.0.0.1:%PORT% serving dist\ ...
    python -m http.server %PORT% --bind 127.0.0.1 --directory dist
    goto :eof
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting Python Launcher static server on http://127.0.0.1:%PORT% serving dist\ ...
    py -3 -m http.server %PORT% --bind 127.0.0.1 --directory dist
    goto :eof
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting Node.js local static server on http://127.0.0.1:%PORT% serving dist\ ...
    node scripts/dev-server.js --preview
    goto :eof
)

echo [FALLBACK] Neither Python nor Node.js found in PATH. Opening standalone offline bundle directly...
start "" "%~dp0dist\project_atlas_standalone.html"
