@echo off
title NEON CLASH: OVERDRIVE - Game Launcher
cd /d "%~dp0"
echo ========================================================
echo   Launching NEON CLASH: OVERDRIVE...
echo ========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
