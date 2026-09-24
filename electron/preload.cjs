const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("morioDesktop", {
  platform: process.platform,
  isDesktop: true,
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },
});
