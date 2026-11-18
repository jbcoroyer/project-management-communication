-- Salons: upload documents (≤ 5 Mo) + métadonnées + lien budget.
-- Path storage: {organization_id}/{salon_id}/{uuid.ext}
-- RLS org via is_org_member sur le 1er segment du path.

alter table public.salon_documents
  add column if not exists description text not null default '',
  add column if not exists doc_kind text not null default 'autre',
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists file_mime text,
  add column if not exists file_size_bytes integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'salon_documents_doc_kind_check'
  ) then
    alter table public.salon_documents
      add constraint salon_documents_doc_kind_check
      check (doc_kind in ('devis', 'facture', 'autre'));
  end if;
end $$;

create index if not exists salon_documents_storage_path_idx
  on public.salon_documents (storage_path)
  where storage_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'salon-documents',
  'salon-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists salon_documents_storage_select on storage.objects;
create policy salon_documents_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'salon-documents'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists salon_documents_storage_insert on storage.objects;
create policy salon_documents_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'salon-documents'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists salon_documents_storage_update on storage.objects;
create policy salon_documents_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'salon-documents'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'salon-documents'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists salon_documents_storage_delete on storage.objects;
create policy salon_documents_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'salon-documents'
    and (storage.foldername(name))[1] is not null
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
