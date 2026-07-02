/** Déclenche la synchro Outlook d'une tâche côté client (best-effort). */
export async function requestOutlookSync(taskId: string, remove = false): Promise<boolean> {
  if (typeof window === "undefined" || !taskId) return false;
  try {
    const res = await fetch("/api/outlook/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, remove }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Synchronise toutes les tâches planifiées de l'utilisateur connecté vers Outlook. */
export async function requestOutlookSyncAll(): Promise<{
  ok: boolean;
  synced?: number;
  errors?: number;
  connected?: boolean;
  error?: string;
}> {
  if (typeof window === "undefined") return { ok: false, error: "Indisponible côté serveur." };
  try {
    const res = await fetch("/api/outlook/sync-all", { method: "POST" });
    const data = (await res.json()) as {
      synced?: number;
      errors?: number;
      connected?: boolean;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Échec de la synchronisation." };
    }
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Erreur réseau." };
  }
}
