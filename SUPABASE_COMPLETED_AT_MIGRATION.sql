-- Horodatage du passage en colonne « Terminé » pour l’archivage auto 24h après.
-- À exécuter sur le projet Supabase après déploiement du code associé.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

COMMENT ON COLUMN public.tasks.completed_at IS
  'Rempli quand la tâche entre dans la colonne Terminé ; utilisé pour archiver 24h après.';

-- Tâches déjà en « Terminé » sans horodage : démarrer le délai à partir du déploiement (évite archivage immédiat basé sur created_at).
UPDATE public.tasks
SET completed_at = now()
WHERE column_id = 'Terminé'
  AND completed_at IS NULL
  AND (is_archived IS NULL OR is_archived = false);
