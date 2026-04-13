/** Évite les popups pour les changements de tâches effectués dans cet onglet. */

const TTL_MS = 8000;
const touched = new Map<string, number>();

function prune() {
  const now = Date.now();
  for (const [id, t] of touched) {
    if (now - t > TTL_MS) touched.delete(id);
  }
}

export function markTaskMutatedLocally(taskId: string | undefined | null) {
  if (!taskId) return;
  prune();
  touched.set(taskId, Date.now());
}

export function markTasksMutatedLocally(taskIds: string[]) {
  prune();
  const now = Date.now();
  for (const id of taskIds) {
    if (id) touched.set(id, now);
  }
}

export function wasTaskMutatedLocally(taskId: string | undefined | null): boolean {
  if (!taskId) return false;
  prune();
  const t = touched.get(taskId);
  if (t == null) return false;
  if (Date.now() - t > TTL_MS) {
    touched.delete(taskId);
    return false;
  }
  return true;
}
