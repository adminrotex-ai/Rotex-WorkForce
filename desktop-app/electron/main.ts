import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Rotex WorkForce',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Block all navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
    if (!url.startsWith(appUrl) && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Open external links in system browser, never in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Content Security Policy — only allow connections to the app's own Supabase backend
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';"
          + " script-src 'self' 'unsafe-inline' 'unsafe-eval';"
          + " style-src 'self' 'unsafe-inline';"
          + " img-src 'self' data: blob:;"
          + " font-src 'self' data:;"
          + " connect-src 'self' https://*.supabase.co;"
        ],
      },
    });
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    mainWindow = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Prevent creating additional windows
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});
