"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_UI_THEME,
  getUiTheme,
  persistUiTheme,
  readStoredUiTheme,
  UI_THEME_EVENT,
  type UiThemeId,
  type UiThemeMeta,
} from "./uiThemes";

type UiThemeContextValue = {
  themeId: UiThemeId;
  theme: UiThemeMeta;
  setThemeId: (id: UiThemeId) => void;
};

const UiThemeContext = createContext<UiThemeContextValue | null>(null);

export function UiThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<UiThemeId>(DEFAULT_UI_THEME);

  useEffect(() => {
    const stored = readStoredUiTheme();
    setThemeIdState(stored);
    persistUiTheme(stored);
    const onChange = () => setThemeIdState(readStoredUiTheme());
    window.addEventListener(UI_THEME_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(UI_THEME_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setThemeId = useCallback((id: UiThemeId) => {
    persistUiTheme(id);
    setThemeIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      theme: getUiTheme(themeId),
      setThemeId,
    }),
    [setThemeId, themeId],
  );

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>;
}

export function useUiTheme(): UiThemeContextValue {
  const ctx = useContext(UiThemeContext);
  if (!ctx) {
    throw new Error("useUiTheme must be used within UiThemeProvider");
  }
  return ctx;
}
