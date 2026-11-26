-- Checklist salon : assigné (nom équipe, comme tasks.admin) + backfill depuis la tâche miroir.

alter table public.salon_checklist_items
  add column if not exists assignee text;

comment on column public.salon_checklist_items.assignee is
  'Responsable de la case (display_name team_members). Défaut = créateur du salon.';

-- Backfill depuis la tâche tableau liée quand possible.
update public.salon_checklist_items c
set assignee = nullif(trim(t.admin), '')
from public.tasks t
where c.task_id = t.id
  and (c.assignee is null or btrim(c.assignee) = '')
  and t.admin is not null
  and btrim(t.admin) <> '';

-- Sinon : créateur du salon (profiles / team_members).
update public.salon_checklist_items c
set assignee = coalesce(
  nullif(trim(tm.display_name), ''),
  nullif(trim(p.display_name), '')
)
from public.salons s
left join public.profiles p on p.id = s.created_by
left join public.team_members tm on tm.id = p.team_member_id
where c.salon_id = s.id
  and (c.assignee is null or btrim(c.assignee) = '')
  and (
    nullif(trim(tm.display_name), '') is not null
    or nullif(trim(p.display_name), '') is not null
  );
