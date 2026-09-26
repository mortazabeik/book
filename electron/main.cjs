const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");
const { startServer } = require("./server.cjs");
const { createWorker } = require("tesseract.js");
const engData = require("@tesseract.js-data/eng");
const fasData = require("@tesseract.js-data/fas");
const fs = require("node:fs");

let ocrWorkerPromise;
async function getOcrWorker() {
  const dataDir = path.join(app.getPath("userData"), "ocr-data");
  fs.mkdirSync(dataDir, { recursive: true });
  for (const [source, name] of [[engData.langPath, "eng"], [fasData.langPath, "fas"]]) {
    const target = path.join(dataDir, `${name}.traineddata.gz`);
    if (!fs.existsSync(target)) fs.copyFileSync(path.join(source, `${name}.traineddata.gz`), target);
  }
  ocrWorkerPromise ??= createWorker("eng+fas", 1, { langPath: dataDir, gzip: true, cachePath: path.join(app.getPath("userData"), "ocr-cache") });
  return ocrWorkerPromise;
}

app.commandLine.appendSwitch("enable-features", "CSSBackdropFilter");

let localServer;

ipcMain.handle("ocr:recognize", async (_event, imageDataUrl) => {
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) throw new Error("Invalid OCR image");
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(imageDataUrl);
  return data.text.trim();
});

ipcMain.handle("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("window:toggle-maximize", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window?.isMaximized()) window.unmaximize();
  else window?.maximize();
});

ipcMain.handle("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

const startUrl = process.env.ELECTRON_START_URL || "http://localhost:8080";

async function loadApplication(window) {
  if (app.isPackaged) {
    const root = path.join(process.resourcesPath, "app.asar");
    localServer = await startServer(root);
    await window.loadURL(`http://127.0.0.1:${localServer.port}/`);
    window.webContents.insertCSS(`
      .glass-panel, .translation-actions, .language-options {
        -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
        backdrop-filter: blur(24px) saturate(160%) !important;
      }
    `);
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
    autoHideMenuBar: true,
    maximizable: true,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.setMenuBarVisibility(false);
  window.removeMenu();
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
