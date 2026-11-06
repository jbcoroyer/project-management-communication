const {
  app,
  BrowserWindow,
  shell,
  Menu,
  nativeTheme,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const {
  setupAutoUpdater,
  checkForUpdates,
  pushStatusToWindow,
} = require("./updater");

/** URL de production (app online). Surcharge : TUESDAY_APP_URL */
const APP_URL = (
  process.env.TUESDAY_APP_URL ||
  "https://project-management-communication.vercel.app"
).replace(/\/+$/, "");

const APP_ORIGIN = new URL(APP_URL).origin;

/** Hosts d’auth / OAuth à garder dans la fenêtre (pas le navigateur système). */
const TRUSTED_HOST_SUFFIXES = [
  "vercel.app",
  "supabase.co",
  "login.microsoftonline.com",
  "login.live.com",
  "microsoftonline.com",
  "microsoft.com",
  "live.com",
  "accounts.google.com",
];

const WINDOW_STATE_FILE = "window-state.json";

/** @type {BrowserWindow | null} */
let mainWindow = null;

function iconPath() {
  const ico = path.join(__dirname, "icon.ico");
  if (fs.existsSync(ico)) return ico;
  const png = path.join(__dirname, "icon.png");
  if (fs.existsSync(png)) return png;
  return undefined;
}

function windowStatePath() {
  return path.join(app.getPath("userData"), WINDOW_STATE_FILE);
}

function loadWindowState() {
  try {
    const raw = fs.readFileSync(windowStatePath(), "utf8");
    const state = JSON.parse(raw);
    if (
      typeof state.width === "number" &&
      typeof state.height === "number" &&
      state.width >= 800 &&
      state.height >= 600
    ) {
      return state;
    }
  } catch {
    /* first launch */
  }
  return { width: 1280, height: 840 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  const state = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: win.isMaximized(),
  };
  try {
    fs.writeFileSync(windowStatePath(), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function isTrustedHost(hostname) {
  const host = hostname.toLowerCase();
  try {
    if (host === new URL(APP_ORIGIN).hostname) return true;
  } catch {
    /* ignore */
  }
  return TRUSTED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function shouldOpenExternally(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return true;
  }
  if (parsed.protocol === "mailto:" || parsed.protocol === "tel:") return true;
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
  return !isTrustedHost(parsed.hostname);
}

function offlinePageUrl() {
  return `file://${path.join(__dirname, "offline.html").replace(/\\/g, "/")}`;
}

function titleBarOverlayOptions() {
  const dark = nativeTheme.shouldUseDarkColors;
  return {
    color: dark ? "#141310" : "#F4F1EA",
    symbolColor: dark ? "#F0EBE3" : "#1A1713",
    height: 36,
  };
}

function windowBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? "#141310" : "#F4F1EA";
}

function chromeCss() {
  try {
    return fs.readFileSync(path.join(__dirname, "chrome.css"), "utf8");
  } catch {
    return "";
  }
}

async function applyDesktopChrome(win) {
  if (!win || win.isDestroyed()) return;
  if (!win.__tuesdayChromeCss) {
    const css = chromeCss();
    if (css) {
      try {
        win.__tuesdayChromeCss = await win.webContents.insertCSS(css);
      } catch {
        /* ignore */
      }
    }
  }
  try {
    await win.webContents.executeJavaScript(
      `document.documentElement.classList.add("tuesday-desktop");`,
      true,
    );
  } catch {
    /* ignore */
  }
  try {
    win.setTitleBarOverlay(titleBarOverlayOptions());
  } catch {
    /* ignore */
  }
}

function createWindow() {
  const state = loadWindowState();
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "Tuesday",
    backgroundColor: windowBackgroundColor(),
    icon: iconPath(),
    autoHideMenuBar: true,
    // Barre de titre Windows fondue dans l’UI (boutons natifs min/max/close)
    titleBarStyle: "hidden",
    titleBarOverlay: titleBarOverlayOptions(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  if (state.isMaximized) win.maximize();

  win.once("ready-to-show", () => {
    win.show();
  });

  const persist = () => saveWindowState(win);
  win.on("resize", persist);
  win.on("move", persist);
  win.on("close", persist);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (shouldOpenExternally(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        titleBarStyle: "hidden",
        titleBarOverlay: titleBarOverlayOptions(),
        backgroundColor: windowBackgroundColor(),
        icon: iconPath(),
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      },
    };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (shouldOpenExternally(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on("did-finish-load", () => {
    void applyDesktopChrome(win);
    // Ré-émet l’état MAJ après chaque navigation (SPA / reload)
    pushStatusToWindow(win);
  });

  win.webContents.on("did-fail-load", (_event, errorCode, _errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    // -3 = aborted (souvent une navigation suivante)
    if (errorCode === -3) return;
    if (validatedURL && validatedURL.startsWith("file:")) return;
    win.loadURL(offlinePageUrl());
  });

  win.loadURL(APP_URL);
  mainWindow = win;
  return win;
}

function buildMenu() {
  const template = [
    {
      label: "Tuesday",
      submenu: [
        {
          label: "Recharger",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.loadURL(APP_URL);
            }
          },
        },
        {
          label: "Ouvrir dans le navigateur",
          click: () => shell.openExternal(APP_URL),
        },
        {
          label: "Vérifier les mises à jour…",
          click: () => {
            void checkForUpdates({ manual: true });
          },
        },
        { type: "separator" },
        {
          label: "À propos",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "Tuesday",
              message: "Tuesday",
              detail: `Application bureau pour le service Communication.\n\n${APP_URL}\n\nVersion ${app.getVersion()}`,
            });
          },
        },
        { type: "separator" },
        { role: "quit", label: "Quitter" },
      ],
    },
    {
      label: "Édition",
      submenu: [
        { role: "undo", label: "Annuler" },
        { role: "redo", label: "Rétablir" },
        { type: "separator" },
        { role: "cut", label: "Couper" },
        { role: "copy", label: "Copier" },
        { role: "paste", label: "Coller" },
        { role: "selectAll", label: "Tout sélectionner" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "togglefullscreen", label: "Plein écran" },
        { role: "zoomIn", label: "Zoom +" },
        { role: "zoomOut", label: "Zoom −" },
        { role: "resetZoom", label: "Zoom normal" },
        { type: "separator" },
        { role: "toggleDevTools", label: "Outils de développement" },
      ],
    },
    {
      label: "Fenêtre",
      submenu: [
        { role: "minimize", label: "Réduire" },
        { role: "close", label: "Fermer" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("fr.idena.tuesday");
    buildMenu();
    createWindow();
    setupAutoUpdater(() => mainWindow);

    nativeTheme.on("updated", () => {
      for (const win of BrowserWindow.getAllWindows()) {
        try {
          win.setBackgroundColor(windowBackgroundColor());
          win.setTitleBarOverlay(titleBarOverlayOptions());
        } catch {
          /* ignore */
        }
      }
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
