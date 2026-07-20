@echo off
title Aura SVG Studio - Full Launch
color 0E
echo.
echo  =====================================================
echo    AURA SVG STUDIO  --  FULL LAUNCH
echo    Backend  : http://localhost:3001
echo    Frontend : http://localhost:5173
echo  =====================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

:: ── Install frontend deps ─────────────────────────────────────────────────
cd /d "%~dp0aura-svg-clone"

if not exist node_modules (
    echo  [INFO] Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] Frontend npm install failed.
        pause
        exit /b 1
    )
    echo  [OK] Frontend dependencies installed.
)

:: ── Install server deps ───────────────────────────────────────────────────
cd /d "%~dp0aura-svg-clone\server"

if not exist node_modules (
    echo  [INFO] Installing server dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] Server npm install failed.
        pause
        exit /b 1
    )
    echo  [INFO] Installing Playwright Chromium browser...
    call npx playwright install chromium
    echo  [OK] Server dependencies installed.
)

:: ── Launch both windows ───────────────────────────────────────────────────
echo.
echo  [LAUNCH] Starting Rendering Backend...
start "Aura Backend  ^|  localhost:3001" cmd /k "color 0B && cd /d "%~dp0aura-svg-clone\server" && echo. && echo  Backend running on http://localhost:3001 && echo  Press Ctrl+C to stop. && echo. && node index.js"

:: Short delay so the backend binds its port first
timeout /t 3 /nobreak >nul

echo  [LAUNCH] Starting Frontend UI...
start "Aura Frontend  ^|  localhost:5173" cmd /k "color 0A && cd /d "%~dp0aura-svg-clone" && echo. && echo  Frontend running on http://localhost:5173 && echo  Press Ctrl+C to stop. && echo. && npm run dev"

echo.
echo  =====================================================
echo   Both services are starting in separate windows.
echo   Open your browser: http://localhost:5173
echo  =====================================================
echo.
pause