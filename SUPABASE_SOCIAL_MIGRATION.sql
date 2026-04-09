-- Module Réseaux sociaux : calendrier éditorial par entité, objectifs mensuels,
-- et champs éditoriaux détaillés (thématique, wording, metrics).
-- Exécuter dans Supabase SQL Editor.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  scheduled_at timestamptz not null,
  all_day boolean not null default true,
  status text not null,
  target_networks text[] not null default '{}',
  format text null,
  notes text null,
  drive_url text null,
  responsible_member_id uuid null references public.team_members(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete restrict,
  campaign_label text null,
  thematic text null,
  objective text null,
  wording text null,
  wording_en text null,
  visual_url text null,
  publication_status text null,
  reactions_count int null,
  engagement_rate numeric(8,2) null,
  impressions_count int null,
  followers_count int null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_status_check check (
    status in ('Idée', 'Rédaction', 'À valider', 'Planifié', 'Publié', 'Annulé')
  )
);

alter table public.social_posts add column if not exists thematic text null;
alter table public.social_posts add column if not exists objective text null;
alter table public.social_posts add column if not exists wording text null;
alter table public.social_posts add column if not exists wording_en text null;
alter table public.social_posts add column if not exists visual_url text null;
alter table public.social_posts add column if not exists publication_status text null;
alter table public.social_posts add column if not exists reactions_count int null;
alter table public.social_posts add column if not exists engagement_rate numeric(8,2) null;
alter table public.social_posts add column if not exists impressions_count int null;
alter table public.social_posts add column if not exists followers_count int null;

-- Compatibilité avec les anciennes versions qui utilisaient pillar_tags
alter table public.social_posts add column if not exists pillar_tags text[] not null default '{}';
update public.social_posts
set thematic = coalesce(thematic, nullif((pillar_tags[1])::text, ''))
where thematic is null;
alter table public.social_posts drop column if exists pillar_tags;

-- Si vous avez déjà des lignes sans company_id, rattache au 1er référentiel disponible
update public.social_posts p
set company_id = c.id
from (
  select id
  from public.companies
  order by sort_order asc nulls last, name asc
  limit 1
) c
where p.company_id is null;
alter table public.social_posts alter column company_id set not null;

create index if not exists social_posts_scheduled_at_idx on public.social_posts (scheduled_at);
create index if not exists social_posts_status_idx on public.social_posts (status);
create index if not exists social_posts_responsible_idx on public.social_posts (responsible_member_id);
create index if not exists social_posts_company_idx on public.social_posts (company_id);

drop trigger if exists social_posts_set_updated_at on public.social_posts;
create trigger social_posts_set_updated_at
before update on public.social_posts
for each row execute function public.set_updated_at();

create table if not exists public.social_monthly_targets (
  company_id uuid not null references public.companies(id) on delete cascade,
  year smallint not null,
  month smallint not null,
  target_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, year, month),
  constraint social_monthly_targets_month_check check (month between 1 and 12),
  constraint social_monthly_targets_count_check check (target_count >= 0)
);

alter table public.social_monthly_targets add column if not exists company_id uuid null references public.companies(id) on delete cascade;
update public.social_monthly_targets t
set company_id = c.id
from (
  select id
  from public.companies
  order by sort_order asc nulls last, name asc
  limit 1
) c
where t.company_id is null;
alter table public.social_monthly_targets alter column company_id set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'social_monthly_targets'
      and constraint_name = 'social_monthly_targets_pkey'
  ) then
    alter table public.social_monthly_targets drop constraint social_monthly_targets_pkey;
  end if;
exception
  when undefined_object then null;
end $$;
alter table public.social_monthly_targets add primary key (company_id, year, month);

create index if not exists social_monthly_targets_company_idx on public.social_monthly_targets (company_id, year, month);

drop trigger if exists social_monthly_targets_set_updated_at on public.social_monthly_targets;
create trigger social_monthly_targets_set_updated_at
before update on public.social_monthly_targets
for each row execute function public.set_updated_at();

alter table public.social_posts enable row level security;
alter table public.social_monthly_targets enable row level security;

drop policy if exists "social_posts_select_authenticated" on public.social_posts;
drop policy if exists "social_posts_insert_authenticated" on public.social_posts;
drop policy if exists "social_posts_update_authenticated" on public.social_posts;
drop policy if exists "social_posts_delete_authenticated" on public.social_posts;

create policy "social_posts_select_authenticated"
on public.social_posts
for select
to authenticated
using (true);

create policy "social_posts_insert_authenticated"
on public.social_posts
for insert
to authenticated
with check (true);

create policy "social_posts_update_authenticated"
on public.social_posts
for update
to authenticated
using (true)
with check (true);

create policy "social_posts_delete_authenticated"
on public.social_posts
for delete
to authenticated
using (true);

drop policy if exists "social_monthly_targets_select_authenticated" on public.social_monthly_targets;
drop policy if exists "social_monthly_targets_insert_authenticated" on public.social_monthly_targets;
drop policy if exists "social_monthly_targets_update_authenticated" on public.social_monthly_targets;
drop policy if exists "social_monthly_targets_delete_authenticated" on public.social_monthly_targets;

create policy "social_monthly_targets_select_authenticated"
on public.social_monthly_targets
for select
to authenticated
using (true);

create policy "social_monthly_targets_insert_authenticated"
on public.social_monthly_targets
for insert
to authenticated
with check (true);

create policy "social_monthly_targets_update_authenticated"
on public.social_monthly_targets
for update
to authenticated
using (true)
with check (true);

create policy "social_monthly_targets_delete_authenticated"
on public.social_monthly_targets
for delete
to authenticated
using (true);
