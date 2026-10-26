-- Livrables centralisés (V3) — fichiers ≤ 5 Mo (images / PDF) + chemin serveur
-- Bucket privé : accès via URLs signées uniquement.

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at date not null default (timezone('utc', now()))::date,
  project_name text not null,
  company text not null default '',
  server_path text not null default '',
  file_name text,
  file_mime text,
  file_size_bytes integer,
  storage_path text,
  public_url text,
  task_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  notes text not null default ''
);

create index if not exists deliverables_completed_at_idx on public.deliverables (completed_at desc);
create index if not exists deliverables_company_idx on public.deliverables (company);
create index if not exists deliverables_task_id_idx on public.deliverables (task_id);
create unique index if not exists deliverables_task_id_unique
  on public.deliverables (task_id)
  where task_id is not null;

alter table public.deliverables enable row level security;

drop policy if exists "deliverables_select_authenticated" on public.deliverables;
create policy "deliverables_select_authenticated"
  on public.deliverables for select to authenticated
  using (true);

drop policy if exists "deliverables_insert_authenticated" on public.deliverables;
create policy "deliverables_insert_authenticated"
  on public.deliverables for insert to authenticated
  with check (created_by is null or created_by = auth.uid());

drop policy if exists "deliverables_update_authenticated" on public.deliverables;
create policy "deliverables_update_authenticated"
  on public.deliverables for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "deliverables_delete_authenticated" on public.deliverables;
create policy "deliverables_delete_authenticated"
  on public.deliverables for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.deliverables to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deliverables',
  'deliverables',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "deliverables_storage_select" on storage.objects;
create policy "deliverables_storage_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'deliverables');

drop policy if exists "deliverables_storage_insert" on storage.objects;
create policy "deliverables_storage_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'deliverables');

drop policy if exists "deliverables_storage_update" on storage.objects;
create policy "deliverables_storage_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'deliverables')
  with check (bucket_id = 'deliverables');

drop policy if exists "deliverables_storage_delete" on storage.objects;
create policy "deliverables_storage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'deliverables');
