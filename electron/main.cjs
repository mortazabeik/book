const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { startServer } = require("./server.cjs");

let localServer;

const startUrl = process.env.ELECTRON_START_URL || "http://localhost:8080";

async function loadApplication(window) {
  if (app.isPackaged) {
    const root = path.join(process.resourcesPath, "app.asar");
    localServer = await startServer(root);
    await window.loadURL(`http://127.0.0.1:${localServer.port}/`);
  } else {
    await window.loadURL(startUrl);
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
  void loadApplication(window).catch((error) => {
    console.error("Failed to load Morio Book:", error);
    void window.loadURL(`data:text/plain,${encodeURIComponent(String(error))}`);
  });
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
