const { app, BrowserWindow, dialog, ipcMain } = require("electron");

/** @type {import('electron-updater').AppUpdater | null} */
let autoUpdater = null;
let checking = false;
let manualCheck = false;

/** @type {{ status: string, version?: string, message?: string }} */
let updateState = { status: "idle" };

function getAutoUpdater() {
  if (autoUpdater) return autoUpdater;
  ({ autoUpdater } = require("electron-updater"));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  return autoUpdater;
}

function setUpdateState(next) {
  updateState = { ...next };
  broadcastUpdateStatus();
}

function broadcastUpdateStatus() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send("tuesday:update-status", updateState);
    } catch {
      /* ignore */
    }
  }
}

function pushStatusToWindow(win) {
  if (!win || win.isDestroyed()) return;
  try {
    win.webContents.send("tuesday:update-status", updateState);
  } catch {
    /* ignore */
  }
}

/**
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 */
function setupAutoUpdater(getMainWindow) {
  registerIpc();

  if (!app.isPackaged) {
    setUpdateState({ status: "idle" });
    return;
  }

  const updater = getAutoUpdater();

  updater.on("error", (err) => {
    checking = false;
    console.error("[updater]", err?.message || err);
    setUpdateState({
      status: "error",
      message: err?.message || String(err),
    });
    if (!manualCheck) return;
    manualCheck = false;
    void dialog.showMessageBox({
      type: "warning",
      title: "Mise à jour",
      message: "Impossible de vérifier les mises à jour",
      detail: err?.message || String(err),
      buttons: ["OK"],
    });
  });

  updater.on("checking-for-update", () => {
    if (updateState.status !== "ready") {
      setUpdateState({ status: "checking", version: updateState.version });
    }
  });

  updater.on("update-available", (info) => {
    checking = false;
    setUpdateState({ status: "downloading", version: info.version });
    // Pas de dialogue bloquant : le bouton profil / indicateur suffit
    if (manualCheck) {
      manualCheck = false;
      const win = getMainWindow?.();
      const opts = {
        type: "info",
        title: "Mise à jour Tuesday",
        message: `Version ${info.version} en téléchargement`,
        detail:
          "Le bouton « Mettre à jour » apparaîtra sous votre profil dès que ce sera prêt.",
        buttons: ["OK"],
      };
      if (win && !win.isDestroyed()) void dialog.showMessageBox(win, opts);
      else void dialog.showMessageBox(opts);
    }
  });

  updater.on("update-not-available", () => {
    checking = false;
    if (updateState.status !== "ready") {
      setUpdateState({ status: "idle" });
    }
    if (!manualCheck) return;
    manualCheck = false;
    void dialog.showMessageBox({
      type: "info",
      title: "Tuesday",
      message: "Application à jour",
      detail: `Vous utilisez déjà la dernière version (${app.getVersion()}).`,
      buttons: ["OK"],
    });
  });

  updater.on("download-progress", () => {
    if (updateState.status !== "ready") {
      setUpdateState({
        status: "downloading",
        version: updateState.version,
      });
    }
  });

  updater.on("update-downloaded", (info) => {
    manualCheck = false;
    checking = false;
    // Bouton « Mettre à jour » dans la sidebar — pas de pop-up obligatoire
    setUpdateState({ status: "ready", version: info.version });
  });

  setTimeout(() => {
    void checkForUpdates({ manual: false });
  }, 8_000);

  setInterval(
    () => {
      void checkForUpdates({ manual: false });
    },
    6 * 60 * 60 * 1000,
  );
}

function registerIpc() {
  ipcMain.removeHandler("tuesday:get-update-status");
  ipcMain.removeHandler("tuesday:install-update");
  ipcMain.removeHandler("tuesday:check-updates");

  ipcMain.handle("tuesday:get-update-status", () => updateState);

  ipcMain.handle("tuesday:install-update", () => {
    if (updateState.status !== "ready") {
      return { ok: false, reason: "not-ready" };
    }
    if (!app.isPackaged) {
      return { ok: false, reason: "dev" };
    }
    // Laisse le temps au clic UI de se terminer
    setTimeout(() => {
      try {
        getAutoUpdater().quitAndInstall(false, true);
      } catch (err) {
        console.error("[updater] install", err);
      }
    }, 150);
    return { ok: true };
  });

  ipcMain.handle("tuesday:check-updates", async () => {
    await checkForUpdates({ manual: true });
    return updateState;
  });
}

/**
 * @param {{ manual?: boolean }} [opts]
 */
async function checkForUpdates(opts = {}) {
  const manual = Boolean(opts.manual);
  if (!app.isPackaged) {
    if (manual) {
      await dialog.showMessageBox({
        type: "info",
        title: "Tuesday",
        message: "Mises à jour indisponibles",
        detail:
          "Les mises à jour automatiques fonctionnent uniquement avec la version installée (Setup.exe).",
        buttons: ["OK"],
      });
    }
    return;
  }
  if (checking) return;
  // Ne pas relancer si déjà prêt à installer
  if (updateState.status === "ready" && !manual) return;

  checking = true;
  manualCheck = manual;

  try {
    await getAutoUpdater().checkForUpdates();
  } catch (err) {
    checking = false;
    setUpdateState({
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    if (manual) {
      manualCheck = false;
      await dialog.showMessageBox({
        type: "warning",
        title: "Mise à jour",
        message: "Impossible de vérifier les mises à jour",
        detail: err instanceof Error ? err.message : String(err),
        buttons: ["OK"],
      });
    }
  }
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  pushStatusToWindow,
  getUpdateState: () => updateState,
};
