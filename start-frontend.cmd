@echo off
title Aura SVG - Frontend UI (React + Vite)
color 0A
echo.
echo  =====================================================
echo    AURA SVG  --  FRONTEND UI
echo    React + Vite  ^|  http://localhost:5173
echo  =====================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

:: Move into frontend folder
cd /d "%~dp0aura-svg-clone"

:: Install dependencies if missing
if not exist node_modules (
    echo  [INFO] Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo.
echo  [READY] Starting frontend on http://localhost:5173
echo  [INFO]  Make sure the backend is also running!
echo  [INFO]  Press Ctrl+C to stop.
echo.

npm run dev

pause
