// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.
// GESTUREDRIVE X - Standalone Windows Desktop Game Host

const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;

// Ensure hardware acceleration is enabled for maximum 60+ FPS 3D rendering
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('use-angle', 'd3d11');

function checkServerReady(url, maxRetries = 20, delayMs = 250) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.end();
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        resolve(false);
      } else {
        setTimeout(check, delayMs);
      }
    };

    check();
  });
}

async function createWindow() {
  // Automatically grant camera permissions for laptop webcam hand-tracking
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      return callback(true);
    }
    callback(false);
  });

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    fullscreen: true,
    backgroundColor: '#0a0a0c',
    title: 'GESTUREDRIVE X — AAA Racing Game',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true,
      webSecurity: false
    }
  });

  // Ready-to-show smooth splash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load game from local server or directly
  const gameUrl = 'http://localhost:8080/game/';
  await checkServerReady('http://localhost:8080/api/status');
  mainWindow.loadURL(gameUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure the local server is running
try {
  require('./server/index.js');
} catch (err) {
  console.log('[Electron] Server bootstrap note:', err.message);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
