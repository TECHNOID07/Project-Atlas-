#!/usr/bin/env bash
set -e
echo "============================================================================"
echo "  PROJECT ATLAS - INTERACTIVE 3D UNIVERSE EXPLORER (GITHUB UPLOAD HELPER)"
echo "============================================================================"

if [ ! -d ".git" ]; then
    git init
    git branch -M main
fi

git add -A
git commit -m "Initial release: Project ATLAS Interactive 3D Universe Explorer (v2.0.0-CINEMATIC-ULTRA)" || true

read -rp "Paste your empty GitHub Repository URL (e.g. https://github.com/username/project-atlas.git): " REPO_URL
if [ -z "$REPO_URL" ]; then
    echo "[ERROR] No repository URL provided."
    exit 1
fi

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git branch -M main
git push -u origin main
echo "Successfully pushed Project ATLAS to $REPO_URL!"
