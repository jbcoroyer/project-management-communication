-- Logos personnalisés par salon (upload depuis le dashboard).
-- Path storage: {organization_id}/{salon_id}/{uuid.ext}
-- Bucket public pour affichage immédiat (comme company-logos / member-avatars).

alter table public.salons
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'salon-logos',
  'salon-logos',
  true,
  2097152,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists salon_logos_storage_select on storage.objects;
create policy salon_logos_storage_select
  on storage.objects for select to public
  using (bucket_id = 'salon-logos');

drop policy if exists salon_logos_storage_insert on storage.objects;
create policy salon_logos_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'salon-logos'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists salon_logos_storage_update on storage.objects;
create policy salon_logos_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'salon-logos'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'salon-logos'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists salon_logos_storage_delete on storage.objects;
create policy salon_logos_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'salon-logos'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
