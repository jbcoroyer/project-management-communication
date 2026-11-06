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

  window: {
    minimize: () => ipcRenderer.invoke("tuesday:window-minimize"),
    toggleMaximize: () => ipcRenderer.invoke("tuesday:window-toggle-maximize"),
    close: () => ipcRenderer.invoke("tuesday:window-close"),
    isMaximized: () => ipcRenderer.invoke("tuesday:window-is-maximized"),
    onMaximizedChange: (handler) => {
      const listener = (_event, maximized) => {
        handler(Boolean(maximized));
      };
      ipcRenderer.on("tuesday:window-maximized", listener);
      return () => {
        ipcRenderer.removeListener("tuesday:window-maximized", listener);
      };
    },
  },
});
