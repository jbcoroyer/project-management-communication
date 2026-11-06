const { app, dialog, ipcMain, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const PREFS_FILE = "startup-prefs.json";

function prefsPath() {
  return path.join(app.getPath("userData"), PREFS_FILE);
}

function readPrefs() {
  try {
    const raw = fs.readFileSync(prefsPath(), "utf8");
    const data = JSON.parse(raw);
    return {
      askedAtVersion: typeof data.askedAtVersion === "string" ? data.askedAtVersion : null,
      openAtLogin: Boolean(data.openAtLogin),
    };
  } catch {
    return { askedAtVersion: null, openAtLogin: false };
  }
}

function writePrefs(prefs) {
  try {
    fs.writeFileSync(prefsPath(), JSON.stringify(prefs, null, 2));
  } catch (err) {
    console.error("[startup] write prefs", err);
  }
}

function applyOpenAtLogin(enabled) {
  if (!app.isPackaged) {
    // En dev, on enregistre quand même l’intention locale
    const prefs = readPrefs();
    writePrefs({ ...prefs, openAtLogin: Boolean(enabled) });
    return Boolean(enabled);
  }
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    path: process.execPath,
    args: [],
  });
  const prefs = readPrefs();
  writePrefs({ ...prefs, openAtLogin: Boolean(enabled) });
  return Boolean(app.getLoginItemSettings().openAtLogin);
}

function getOpenAtLogin() {
  if (!app.isPackaged) {
    return Boolean(readPrefs().openAtLogin);
  }
  return Boolean(app.getLoginItemSettings().openAtLogin);
}

/**
 * Dialogue au premier lancement de la version courante.
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 */
async function maybeAskStartupPreference(getMainWindow) {
  if (!app.isPackaged) return;

  const version = app.getVersion();
  const prefs = readPrefs();
  // Une seule proposition (ex. premier lancement de 0.1.6) — ensuite via Réglages
  if (prefs.askedAtVersion) return;

  const win = getMainWindow?.();
  const opts = {
    type: "question",
    buttons: ["Oui, lancer au démarrage", "Non merci"],
    defaultId: 0,
    cancelId: 1,
    title: "Tuesday",
    message: "Lancer Tuesday au démarrage de Windows ?",
    detail:
      "Tuesday pourra s’ouvrir automatiquement à chaque démarrage de votre PC. Vous pourrez changer d’avis à tout moment dans Réglages.",
    noLink: true,
  };

  const result =
    win && !win.isDestroyed()
      ? await dialog.showMessageBox(win, opts)
      : await dialog.showMessageBox(opts);

  const enable = result.response === 0;
  applyOpenAtLogin(enable);
  writePrefs({
    askedAtVersion: version,
    openAtLogin: enable,
  });
}

function registerStartupIpc() {
  ipcMain.removeHandler("tuesday:startup-get");
  ipcMain.removeHandler("tuesday:startup-set");

  ipcMain.handle("tuesday:startup-get", () => ({
    openAtLogin: getOpenAtLogin(),
    askedAtVersion: readPrefs().askedAtVersion,
    version: app.getVersion(),
    isPackaged: app.isPackaged,
  }));

  ipcMain.handle("tuesday:startup-set", (_event, enabled) => {
    const openAtLogin = applyOpenAtLogin(Boolean(enabled));
    const prefs = readPrefs();
    writePrefs({
      askedAtVersion: prefs.askedAtVersion || app.getVersion(),
      openAtLogin,
    });
    // Notifie les fenêtres (réglages)
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue;
      try {
        win.webContents.send("tuesday:startup-changed", { openAtLogin });
      } catch {
        /* ignore */
      }
    }
    return { openAtLogin };
  });
}

module.exports = {
  registerStartupIpc,
  maybeAskStartupPreference,
  getOpenAtLogin,
  applyOpenAtLogin,
};
