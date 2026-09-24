const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
contextBridge.exposeInMainWorld("morioDesktop", {
  platform: process.platform,
  isDesktop: true,
  windowControls: {
    minimize: electronAPI.minimize,
    toggleMaximize: electronAPI.maximize,
    close: electronAPI.close,
  },
});
