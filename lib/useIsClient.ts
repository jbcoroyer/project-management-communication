"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook minimal pour savoir si on est monté côté client (post-hydration).
 *
 * Préfère `useSyncExternalStore` au pattern `useState + useEffect(() => setMounted(true))`
 * — équivalent fonctionnellement mais sans déclencher la règle lint
 * `react-hooks/set-state-in-effect` introduite en React 19.
 *
 * Usage typique : conditionner un `createPortal(document.body, ...)`.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
