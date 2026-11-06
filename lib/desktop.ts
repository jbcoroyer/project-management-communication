export type DesktopUpdateStatus = {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  version?: string;
  message?: string;
};

export type TuesdayDesktopApi = {
  isDesktop: true;
  platform: string;
  getUpdateStatus: () => Promise<DesktopUpdateStatus>;
  installUpdate: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  onUpdateStatus: (handler: (status: DesktopUpdateStatus) => void) => () => void;
};

declare global {
  interface Window {
    tuesdayDesktop?: TuesdayDesktopApi;
  }
}

export function isTuesdayDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.tuesdayDesktop?.isDesktop);
}
