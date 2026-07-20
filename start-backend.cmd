@echo off
title Aura SVG - Rendering Backend (Playwright + FFmpeg)
color 0B
echo.
echo  =====================================================
echo    AURA SVG  --  RENDERING BACKEND
echo    Playwright + FFmpeg  ^|  http://localhost:3001
echo  =====================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

:: ── Kill any process already using port 3001 ─────────────────────────────
echo  [INFO] Checking if port 3001 is free...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001 "') do (
    echo  [INFO] Killing old process on port 3001 (PID %%a)...
    taskkill /PID %%a /F >nul 2>nul
)
echo  [OK] Port 3001 is free.
echo.

:: Move into server folder
cd /d "%~dp0aura-svg-clone\server"

:: Install dependencies if missing
if not exist node_modules (
    echo  [INFO] Installing server dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo  [OK] Server dependencies installed.
)

:: Install Playwright Chromium browser if missing
if not exist node_modules\playwright (
    echo  [INFO] Installing Playwright Chromium browser...
    call npx playwright install chromium
    echo  [OK] Playwright browser ready.
)

echo.
echo  [READY] Starting backend on http://localhost:3001
echo  [INFO]  Keep this window open while using the app.
echo  [INFO]  Press Ctrl+C to stop the server.
echo.

node index.js

pause
