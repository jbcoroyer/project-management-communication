-- Gestion de stock Print / Goodies
-- Table principale : inventory_items

create extension if not exists "pgcrypto";

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null,
  item_type text not null default '',
  name text not null default '',
  quantity integer not null default 0,
  unit_price numeric(12,2) not null default 0,
  alert_threshold integer not null default 0,
  last_quote_info text null,
  constraint inventory_items_category_check check (category in ('Print', 'Goodies')),
  constraint inventory_items_quantity_check check (quantity >= 0),
  constraint inventory_items_unit_price_check check (unit_price >= 0),
  constraint inventory_items_alert_threshold_check check (alert_threshold >= 0)
);

create index if not exists inventory_items_category_idx on public.inventory_items (category);
create index if not exists inventory_items_name_idx on public.inventory_items (name);
create index if not exists inventory_items_alert_idx on public.inventory_items (category, quantity, alert_threshold);

alter table public.inventory_items enable row level security;

drop policy if exists "inventory_items_select_authenticated" on public.inventory_items;
drop policy if exists "inventory_items_insert_authenticated" on public.inventory_items;
drop policy if exists "inventory_items_update_authenticated" on public.inventory_items;
drop policy if exists "inventory_items_delete_authenticated" on public.inventory_items;

create policy "inventory_items_select_authenticated"
on public.inventory_items
for select
to authenticated
using (true);

create policy "inventory_items_insert_authenticated"
on public.inventory_items
for insert
to authenticated
with check (true);

create policy "inventory_items_update_authenticated"
on public.inventory_items
for update
to authenticated
using (true)
with check (true);

create policy "inventory_items_delete_authenticated"
on public.inventory_items
for delete
to authenticated
using (true);
