-- Organisation événementielle : budget avancé, besoins matériel, feuille de route, métadonnées documents.

alter table public.events
  add column if not exists budget_posts jsonb not null default '{}'::jsonb,
  add column if not exists closure_recap jsonb,
  add column if not exists template_key text;

alter table public.expenses
  add column if not exists quoted_amount numeric not null default 0,
  add column if not exists committed_amount numeric not null default 0,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists expense_status text not null default 'engage',
  add column if not exists budget_post text,
  add column if not exists document_path text;

create table if not exists public.event_run_slots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  slot_date date not null,
  start_time time,
  end_time time,
  title text not null,
  notes text,
  sort_order int not null default 0
);

create index if not exists event_run_slots_event_id_idx on public.event_run_slots (event_id);

create table if not exists public.event_material_needs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  quantity_needed int not null default 1 check (quantity_needed > 0),
  quantity_fulfilled int not null default 0 check (quantity_fulfilled >= 0),
  notes text,
  unique (event_id, inventory_item_id)
);

create index if not exists event_material_needs_event_id_idx on public.event_material_needs (event_id);

create table if not exists public.event_document_meta (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null unique,
  doc_type text not null default 'autre'
    check (doc_type in ('devis', 'facture', 'brief', 'plan', 'autre')),
  expense_id uuid references public.expenses (id) on delete set null,
  title text
);

create index if not exists event_document_meta_event_id_idx on public.event_document_meta (event_id);

grant select, insert, update, delete on public.event_run_slots to authenticated;
grant select, insert, update, delete on public.event_material_needs to authenticated;
grant select, insert, update, delete on public.event_document_meta to authenticated;

alter table public.event_run_slots enable row level security;
alter table public.event_material_needs enable row level security;
alter table public.event_document_meta enable row level security;

drop policy if exists event_run_slots_all on public.event_run_slots;
create policy event_run_slots_all on public.event_run_slots for all to authenticated using (true) with check (true);

drop policy if exists event_material_needs_all on public.event_material_needs;
create policy event_material_needs_all on public.event_material_needs for all to authenticated using (true) with check (true);

drop policy if exists event_document_meta_all on public.event_document_meta;
create policy event_document_meta_all on public.event_document_meta for all to authenticated using (true) with check (true);
