const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("morioDesktop", {
  platform: process.platform,
  isDesktop: true,
});
