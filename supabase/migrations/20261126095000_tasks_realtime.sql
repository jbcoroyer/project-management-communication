-- Le board écoute postgres_changes sur `tasks`, mais la table n'était
-- pas dans la publication Realtime → les edits salon (assignee, etc.)
-- mettaient à jour la DB sans rafraîchir le tableau en mémoire.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;
