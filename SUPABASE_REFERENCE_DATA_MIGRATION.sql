-- Migration de référentiels dynamiques pour remplacer les listes hardcodées.
-- Exécuter ce script dans Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id uuid not null,
  team_member_id uuid not null,
  primary key (task_id, team_member_id)
);

alter table public.task_assignees
  add constraint task_assignees_task_fk
  foreign key (task_id) references public.tasks(id) on delete cascade;

alter table public.task_assignees
  add constraint task_assignees_team_member_fk
  foreign key (team_member_id) references public.team_members(id) on delete cascade;

alter table public.tasks add column if not exists company_id uuid null;
alter table public.tasks add column if not exists domain_id uuid null;
alter table public.tasks add column if not exists workflow_column_id uuid null;

alter table public.tasks
  add constraint tasks_company_fk
  foreign key (company_id) references public.companies(id) on delete set null;

alter table public.tasks
  add constraint tasks_domain_fk
  foreign key (domain_id) references public.domains(id) on delete set null;

alter table public.tasks
  add constraint tasks_workflow_column_fk
  foreign key (workflow_column_id) references public.workflow_columns(id) on delete set null;

insert into public.team_members (display_name, sort_order)
values
  ('Léna', 0),
  ('Romane', 1),
  ('Alexandre', 2),
  ('Jean-Baptiste', 3)
on conflict (display_name) do nothing;

insert into public.companies (name, sort_order)
values
  ('IDENA', 0),
  ('IDENA Nutricion', 1),
  ('IDENA Production', 2),
  ('IDENA Romania', 3),
  ('INDY FEED', 4),
  ('SECOPALM', 5),
  ('STI biotechnologie', 6),
  ('VERTAL', 7)
on conflict (name) do nothing;

insert into public.domains (name, color, sort_order)
values
  ('🖥️ Digitale', '#3b82f6', 0),
  ('📮 Client', '#8b5cf6', 1),
  ('🎟️ Event', '#f59e0b', 2),
  ('🌎 General', '#10b981', 3),
  ('🖨️ Print', '#ec4899', 4),
  ('📰 Presse', '#06b6d4', 5)
on conflict (name) do nothing;

insert into public.workflow_columns (name, sort_order)
values
  ('À faire', 0),
  ('En cours', 1),
  ('En validation', 2),
  ('Terminé', 3)
on conflict (name) do nothing;

update public.tasks t
set company_id = c.id
from public.companies c
where t.company is not null and c.name = t.company and t.company_id is null;

update public.tasks t
set domain_id = d.id
from public.domains d
where t.domain is not null and d.name = t.domain and t.domain_id is null;

update public.tasks t
set workflow_column_id = w.id
from public.workflow_columns w
where t.column_id is not null and w.name = t.column_id and t.workflow_column_id is null;

insert into public.task_assignees (task_id, team_member_id)
select distinct t.id, tm.id
from public.tasks t
cross join lateral regexp_split_to_table(coalesce(t.admin, ''), '\s*,\s*') as admin_name
join public.team_members tm on tm.display_name = admin_name
on conflict do nothing;
