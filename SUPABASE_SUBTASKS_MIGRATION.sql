-- Migration : ajout du support des sous-taches
-- Chaque sous-tache est une tache normale avec un parent_task_id non null.
-- La suppression du parent entraine la suppression en cascade de ses sous-taches.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid
    REFERENCES public.tasks(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent
  ON public.tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Optionnel : s'assurer que les sous-taches ne peuvent pas elles-memes avoir des enfants
-- (contrainte recommandee mais peut etre retiree si on veut plusieurs niveaux)
-- ALTER TABLE public.tasks
--   ADD CONSTRAINT no_nested_subtasks
--   CHECK (parent_task_id IS NULL OR (
--     SELECT parent_task_id FROM public.tasks t2 WHERE t2.id = parent_task_id
--   ) IS NULL);
