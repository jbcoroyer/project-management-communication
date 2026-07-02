"use client";

import { useEffect, useRef } from "react";
import { tinykeys } from "tinykeys";

export type ShortcutHandler = (event: KeyboardEvent) => void;
export type ShortcutMap = Record<string, ShortcutHandler>;

function isEditableTarget(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    node.isContentEditable === true
  );
}

/**
 * Enregistre des raccourcis clavier globaux (V2) via tinykeys.
 *
 * - Les combinaisons avec `$mod` (Ctrl/Cmd) et `Escape` restent actives même
 *   dans un champ de saisie.
 * - Les raccourcis à touche unique (C, N, S, P, /, séquences G+_) sont ignorés
 *   lorsque le focus est dans un input/textarea/select/élément éditable.
 *
 * L'ensemble des touches est supposé stable entre les rendus ; les handlers
 * sont lus via une ref pour éviter de se réabonner à chaque rendu.
 */
export function useAppShortcuts(bindings: ShortcutMap): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  const keySignature = Object.keys(bindings).sort().join("|");

  useEffect(() => {
    const keys = keySignature ? keySignature.split("|") : [];
    if (keys.length === 0) return;

    const wrapped: ShortcutMap = {};
    for (const key of keys) {
      const allowInInput = key.includes("$mod") || key === "Escape";
      wrapped[key] = (event: KeyboardEvent) => {
        if (!allowInInput && isEditableTarget(event.target)) return;
        bindingsRef.current[key]?.(event);
      };
    }

    const unsubscribe = tinykeys(window, wrapped);
    return () => unsubscribe();
  }, [keySignature]);
}
