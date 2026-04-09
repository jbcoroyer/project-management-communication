-- Migration Supabase : ajout de la colonne projected_work (JSONB) à la table tasks
-- À exécuter dans l'éditeur SQL du dashboard Supabase (SQL Editor).

-- Format attendu : [{ "date": "YYYY-MM-DD", "hours": 2 }, ...]
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS projected_work jsonb DEFAULT '[]'::jsonb;

-- Optionnel : commentaire sur la colonne
COMMENT ON COLUMN tasks.projected_work IS 'Planification du travail : tableau de { date, hours } pour la semaine en cours';
