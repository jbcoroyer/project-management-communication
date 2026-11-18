-- Espace Salons v1 (remplace UX Events) — checklist, docs, budget, contacts.
-- Modes A (standiste) / B (Pavillon France) / C (direct orga).

create table if not exists public.salons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('A', 'B', 'C')),
  status text not null default 'preparation'
    check (status in ('preparation', 'en_cours', 'termine')),
  location text not null default '',
  start_date date not null,
  end_date date not null,
  hall text not null default '',
  stand_number text not null default '',
  surface_m2 numeric,
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salons_organization_id_idx on public.salons (organization_id);
create index if not exists salons_org_start_idx on public.salons (organization_id, start_date);

create table if not exists public.salon_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  label text not null,
  due_date date,
  done boolean not null default false,
  sort_order int not null default 0,
  document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salon_checklist_items_salon_id_idx
  on public.salon_checklist_items (salon_id);
create index if not exists salon_checklist_items_org_due_idx
  on public.salon_checklist_items (organization_id, due_date)
  where done = false;

create table if not exists public.salon_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  category text not null
    check (category in (
      'orga', 'business_france', 'standiste', 'kit_local',
      'visuels', 'badges', 'travel', 'portails', 'autre'
    )),
  title text not null,
  url text not null default '',
  amount_ht numeric,
  amount_ttc numeric,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salon_documents_salon_id_idx on public.salon_documents (salon_id);

alter table public.salon_checklist_items
  drop constraint if exists salon_checklist_items_document_id_fkey;
alter table public.salon_checklist_items
  add constraint salon_checklist_items_document_id_fkey
  foreign key (document_id) references public.salon_documents (id) on delete set null;

create table if not exists public.salon_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  label text not null,
  value text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists salon_contacts_salon_id_idx on public.salon_contacts (salon_id);

create table if not exists public.salon_budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  label text not null,
  category text not null default 'autre',
  amount_ht numeric not null default 0,
  amount_ttc numeric not null default 0,
  due_date date,
  paid boolean not null default false,
  document_id uuid references public.salon_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salon_budget_lines_salon_id_idx on public.salon_budget_lines (salon_id);

grant select, insert, update, delete on public.salons to authenticated;
grant select, insert, update, delete on public.salon_checklist_items to authenticated;
grant select, insert, update, delete on public.salon_documents to authenticated;
grant select, insert, update, delete on public.salon_contacts to authenticated;
grant select, insert, update, delete on public.salon_budget_lines to authenticated;

alter table public.salons enable row level security;
alter table public.salon_checklist_items enable row level security;
alter table public.salon_documents enable row level security;
alter table public.salon_contacts enable row level security;
alter table public.salon_budget_lines enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'salons',
    'salon_checklist_items',
    'salon_documents',
    'salon_contacts',
    'salon_budget_lines'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
      t || '_select', t
    );
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_insert', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_org_member(organization_id))',
      t || '_insert', t
    );
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_update', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      t || '_update', t
    );
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_delete', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_org_member(organization_id))',
      t || '_delete', t
    );
  end loop;
end $$;
