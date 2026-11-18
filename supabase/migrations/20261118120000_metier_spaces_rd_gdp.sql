-- Espaces métier R&D + Gestion de Projet (objets dédiés).
-- Communication inchangée. Comptabilité hors scope.

-- ── Seed service Gestion de Projet ────────────────────────────────────────────
insert into public.services (organization_id, name, slug, color, sort_order)
select o.id, 'Gestion de Projet', 'gestion-de-projet', '#0f766e', 35
from public.organizations o
where not exists (
  select 1 from public.services s
  where s.organization_id = o.id and s.slug = 'gestion-de-projet'
);

-- ── R&D : projets / expériences / gates ───────────────────────────────────────
create table if not exists public.rd_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  outcome text not null default '',
  maturity text not null default 'idee'
    check (maturity in ('idee', 'lab', 'pilote', 'transfert', 'industrialisable')),
  phase text not null default 'cadrage'
    check (phase in (
      'cadrage', 'exploration', 'preuve', 'pilote', 'transfert', 'clos_succes', 'clos_tue', 'clos_park'
    )),
  risk text not null default 'moyen'
    check (risk in ('faible', 'moyen', 'eleve')),
  horizon text not null default 'moyen'
    check (horizon in ('court', 'moyen', 'long')),
  budget_days numeric,
  budget_eur numeric,
  kill_criteria text not null default '',
  lead_user_id uuid references auth.users (id) on delete set null,
  next_gate_at date,
  status text not null default 'actif'
    check (status in ('actif', 'en_pause', 'clos')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rd_projects_organization_id_idx
  on public.rd_projects (organization_id);
create index if not exists rd_projects_phase_idx
  on public.rd_projects (organization_id, phase);

create table if not exists public.rd_experiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.rd_projects (id) on delete cascade,
  title text not null,
  hypothesis text not null default '',
  protocol text not null default '',
  experience_type text not null default 'lab'
    check (experience_type in ('lab', 'terrain', 'simulation', 'bench', 'autre')),
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  resources text not null default '',
  raw_result text not null default '',
  verdict text
    check (verdict is null or verdict in ('confirme', 'infirme', 'inconclusif', 'a_refaire')),
  confidence text
    check (confidence is null or confidence in ('faible', 'moyenne', 'haute')),
  status text not null default 'a_concevoir'
    check (status in ('a_concevoir', 'planifiee', 'en_cours', 'analyse', 'cloturee')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rd_experiences_organization_id_idx
  on public.rd_experiences (organization_id);
create index if not exists rd_experiences_project_id_idx
  on public.rd_experiences (project_id);

create table if not exists public.rd_gates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.rd_projects (id) on delete cascade,
  name text not null,
  target_phase text not null default 'preuve'
    check (target_phase in (
      'cadrage', 'exploration', 'preuve', 'pilote', 'transfert', 'clos_succes', 'clos_tue', 'clos_park'
    )),
  review_date date,
  criteria text not null default '',
  decision text
    check (decision is null or decision in ('go', 'no_go', 'pivot', 'differe')),
  minutes text not null default '',
  status text not null default 'planifiee'
    check (status in ('planifiee', 'en_preparation', 'revue_tenue', 'decidee', 'suivi_actions')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rd_gates_organization_id_idx
  on public.rd_gates (organization_id);
create index if not exists rd_gates_project_id_idx
  on public.rd_gates (project_id);
create index if not exists rd_gates_review_date_idx
  on public.rd_gates (organization_id, review_date);

-- ── Gestion de Projet : projets / jalons / risques / décisions ────────────────
create table if not exists public.gdp_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  status text not null default 'brouillon'
    check (status in ('brouillon', 'qualification', 'actif', 'en_pause', 'cloture', 'archive', 'annule')),
  health text not null default 'vert'
    check (health in ('vert', 'orange', 'rouge')),
  sponsor_user_id uuid references auth.users (id) on delete set null,
  chef_user_id uuid references auth.users (id) on delete set null,
  company text not null default '',
  typology text not null default 'autre'
    check (typology in ('capex', 'process', 'si', 'organisation', 'qualite', 'autre')),
  start_date date,
  target_end_date date,
  budget_planned numeric,
  budget_spent numeric,
  objective text not null default '',
  success_indicators text not null default '',
  portfolio_priority text not null default 'moyenne'
    check (portfolio_priority in ('basse', 'moyenne', 'haute', 'critique')),
  progress_pct integer not null default 0
    check (progress_pct >= 0 and progress_pct <= 100),
  contributor_service_slugs text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gdp_projects_organization_id_idx
  on public.gdp_projects (organization_id);
create index if not exists gdp_projects_status_idx
  on public.gdp_projects (organization_id, status);

create table if not exists public.gdp_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.gdp_projects (id) on delete cascade,
  name text not null,
  due_date date,
  status text not null default 'a_venir'
    check (status in ('a_venir', 'atteint', 'manque', 'decale')),
  is_critical boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gdp_milestones_organization_id_idx
  on public.gdp_milestones (organization_id);
create index if not exists gdp_milestones_project_id_idx
  on public.gdp_milestones (project_id);

create table if not exists public.gdp_risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.gdp_projects (id) on delete cascade,
  title text not null,
  probability integer not null default 2
    check (probability between 1 and 5),
  impact integer not null default 2
    check (impact between 1 and 5),
  owner_user_id uuid references auth.users (id) on delete set null,
  mitigation_plan text not null default '',
  status text not null default 'ouvert'
    check (status in ('ouvert', 'en_mitigation', 'accepte', 'clos')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gdp_risks_organization_id_idx
  on public.gdp_risks (organization_id);
create index if not exists gdp_risks_project_id_idx
  on public.gdp_risks (project_id);

create table if not exists public.gdp_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.gdp_projects (id) on delete cascade,
  title text not null,
  decided_at date not null default (timezone('utc', now()))::date,
  decideur_user_id uuid references auth.users (id) on delete set null,
  context text not null default '',
  decision text not null default '',
  follow_up text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gdp_decisions_organization_id_idx
  on public.gdp_decisions (organization_id);
create index if not exists gdp_decisions_project_id_idx
  on public.gdp_decisions (project_id);

-- Lien optionnel tâches → projet GdP (sans casser Communication)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tasks'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'gdp_project_id'
  ) then
    alter table public.tasks
      add column gdp_project_id uuid references public.gdp_projects (id) on delete set null;
    create index if not exists tasks_gdp_project_id_idx on public.tasks (gdp_project_id);
  end if;
end $$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.rd_projects enable row level security;
alter table public.rd_experiences enable row level security;
alter table public.rd_gates enable row level security;
alter table public.gdp_projects enable row level security;
alter table public.gdp_milestones enable row level security;
alter table public.gdp_risks enable row level security;
alter table public.gdp_decisions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'rd_projects', 'rd_experiences', 'rd_gates',
    'gdp_projects', 'gdp_milestones', 'gdp_risks', 'gdp_decisions'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_member', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
      t || '_select_member', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_insert_member', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_org_member(organization_id))',
      t || '_insert_member', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_update_member', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      t || '_update_member', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_delete_member', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_org_member(organization_id))',
      t || '_delete_member', t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Boards d’exécution secondaires (pas de marketplace / packs — espaces métier dédiés)
insert into public.boards (
  organization_id, service_id, name, slug, description, icon, capabilities, is_default, sort_order
)
select
  s.organization_id,
  s.id,
  'Travail R&D',
  'travail-rd',
  'Tâches opérationnelles liées aux projets et expériences R&D',
  'flask-conical',
  jsonb_build_object(
    'columns', true,
    'custom_fields', true,
    'subtasks', true,
    'files', true,
    'calendar', true,
    'automations', false,
    'media', false
  ),
  false,
  40
from public.services s
where s.slug = 'rd'
  and not exists (
    select 1 from public.boards b
    where b.organization_id = s.organization_id and b.slug = 'travail-rd'
  );

insert into public.boards (
  organization_id, service_id, name, slug, description, icon, capabilities, is_default, sort_order
)
select
  s.organization_id,
  s.id,
  'Tâches projet',
  'taches-gdp',
  'Exécution des lots et tâches rattachés aux projets PMO',
  'clipboard-list',
  jsonb_build_object(
    'columns', true,
    'custom_fields', true,
    'subtasks', true,
    'files', true,
    'calendar', true,
    'automations', true,
    'media', false
  ),
  false,
  35
from public.services s
where s.slug = 'gestion-de-projet'
  and not exists (
    select 1 from public.boards b
    where b.organization_id = s.organization_id and b.slug = 'taches-gdp'
  );
