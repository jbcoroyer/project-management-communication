"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type V2ShellSlotsContextValue = {
  toolbarRight: ReactNode | null;
  searchSlot: ReactNode | null;
  setToolbarRight: (node: ReactNode | null) => void;
  setSearchSlot: (node: ReactNode | null) => void;
};

const V2ShellSlotsContext = createContext<V2ShellSlotsContextValue | null>(null);

export function V2ShellSlotsProvider({ children }: { children: ReactNode }) {
  const [toolbarRight, setToolbarRightState] = useState<ReactNode | null>(null);
  const [searchSlot, setSearchSlotState] = useState<ReactNode | null>(null);

  const setToolbarRight = useCallback((node: ReactNode | null) => {
    setToolbarRightState(node);
  }, []);

  const setSearchSlot = useCallback((node: ReactNode | null) => {
    setSearchSlotState(node);
  }, []);

  const value = useMemo(
    () => ({
      toolbarRight,
      searchSlot,
      setToolbarRight,
      setSearchSlot,
    }),
    [toolbarRight, searchSlot, setToolbarRight, setSearchSlot],
  );

  return <V2ShellSlotsContext.Provider value={value}>{children}</V2ShellSlotsContext.Provider>;
}

export function useV2ShellSlots(): V2ShellSlotsContextValue {
  const ctx = useContext(V2ShellSlotsContext);
  if (!ctx) {
    throw new Error("useV2ShellSlots doit être utilisé sous V2ShellSlotsProvider.");
  }
  return ctx;
}

/** Injecte des éléments dans la barre d'outils du shell persistant (nettoyage automatique au démontage). */
export function V2ShellSlotSetter(props: {
  toolbarRight?: ReactNode;
  searchSlot?: ReactNode;
}) {
  const { toolbarRight, searchSlot } = props;
  const { setToolbarRight, setSearchSlot } = useV2ShellSlots();

  useLayoutEffect(() => {
    setSearchSlot(searchSlot ?? null);
    setToolbarRight(toolbarRight ?? null);
    return () => {
      setSearchSlot(null);
      setToolbarRight(null);
    };
  }, [searchSlot, toolbarRight, setSearchSlot, setToolbarRight]);

  return null;
}
