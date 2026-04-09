-- Espace événementiel : events, expenses, lien tasks / stock_movements
-- Exécuter après les migrations stock/projets existantes.

create extension if not exists "pgcrypto";

-- A. Conteneur événement
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  location text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'Brouillon',
  allocated_budget numeric(14, 2) not null default 0,
  constraint events_name_not_empty check (btrim(name) <> ''),
  constraint events_status_check check (status in ('Brouillon', 'En préparation', 'Terminé')),
  constraint events_dates_check check (end_date >= start_date),
  constraint events_budget_non_negative check (allocated_budget >= 0)
);

create index if not exists events_start_date_idx on public.events (start_date desc);
create index if not exists events_status_idx on public.events (status);

-- B. Dépenses manuelles
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  amount numeric(14, 2) not null,
  category text not null default '',
  constraint expenses_title_not_empty check (btrim(title) <> ''),
  constraint expenses_amount_non_negative check (amount >= 0)
);

create index if not exists expenses_event_id_idx on public.expenses (event_id, created_at desc);

-- C. Tâches globales : lien optionnel vers un événement
alter table public.tasks
  add column if not exists event_id uuid references public.events (id) on delete set null;

alter table public.tasks
  add column if not exists event_category text null;

create index if not exists tasks_event_id_idx on public.tasks (event_id)
  where event_id is not null;

-- D. Mouvements de stock : imputation événement + prix unitaire figé
alter table public.stock_movements
  add column if not exists event_id uuid references public.events (id) on delete set null;

alter table public.stock_movements
  add column if not exists unit_price_at_movement numeric(12, 2) null;

create index if not exists stock_movements_event_id_idx on public.stock_movements (event_id, created_at desc)
  where event_id is not null;

-- E. RPC : remplacer record_stock_movement pour accepter p_event_id et persister le prix
drop function if exists public.record_stock_movement(uuid, integer, uuid, text, text);

create or replace function public.record_stock_movement(
  p_item_id uuid,
  p_change_amount integer,
  p_project_id uuid default null,
  p_reason text default null,
  p_user_name text default null,
  p_event_id uuid default null
)
returns table (
  movement_id uuid,
  item_id uuid,
  item_name text,
  previous_quantity integer,
  new_quantity integer,
  alert_threshold integer,
  unit_price numeric,
  project_id uuid,
  project_name text,
  event_id uuid,
  event_name text,
  movement_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_item public.inventory_items%rowtype;
  next_quantity integer;
  created_movement public.stock_movements%rowtype;
  linked_project_name text;
  linked_event_name text;
  price_snapshot numeric(12, 2);
begin
  if p_change_amount = 0 then
    raise exception 'Le mouvement de stock ne peut pas être nul.';
  end if;

  select *
  into current_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Article de stock introuvable.';
  end if;

  next_quantity := current_item.quantity + p_change_amount;

  if next_quantity < 0 then
    raise exception 'Stock insuffisant. Quantité actuelle : %, variation demandée : %.',
      current_item.quantity,
      p_change_amount;
  end if;

  price_snapshot := current_item.unit_price;

  if p_project_id is not null then
    select name
    into linked_project_name
    from public.projects
    where id = p_project_id;
  end if;

  if p_event_id is not null then
    select e.name
    into linked_event_name
    from public.events e
    where e.id = p_event_id;
  end if;

  update public.inventory_items
  set quantity = next_quantity
  where id = current_item.id;

  insert into public.stock_movements (
    item_id,
    change_amount,
    new_quantity,
    project_id,
    event_id,
    reason,
    user_name,
    unit_price_at_movement
  )
  values (
    current_item.id,
    p_change_amount,
    next_quantity,
    p_project_id,
    p_event_id,
    nullif(btrim(coalesce(p_reason, '')), ''),
    coalesce(nullif(btrim(coalesce(p_user_name, '')), ''), 'Utilisateur inconnu'),
    price_snapshot
  )
  returning *
  into created_movement;

  return query
  select
    created_movement.id,
    current_item.id,
    current_item.name,
    current_item.quantity,
    created_movement.new_quantity,
    current_item.alert_threshold,
    current_item.unit_price,
    created_movement.project_id,
    linked_project_name,
    created_movement.event_id,
    linked_event_name,
    created_movement.created_at;
end;
$$;

revoke all on function public.record_stock_movement(uuid, integer, uuid, text, text, uuid) from public;
grant execute on function public.record_stock_movement(uuid, integer, uuid, text, text, uuid) to authenticated;

-- RLS
alter table public.events enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "events_select_authenticated" on public.events;
drop policy if exists "events_insert_authenticated" on public.events;
drop policy if exists "events_update_authenticated" on public.events;
drop policy if exists "events_delete_authenticated" on public.events;

create policy "events_select_authenticated"
on public.events for select to authenticated using (true);

create policy "events_insert_authenticated"
on public.events for insert to authenticated with check (auth.role() = 'authenticated');

create policy "events_update_authenticated"
on public.events for update to authenticated
using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "events_delete_authenticated"
on public.events for delete to authenticated using (auth.role() = 'authenticated');

drop policy if exists "expenses_select_authenticated" on public.expenses;
drop policy if exists "expenses_insert_authenticated" on public.expenses;
drop policy if exists "expenses_update_authenticated" on public.expenses;
drop policy if exists "expenses_delete_authenticated" on public.expenses;

create policy "expenses_select_authenticated"
on public.expenses for select to authenticated using (true);

create policy "expenses_insert_authenticated"
on public.expenses for insert to authenticated with check (auth.role() = 'authenticated');

create policy "expenses_update_authenticated"
on public.expenses for update to authenticated
using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "expenses_delete_authenticated"
on public.expenses for delete to authenticated using (auth.role() = 'authenticated');
