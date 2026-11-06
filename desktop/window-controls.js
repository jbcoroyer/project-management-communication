/**
 * Injecte la barre de titre + boutons min/max/close au style Tuesday.
 * Exécuté dans le renderer (pas de Node).
 */
(function installTuesdayWindowControls() {
  if (document.getElementById("tuesday-titlebar")) return;
  if (!window.tuesdayDesktop?.window) return;

  const bar = document.createElement("div");
  bar.id = "tuesday-titlebar";
  bar.setAttribute("aria-hidden", "false");

  const drag = document.createElement("div");
  drag.className = "tue-drag";
  drag.title = "Tuesday";
  drag.addEventListener("dblclick", () => {
    void window.tuesdayDesktop.window.toggleMaximize();
  });

  const controls = document.createElement("div");
  controls.id = "tuesday-window-controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Contrôles de fenêtre");

  const icons = {
    minimize: `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7"/></svg>`,
    maximize: `<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.75" y="2.75" width="6.5" height="6.5" rx="1.4"/></svg>`,
    restore: `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.2 3.4h4.4a1 1 0 0 1 1 1v4.4"/><rect x="2.4" y="4.6" width="5.6" height="5.6" rx="1.2"/></svg>`,
    close: `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 3.2l5.6 5.6M8.8 3.2L3.2 8.8"/></svg>`,
  };

  function makeButton(action, label, className) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = action;
    btn.setAttribute("aria-label", label);
    btn.title = label;
    if (className) btn.className = className;
    btn.innerHTML = icons[action] || "";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const api = window.tuesdayDesktop.window;
      if (action === "minimize") void api.minimize();
      else if (action === "maximize") void api.toggleMaximize();
      else if (action === "close") void api.close();
    });
    return btn;
  }

  const btnMin = makeButton("minimize", "Réduire");
  const btnMax = makeButton("maximize", "Agrandir");
  const btnClose = makeButton("close", "Fermer", "tue-close");

  async function syncMaximizeState() {
    try {
      const maximized = await window.tuesdayDesktop.window.isMaximized();
      btnMax.dataset.action = "maximize";
      btnMax.setAttribute("aria-label", maximized ? "Restaurer" : "Agrandir");
      btnMax.title = maximized ? "Restaurer" : "Agrandir";
      btnMax.innerHTML = maximized ? icons.restore : icons.maximize;
    } catch {
      /* ignore */
    }
  }

  controls.append(btnMin, btnMax, btnClose);
  bar.append(drag, controls);
  document.documentElement.appendChild(bar);

  void syncMaximizeState();
  if (typeof window.tuesdayDesktop.window.onMaximizedChange === "function") {
    window.tuesdayDesktop.window.onMaximizedChange(() => {
      void syncMaximizeState();
    });
  }
})();
