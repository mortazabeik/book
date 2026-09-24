const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const startUrl = process.env.ELECTRON_START_URL || "http://localhost:8080";

function loadApplication(window) {
  if (app.isPackaged) {
    void window.loadFile(path.join(process.resourcesPath, "app.asar", ".vercel", "output", "static", "index.html"));
  } else {
    void window.loadURL(startUrl);
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#071522",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(startUrl)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  loadApplication(window);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
