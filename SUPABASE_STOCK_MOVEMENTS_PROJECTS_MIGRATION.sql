-- Projets + mouvements de stock + fonction atomique d'enregistrement
-- Cette migration complète inventory_items pour la traçabilité, l'imputation projet
-- et les alertes côté application.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  status text not null default 'Actif',
  constraint projects_name_not_empty check (btrim(name) <> ''),
  constraint projects_status_check check (status in ('Actif', 'Terminé'))
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_name_idx on public.projects (name);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  change_amount integer not null,
  new_quantity integer not null,
  project_id uuid null references public.projects(id) on delete set null,
  reason text null,
  user_name text not null default '',
  constraint stock_movements_change_amount_non_zero check (change_amount <> 0),
  constraint stock_movements_new_quantity_non_negative check (new_quantity >= 0)
);

create index if not exists stock_movements_item_created_idx
  on public.stock_movements (item_id, created_at desc);

create index if not exists stock_movements_project_created_idx
  on public.stock_movements (project_id, created_at desc);

create index if not exists stock_movements_created_idx
  on public.stock_movements (created_at desc);

alter table public.projects enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "projects_select_authenticated" on public.projects;
drop policy if exists "projects_insert_authenticated" on public.projects;
drop policy if exists "projects_update_authenticated" on public.projects;
drop policy if exists "projects_delete_authenticated" on public.projects;

create policy "projects_select_authenticated"
on public.projects
for select
to authenticated
using (true);

create policy "projects_insert_authenticated"
on public.projects
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "projects_update_authenticated"
on public.projects
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "stock_movements_select_authenticated" on public.stock_movements;
drop policy if exists "stock_movements_insert_authenticated" on public.stock_movements;
drop policy if exists "stock_movements_update_authenticated" on public.stock_movements;
drop policy if exists "stock_movements_delete_authenticated" on public.stock_movements;

create policy "stock_movements_select_authenticated"
on public.stock_movements
for select
to authenticated
using (true);

create or replace function public.record_stock_movement(
  p_item_id uuid,
  p_change_amount integer,
  p_project_id uuid default null,
  p_reason text default null,
  p_user_name text default null
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

  if p_project_id is not null then
    select name
    into linked_project_name
    from public.projects
    where id = p_project_id;
  end if;

  update public.inventory_items
  set quantity = next_quantity
  where id = current_item.id;

  insert into public.stock_movements (
    item_id,
    change_amount,
    new_quantity,
    project_id,
    reason,
    user_name
  )
  values (
    current_item.id,
    p_change_amount,
    next_quantity,
    p_project_id,
    nullif(btrim(coalesce(p_reason, '')), ''),
    coalesce(nullif(btrim(coalesce(p_user_name, '')), ''), 'Utilisateur inconnu')
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
    created_movement.created_at;
end;
$$;

revoke all on function public.record_stock_movement(uuid, integer, uuid, text, text) from public;
grant execute on function public.record_stock_movement(uuid, integer, uuid, text, text) to authenticated;
