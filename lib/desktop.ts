export type DesktopUpdateStatus = {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  version?: string;
  message?: string;
};

export type TuesdayDesktopWindowApi = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (handler: (maximized: boolean) => void) => () => void;
};

export type TuesdayDesktopStartupApi = {
  get: () => Promise<{
    openAtLogin: boolean;
    askedAtVersion: string | null;
    version: string;
    isPackaged: boolean;
  }>;
  set: (enabled: boolean) => Promise<{ openAtLogin: boolean }>;
  onChanged: (handler: (state: { openAtLogin: boolean }) => void) => () => void;
};

export type TuesdayDesktopApi = {
  isDesktop: true;
  platform: string;
  getUpdateStatus: () => Promise<DesktopUpdateStatus>;
  installUpdate: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  onUpdateStatus: (handler: (status: DesktopUpdateStatus) => void) => () => void;
  window: TuesdayDesktopWindowApi;
  startup: TuesdayDesktopStartupApi;
};

declare global {
  interface Window {
    tuesdayDesktop?: TuesdayDesktopApi;
  }
}

export function isTuesdayDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.tuesdayDesktop?.isDesktop);
}
