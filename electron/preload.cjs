const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("morioDesktop", {
  platform: process.platform,
  isDesktop: true,
  windowControls: {
    minimize: () => ipcRenderer.send("window:minimize"),
    toggleMaximize: () => ipcRenderer.send("window:toggle-maximize"),
    close: () => ipcRenderer.send("window:close"),
  },
});
