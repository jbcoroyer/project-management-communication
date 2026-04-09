-- Ajoute la catégorie PLV et le visuel associé dans l'inventaire.

alter table public.inventory_items
  add column if not exists visual_url text null;

comment on column public.inventory_items.visual_url is 'URL publique du visuel (principalement pour les supports PLV)';

alter table public.inventory_items
  drop constraint if exists inventory_items_category_check;

alter table public.inventory_items
  add constraint inventory_items_category_check
  check (category in ('Print', 'Goodies', 'PLV'));

create index if not exists inventory_items_plv_type_idx on public.inventory_items (category, item_type)
  where category = 'PLV';

-- Bucket Storage pour les visuels PLV.
insert into storage.buckets (id, name, public)
values ('stock-plv-visuals', 'stock-plv-visuals', true)
on conflict (id) do update
set public = excluded.public;

-- Droits larges (lecture/écriture/suppression) sur ce bucket.
-- NOTE: volontairement permissif pour supprimer les blocages RLS d'upload.
drop policy if exists "plv_visuals_public_read" on storage.objects;
drop policy if exists "plv_visuals_public_insert" on storage.objects;
drop policy if exists "plv_visuals_public_update" on storage.objects;
drop policy if exists "plv_visuals_public_delete" on storage.objects;

create policy "plv_visuals_public_read"
on storage.objects
for select
to public
using (bucket_id = 'stock-plv-visuals');

create policy "plv_visuals_public_insert"
on storage.objects
for insert
to public
with check (bucket_id = 'stock-plv-visuals');

create policy "plv_visuals_public_update"
on storage.objects
for update
to public
using (bucket_id = 'stock-plv-visuals')
with check (bucket_id = 'stock-plv-visuals');

create policy "plv_visuals_public_delete"
on storage.objects
for delete
to public
using (bucket_id = 'stock-plv-visuals');
