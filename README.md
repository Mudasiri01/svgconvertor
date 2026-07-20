# Aura SVG Studio - Desktop App

Aura SVG Studio is a premium web-based vector animation exporter and rendering tool that converts animated SVGs into high-quality WebM/MP4 videos. This project has been packaged as a completely offline Windows desktop application.

## 🚀 Features

- **Standalone Executable**: Works 100% offline without needing Node.js, FFmpeg, Playwright, or Chromium installed on the host machine.
- **Embedded Chromium**: Bundled securely inside the installation folder.
- **Embedded FFmpeg**: Handled entirely within the application.
- **No Dependencies Required**: The installer handles everything!

## 📦 How to Build the Installer

Follow these steps to build the `Setup.exe` installer from scratch.

1. **Prerequisites** (For Development Only):
   - You need Node.js installed on your machine to build the installer.
   - You need `npm` (comes with Node.js).

2. **Installation**:
   Open a terminal in the root folder of the project and run:
   ```bash
   npm install
   ```
   *Note: This will download all Node modules, the local Playwright browser (Chromium), and the frontend dependencies automatically.*

3. **Build the Application**:
   To generate the final Windows installer (`Setup.exe`), run:
   ```bash
   npm run dist
   ```
   *or*
   ```bash
   npm run build
   ```

4. **Output**:
   Once the build completes, the setup file will be located at:
   ```text
   dist/Aura SVG Studio Setup 1.0.0.exe
   ```

## 💻 Development

If you want to run the application in development mode (with hot reloading for the frontend):

1. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   This will start both the Vite frontend server and the Express backend server concurrently.

2. **Start Electron App**:
   In a separate terminal, run:
   ```bash
   npm start
   ```

## 📁 Project Structure

- `/backend` - Express server and Playwright/FFmpeg rendering pipeline.
- `/frontend` - Vite + React application.
- `/main.js` - Electron Main Process entry point.
- `/scripts/postinstall.js` - Script to install Chromium locally inside the app folder.
- `/playwright-browsers` - Hidden folder generated during `npm install` to bundle Chromium.

---
**Designed with ✦ by AURA Team**
