-- V3 P0/P1 : durcissement livrables, DAM, votes idées, RETEX, domaine email.

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Domaines e-mail autorisés à s'inscrire (vide = pas de restriction DB ; l'app utilise aussi l'env).
create table if not exists public.allowed_email_domains (
  domain text primary key,
  created_at timestamptz not null default now()
);

insert into public.allowed_email_domains (domain)
values ('idena.fr')
on conflict (domain) do nothing;

alter table public.allowed_email_domains enable row level security;

drop policy if exists allowed_email_domains_select on public.allowed_email_domains;
create policy allowed_email_domains_select
  on public.allowed_email_domains for select to authenticated
  using (true);

drop policy if exists allowed_email_domains_admin on public.allowed_email_domains;
create policy allowed_email_domains_admin
  on public.allowed_email_domains for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.enforce_signup_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_domain text;
  has_rules boolean;
begin
  select exists (select 1 from public.allowed_email_domains) into has_rules;
  if not has_rules then
    return new;
  end if;
  email_domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  if email_domain = '' or not exists (
    select 1 from public.allowed_email_domains d where d.domain = email_domain
  ) then
    raise exception 'Inscription réservée aux domaines autorisés (%).', email_domain
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_email_domain on auth.users;
create trigger enforce_signup_email_domain
  before insert on auth.users
  for each row execute function public.enforce_signup_email_domain();

-- ── Livrables : unicité tâche + RLS restreint + bucket privé ─────────────────
alter table public.deliverables
  add column if not exists notes text not null default '';

create unique index if not exists deliverables_task_id_unique
  on public.deliverables (task_id)
  where task_id is not null;

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

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
where id = 'deliverables';

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

-- ── DAM (médias) ─────────────────────────────────────────────────────────────
create table if not exists public.dam_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null default '',
  asset_type text not null default 'Autre',
  tags text[] not null default '{}',
  storage_path text,
  file_name text,
  file_mime text,
  file_size_bytes integer,
  external_url text,
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists dam_assets_company_idx on public.dam_assets (company);
create index if not exists dam_assets_created_at_idx on public.dam_assets (created_at desc);

alter table public.dam_assets enable row level security;

drop policy if exists dam_assets_select on public.dam_assets;
create policy dam_assets_select
  on public.dam_assets for select to authenticated using (true);

drop policy if exists dam_assets_insert on public.dam_assets;
create policy dam_assets_insert
  on public.dam_assets for insert to authenticated
  with check (created_by is null or created_by = auth.uid());

drop policy if exists dam_assets_update on public.dam_assets;
create policy dam_assets_update
  on public.dam_assets for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists dam_assets_delete on public.dam_assets;
create policy dam_assets_delete
  on public.dam_assets for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.dam_assets to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dam-assets',
  'dam-assets',
  false,
  20971520,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/svg+xml',
    'application/pdf','video/mp4','video/webm'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists dam_assets_storage_select on storage.objects;
create policy dam_assets_storage_select
  on storage.objects for select to authenticated
  using (bucket_id = 'dam-assets');

drop policy if exists dam_assets_storage_insert on storage.objects;
create policy dam_assets_storage_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'dam-assets');

drop policy if exists dam_assets_storage_update on storage.objects;
create policy dam_assets_storage_update
  on storage.objects for update to authenticated
  using (bucket_id = 'dam-assets')
  with check (bucket_id = 'dam-assets');

drop policy if exists dam_assets_storage_delete on storage.objects;
create policy dam_assets_storage_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'dam-assets');

-- ── Votes idées (1 vote / utilisateur / idée) ────────────────────────────────
create table if not exists public.idea_votes (
  idea_id uuid not null references public.stock_ideas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create index if not exists idea_votes_idea_idx on public.idea_votes (idea_id);

alter table public.idea_votes enable row level security;

drop policy if exists idea_votes_select on public.idea_votes;
create policy idea_votes_select
  on public.idea_votes for select to authenticated using (true);

drop policy if exists idea_votes_insert on public.idea_votes;
create policy idea_votes_insert
  on public.idea_votes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists idea_votes_delete on public.idea_votes;
create policy idea_votes_delete
  on public.idea_votes for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, delete on public.idea_votes to authenticated;

-- ── RETEX événement ──────────────────────────────────────────────────────────
create table if not exists public.event_retex (
  event_id uuid primary key references public.events (id) on delete cascade,
  updated_at timestamptz not null default now(),
  highlights text not null default '',
  improvements text not null default '',
  follow_ups text not null default '',
  generated_text text not null default '',
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.event_retex enable row level security;

drop policy if exists event_retex_select on public.event_retex;
create policy event_retex_select
  on public.event_retex for select to authenticated using (true);

drop policy if exists event_retex_upsert on public.event_retex;
create policy event_retex_upsert
  on public.event_retex for insert to authenticated
  with check (true);

drop policy if exists event_retex_update on public.event_retex;
create policy event_retex_update
  on public.event_retex for update to authenticated
  using (true) with check (true);

drop policy if exists event_retex_delete on public.event_retex;
create policy event_retex_delete
  on public.event_retex for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.event_retex to authenticated;
