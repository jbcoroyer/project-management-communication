-- Normalisation retroactive des noms de projets existants :
-- Premiere lettre en majuscule, reste en minuscule.
-- Ex: "SALON NOVEMBRE 2026" -> "Salon novembre 2026"
-- A executer une seule fois dans Supabase SQL Editor.

UPDATE public.tasks
SET project_name = UPPER(LEFT(TRIM(project_name), 1)) || LOWER(SUBSTRING(TRIM(project_name) FROM 2))
WHERE project_name IS NOT NULL AND project_name <> '';
