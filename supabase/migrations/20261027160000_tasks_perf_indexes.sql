-- Indexes perf sur tasks (filtres dashboard / event / archives / deadlines).
-- CONCURRENTLY impossible dans une transaction de migration Supabase → indexes classiques.

create index if not exists tasks_event_id_idx
  on public.tasks (event_id)
  where event_id is not null;

create index if not exists tasks_is_archived_created_at_idx
  on public.tasks (is_archived, created_at);

create index if not exists tasks_deadline_active_idx
  on public.tasks (deadline)
  where deadline is not null and is_archived = false;

create index if not exists tasks_parent_task_id_idx
  on public.tasks (parent_task_id)
  where parent_task_id is not null;

create index if not exists tasks_column_archived_idx
  on public.tasks (column_id, is_archived);
