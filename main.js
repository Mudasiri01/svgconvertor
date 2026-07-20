const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow;
let serverPort = 3001;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Aura SVG Studio',
    icon: path.join(__dirname, 'frontend', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // We load the frontend via the Express server
  // Wait a little for the Express server to be ready just in case
  setTimeout(() => {
    mainWindow.loadURL(`http://localhost:${serverPort}`);
  }, 500);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const server = net.createServer();
  server.listen(0, () => {
    serverPort = server.address().port;
    server.close(() => {
      process.env.PORT = serverPort;
      // Start express server on dynamically found PORT
      require('./backend/server/index.js');
      createWindow();
    });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
