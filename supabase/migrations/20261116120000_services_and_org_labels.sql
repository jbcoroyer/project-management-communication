-- Services multi-métiers + libellés d’espace (Phase A modularité)
-- Un seul espace partagé ; filtrage par service (soft côté app, RLS de base ici).

-- ── org_labels ────────────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists org_labels jsonb not null default '{}'::jsonb;

-- Nom d’affichage neutre pour l’espace historique Communication
update public.organizations
set name = 'IDENA',
    slug = case when slug = 'service-communication' then 'idena' else slug end
where id = '00000000-0000-0000-0000-000000000001';

-- ── services ──────────────────────────────────────────────────────────────────
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists services_organization_id_idx
  on public.services (organization_id);

-- ── service_members ───────────────────────────────────────────────────────────
create table if not exists public.service_members (
  service_id uuid not null references public.services (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('lead', 'member')),
  created_at timestamptz not null default now(),
  primary key (service_id, user_id)
);

create index if not exists service_members_user_id_idx
  on public.service_members (user_id);

-- Rattachement optionnel des tâches à un service (filtre soft)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tasks'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'service_id'
  ) then
    alter table public.tasks
      add column service_id uuid references public.services (id) on delete set null;
    create index if not exists tasks_service_id_idx on public.tasks (service_id);
  end if;
end $$;

alter table public.services enable row level security;
alter table public.service_members enable row level security;

-- Lecture : membres de l’org
drop policy if exists services_select_member on public.services;
create policy services_select_member on public.services
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists services_write_admin on public.services;
create policy services_write_admin on public.services
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists service_members_select on public.service_members;
create policy service_members_select on public.service_members
  for select to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id
        and public.is_org_member(s.organization_id)
    )
  );

drop policy if exists service_members_write_admin on public.service_members;
create policy service_members_write_admin on public.service_members
  for all to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id
        and public.is_org_admin(s.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_id
        and public.is_org_admin(s.organization_id)
    )
  );

-- ── Seed services pour l’org IDENA (+ orgs sans services) ─────────────────────
insert into public.services (organization_id, name, slug, color, sort_order)
select o.id, v.name, v.slug, v.color, v.sort_order
from public.organizations o
cross join (
  values
    ('Communication', 'communication', '#009cdf', 10),
    ('ADV', 'adv', '#0d9488', 20),
    ('Export', 'export', '#d97706', 30),
    ('R&D', 'rd', '#7c3aed', 40)
) as v(name, slug, color, sort_order)
where not exists (
  select 1 from public.services s
  where s.organization_id = o.id and s.slug = v.slug
);

-- Rattacher tous les membres existants au service Communication de leur org
insert into public.service_members (service_id, user_id, role)
select s.id, m.user_id, 'member'
from public.organization_members m
join public.services s
  on s.organization_id = m.organization_id
 and s.slug = 'communication'
on conflict (service_id, user_id) do nothing;

-- ── Libellés d’espace ─────────────────────────────────────────────────────────
create or replace function public.save_org_labels(
  p_org_id uuid,
  p_labels jsonb
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.organizations;
  cleaned jsonb := '{}'::jsonb;
  allowed text[] := array[
    'domain', 'company', 'admin', 'column', 'task', 'board', 'service'
  ];
  k text;
  v text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_org_admin(p_org_id) then
    raise exception 'Seuls les admins peuvent modifier les libellés';
  end if;
  if p_labels is null or jsonb_typeof(p_labels) <> 'object' then
    raise exception 'Libellés invalides';
  end if;

  foreach k in array allowed loop
    v := nullif(trim(coalesce(p_labels->>k, '')), '');
    if v is not null then
      cleaned := cleaned || jsonb_build_object(k, left(v, 48));
    end if;
  end loop;

  update public.organizations
  set org_labels = cleaned
  where id = p_org_id
  returning * into row;

  if row.id is null then
    raise exception 'Espace introuvable';
  end if;
  return row;
end;
$$;

grant execute on function public.save_org_labels(uuid, jsonb) to authenticated;
revoke execute on function public.save_org_labels(uuid, jsonb) from anon, public;

-- Gestion membership service (admin org)
create or replace function public.set_service_member(
  p_service_id uuid,
  p_user_id uuid,
  p_role text default 'member',
  p_enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  role_norm text := coalesce(nullif(trim(p_role), ''), 'member');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select s.organization_id into org_id
  from public.services s
  where s.id = p_service_id;

  if org_id is null then
    raise exception 'Service introuvable';
  end if;
  if not public.is_org_admin(org_id) then
    raise exception 'Seuls les admins peuvent gérer les services';
  end if;
  if role_norm not in ('lead', 'member') then
    raise exception 'Rôle service invalide';
  end if;

  -- Le user doit être membre de l’org
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id and m.user_id = p_user_id
  ) then
    raise exception 'La personne doit d’abord être membre de l’espace';
  end if;

  if p_enabled then
    insert into public.service_members (service_id, user_id, role)
    values (p_service_id, p_user_id, role_norm)
    on conflict (service_id, user_id) do update set role = excluded.role;
  else
    delete from public.service_members
    where service_id = p_service_id and user_id = p_user_id;
  end if;
end;
$$;

grant execute on function public.set_service_member(uuid, uuid, text, boolean) to authenticated;
revoke execute on function public.set_service_member(uuid, uuid, text, boolean) from anon, public;
