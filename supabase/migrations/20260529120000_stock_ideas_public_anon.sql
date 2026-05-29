-- Boîte à idées : lecture et dépôt publics (rôle anon), gestion réservée aux comptes connectés.

create table if not exists public.stock_ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  category text not null check (category in ('materiel', 'process', 'communication', 'autre')),
  status text not null default 'nouveau' check (status in ('nouveau', 'etude', 'adopte', 'archive'))
);

grant usage on schema public to anon, authenticated;
grant select, insert on public.stock_ideas to anon;
grant select, insert, update, delete on public.stock_ideas to authenticated;

alter table public.stock_ideas enable row level security;

drop policy if exists stock_ideas_select_anon on public.stock_ideas;
create policy stock_ideas_select_anon
  on public.stock_ideas
  for select
  to anon
  using (true);

drop policy if exists stock_ideas_insert_anon on public.stock_ideas;
create policy stock_ideas_insert_anon
  on public.stock_ideas
  for insert
  to anon
  with check (true);

drop policy if exists stock_ideas_select_authenticated on public.stock_ideas;
create policy stock_ideas_select_authenticated
  on public.stock_ideas
  for select
  to authenticated
  using (true);

drop policy if exists stock_ideas_insert_authenticated on public.stock_ideas;
create policy stock_ideas_insert_authenticated
  on public.stock_ideas
  for insert
  to authenticated
  with check (true);

drop policy if exists stock_ideas_update_authenticated on public.stock_ideas;
create policy stock_ideas_update_authenticated
  on public.stock_ideas
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists stock_ideas_delete_authenticated on public.stock_ideas;
create policy stock_ideas_delete_authenticated
  on public.stock_ideas
  for delete
  to authenticated
  using (true);
