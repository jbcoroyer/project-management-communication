-- V2 : moteur d'automatisations paramétrable + portail de demandes internes (Asks / Triage).
-- Optionnel : sans cette migration, la V2 bascule automatiquement sur un stockage local (localStorage).

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enabled boolean not null default true,
  name text not null,
  trigger_type text not null,
  trigger_params jsonb not null default '{}'::jsonb,
  action_type text not null,
  action_params jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);

create index if not exists automation_rules_sort_idx on public.automation_rules (sort_order);

create table if not exists public.intake_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text not null default '',
  requester_name text not null default '',
  requester_service text not null default '',
  priority text not null default 'Moyenne',
  status text not null default 'triage'
    check (status in ('triage', 'accepted', 'rejected')),
  suggested_domain text,
  suggested_assignee text,
  linked_task_id uuid references public.tasks (id) on delete set null,
  decided_at timestamptz
);

create index if not exists intake_requests_status_idx on public.intake_requests (status);

grant select, insert, update, delete on public.automation_rules to authenticated;
grant select, insert, update, delete on public.intake_requests to authenticated;
-- Soumission de demande possible sans authentification (formulaire interne partagé).
grant insert on public.intake_requests to anon;

alter table public.automation_rules enable row level security;
alter table public.intake_requests enable row level security;

drop policy if exists automation_rules_all on public.automation_rules;
create policy automation_rules_all on public.automation_rules for all to authenticated using (true) with check (true);

drop policy if exists intake_requests_all on public.intake_requests;
create policy intake_requests_all on public.intake_requests for all to authenticated using (true) with check (true);

drop policy if exists intake_requests_anon_insert on public.intake_requests;
create policy intake_requests_anon_insert on public.intake_requests for insert to anon with check (true);
