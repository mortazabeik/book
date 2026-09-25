const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const readline = require("node:readline");
const path = require("node:path");
const { startServer } = require("./server.cjs");

app.commandLine.appendSwitch("enable-features", "CSSBackdropFilter");

let localServer;

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

ipcMain.handle("piper:speak", async (_event, text) => {
  const python = process.platform === "win32" ? "python" : "python3";
  const script = path.join(__dirname, "piper_service.py");
  return await new Promise((resolve, reject) => {
    const child = spawn(python, [script], { cwd: app.getAppPath(), stdio: ["pipe", "pipe", "pipe"] });
    const output = readline.createInterface({ input: child.stdout });
    const timer = setTimeout(() => { child.kill(); reject(new Error("Piper timed out")); }, 120000);
    output.once("line", (line) => {
      clearTimeout(timer);
      try { resolve(JSON.parse(line)); } catch { reject(new Error("Invalid Piper response")); }
      child.kill();
    });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (code) => {
      if (code && !child.killed) reject(new Error("Piper exited unexpectedly"));
    });
    child.stdin.end(JSON.stringify({ text }) + "\\n");
  });
});

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
