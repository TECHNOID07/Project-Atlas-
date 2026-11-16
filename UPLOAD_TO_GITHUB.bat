@echo off
title PROJECT ATLAS - GitHub Uploader
echo ============================================================================
echo   PROJECT ATLAS - INTERACTIVE 3D UNIVERSE EXPLORER (GITHUB UPLOAD HELPER)
echo ============================================================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/ or upload this folder via GitHub Web UI.
    pause
    exit /b 1
)

if not exist ".git" (
    git init
    git branch -M main
)

git add -A
git commit -m "Initial release: Project ATLAS Interactive 3D Universe Explorer (v2.0.0-CINEMATIC-ULTRA)" 2>nul

echo.
set /p REPO_URL="Paste your empty GitHub Repository URL (e.g. https://github.com/username/project-atlas.git): "
if "%REPO_URL%"=="" (
    echo [ERROR] No repository URL entered. Exiting.
    pause
    exit /b 1
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo.
echo Pushing Project ATLAS to %REPO_URL% ...
git push -u origin main

echo.
echo ============================================================================
echo   DONE! To enable GitHub Pages, open your repo Settings -^> Pages and select
echo   Deploy from branch: main / (root).
echo ============================================================================
pause
