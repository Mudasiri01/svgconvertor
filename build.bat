@echo off
echo ==========================================
echo 1. Installing Backend Dependencies...
echo ==========================================
call npm install --ignore-scripts

echo.
echo ==========================================
echo 2. Installing Frontend Dependencies...
echo ==========================================
cd frontend
call npm install
cd ..

echo.
echo ==========================================
echo 3. Downloading Playwright Browser...
echo ==========================================
node scripts/postinstall.js

echo.
echo ==========================================
echo 4. Building the Application Installer...
echo ==========================================
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
call npm run dist

echo.
echo ==========================================
echo ALL DONE! Check the "dist" folder.
echo ==========================================
pause
