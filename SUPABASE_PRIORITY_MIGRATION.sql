-- Migration Supabase : ajout de la colonne priority à la table tasks
-- À exécuter dans l'éditeur SQL du dashboard Supabase (Table Editor > SQL Editor).

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Moyenne';

-- Contrainte optionnelle : limiter les valeurs autorisées (décommenter si souhaité)
-- ALTER TABLE tasks
-- ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('Basse', 'Moyenne', 'Haute'));

-- Mettre à jour les lignes existantes sans priority
UPDATE tasks SET priority = 'Moyenne' WHERE priority IS NULL;
