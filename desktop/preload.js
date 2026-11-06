/**
 * Pont Electron ↔ page web Tuesday.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tuesdayDesktop", {
  isDesktop: true,
  platform: process.platform,

  getUpdateStatus: () => ipcRenderer.invoke("tuesday:get-update-status"),

  installUpdate: () => ipcRenderer.invoke("tuesday:install-update"),

  checkForUpdates: () => ipcRenderer.invoke("tuesday:check-updates"),

  onUpdateStatus: (handler) => {
    const listener = (_event, status) => {
      handler(status);
    };
    ipcRenderer.on("tuesday:update-status", listener);
    return () => {
      ipcRenderer.removeListener("tuesday:update-status", listener);
    };
  },
});
