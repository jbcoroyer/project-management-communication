-- Lier salons ↔ tableaux (tasks) + catalogue + sync checklist → tâches / agenda.

alter table public.salons
  add column if not exists catalog_slug text;

create index if not exists salons_catalog_slug_idx
  on public.salons (organization_id, catalog_slug)
  where catalog_slug is not null;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tasks'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'salon_id'
  ) then
    alter table public.tasks
      add column salon_id uuid references public.salons (id) on delete set null;
    create index if not exists tasks_salon_id_idx
      on public.tasks (salon_id)
      where salon_id is not null;
  end if;
end $$;

alter table public.salon_checklist_items
  add column if not exists task_id uuid references public.tasks (id) on delete set null;

create index if not exists salon_checklist_items_task_id_idx
  on public.salon_checklist_items (task_id)
  where task_id is not null;
