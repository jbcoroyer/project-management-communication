-- Espaces isolés (workspaces) pour collègues @idena.fr
-- Réutilise public.organizations comme entité « espace » (déjà présente).

create extension if not exists pgcrypto;

-- Colonnes Kanban : unicité par espace (plus globale sur le nom)
alter table public.workflow_columns drop constraint if exists workflow_columns_name_key;
drop index if exists public.workflow_columns_name_key;
create unique index if not exists workflow_columns_org_name_uidx
  on public.workflow_columns (organization_id, name);

-- ── Tables membership / invites ───────────────────────────────────────────────
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);

create unique index if not exists organization_invites_pending_email_org_idx
  on public.organization_invites (organization_id, lower(email))
  where accepted_at is null;

alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

-- ── Helpers ───────────────────────────────────────────────────────────────────
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- Active space = profiles.organization_id (déjà utilisé par current_org_id)
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = p.organization_id
        and m.user_id = auth.uid()
    );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.org_role(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
revoke all on function public.current_org_id() from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_role(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.current_org_id() to authenticated;

-- ── Seed Communication + memberships ─────────────────────────────────────────
update public.organizations
set name = 'Service Communication',
    slug = 'service-communication'
where id = '00000000-0000-0000-0000-000000000001';

insert into public.organization_members (organization_id, user_id, role)
select
  coalesce(p.organization_id, '00000000-0000-0000-0000-000000000001'::uuid),
  p.id,
  case when p.role = 'admin' then 'admin' else 'member' end
from public.profiles p
on conflict (organization_id, user_id) do nothing;

update public.profiles
set organization_id = '00000000-0000-0000-0000-000000000001'
where organization_id is null
   or organization_id not in (select id from public.organizations);

-- ── Add organization_id columns ───────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'tasks',
    'events',
    'deliverables',
    'dam_assets',
    'stock_ideas',
    'stock_movements',
    'social_posts',
    'social_monthly_targets',
    'intake_requests',
    'automation_rules',
    'proofs',
    'projects',
    'team_members',
    'companies',
    'domains',
    'workflow_columns',
    'expenses',
    'event_retex',
    'event_run_slots',
    'event_material_needs',
    'event_document_meta',
    'idea_votes',
    'task_assignees',
    'linkedin_company_metrics'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      execute format(
        'alter table public.%I add column organization_id uuid references public.organizations (id)',
        t
      );
    end if;
  end loop;
end $$;

-- inventory_items déjà scoped ; s'assurer du défaut Communication
update public.inventory_items
set organization_id = '00000000-0000-0000-0000-000000000001'
where organization_id is null;

-- Backfill générique
do $$
declare
  t text;
  tables text[] := array[
    'tasks','events','deliverables','dam_assets','stock_ideas','stock_movements',
    'social_posts','social_monthly_targets','intake_requests','automation_rules',
    'proofs','projects','team_members','companies','domains','workflow_columns',
    'expenses','event_retex','event_run_slots','event_material_needs',
    'event_document_meta','idea_votes','task_assignees','linkedin_company_metrics',
    'inventory_items'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      execute format(
        'update public.%I set organization_id = %L where organization_id is null',
        t,
        '00000000-0000-0000-0000-000000000001'
      );
    end if;
  end loop;
end $$;

-- NOT NULL + index
do $$
declare
  t text;
  tables text[] := array[
    'tasks','events','deliverables','dam_assets','stock_ideas','stock_movements',
    'social_posts','social_monthly_targets','intake_requests','automation_rules',
    'proofs','projects','team_members','companies','domains','workflow_columns',
    'expenses','event_retex','event_run_slots','event_material_needs',
    'event_document_meta','idea_votes','task_assignees','inventory_items'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      execute format(
        'alter table public.%I alter column organization_id set default %L',
        t,
        '00000000-0000-0000-0000-000000000001'
      );
      begin
        execute format(
          'alter table public.%I alter column organization_id set not null',
          t
        );
      exception when others then
        raise notice 'skip NOT NULL on %: %', t, SQLERRM;
      end;
      execute format(
        'create index if not exists %I on public.%I (organization_id)',
        t || '_organization_id_idx',
        t
      );
    end if;
  end loop;
end $$;

-- ── Seed helpers for new spaces ───────────────────────────────────────────────
create or replace function public.seed_workspace_defaults(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.workflow_columns where organization_id = p_org_id limit 1) then
    return;
  end if;
  insert into public.workflow_columns (name, sort_order, is_active, organization_id)
  values
    ('À faire', 0, true, p_org_id),
    ('En cours', 1, true, p_org_id),
    ('En validation', 2, true, p_org_id),
    ('Terminé', 3, true, p_org_id);
end;
$$;

create or replace function public.create_personal_workspace(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
  base_name text;
  base_slug text;
  final_slug text;
  n int := 0;
  email text;
  display text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select au.email, pr.display_name
  into email, display
  from auth.users au
  left join public.profiles pr on pr.id = au.id
  where au.id = uid;

  base_name := coalesce(
    nullif(trim(p_name), ''),
    case when display is not null and trim(display) <> '' then trim(display) || ' — espace' end,
    split_part(coalesce(email, 'espace'), '@', 1)
  );

  base_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'espace';
  end if;
  final_slug := lower(base_slug);

  while exists (select 1 from public.organizations o where o.slug = final_slug) loop
    n := n + 1;
    final_slug := lower(base_slug) || '-' || n::text;
  end loop;

  insert into public.organizations (name, slug, plan)
  values (base_name, final_slug, 'trial')
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, uid, 'owner')
  on conflict do nothing;

  update public.profiles
  set organization_id = org_id
  where id = uid;

  perform public.seed_workspace_defaults(org_id);
  return org_id;
end;
$$;

create or replace function public.ensure_user_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
  invite_org uuid;
  user_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select m.organization_id into org_id
  from public.organization_members m
  where m.user_id = uid
  order by m.created_at
  limit 1;

  if org_id is not null then
    update public.profiles p
    set organization_id = coalesce(
      (
        select p2.organization_id
        from public.profiles p2
        where p2.id = uid
          and exists (
            select 1 from public.organization_members m2
            where m2.organization_id = p2.organization_id and m2.user_id = uid
          )
      ),
      org_id
    )
    where p.id = uid
      and (
        p.organization_id is null
        or not exists (
          select 1 from public.organization_members m3
          where m3.organization_id = p.organization_id and m3.user_id = uid
        )
      );
    return coalesce(
      (select organization_id from public.profiles where id = uid),
      org_id
    );
  end if;

  select lower(au.email) into user_email from auth.users au where au.id = uid;

  select i.organization_id into invite_org
  from public.organization_invites i
  where lower(i.email) = user_email
    and i.accepted_at is null
    and i.expires_at > now()
  order by i.created_at
  limit 1;

  if invite_org is not null then
    insert into public.organization_members (organization_id, user_id, role)
    select invite_org, uid, i.role
    from public.organization_invites i
    where i.organization_id = invite_org
      and lower(i.email) = user_email
      and i.accepted_at is null
    order by i.created_at
    limit 1
    on conflict do nothing;

    update public.organization_invites
    set accepted_at = now()
    where organization_id = invite_org
      and lower(email) = user_email
      and accepted_at is null;

    update public.profiles set organization_id = invite_org where id = uid;
    return invite_org;
  end if;

  return public.create_personal_workspace(null);
end;
$$;

create or replace function public.accept_organization_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  inv public.organization_invites%rowtype;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select lower(au.email) into user_email from auth.users au where au.id = uid;

  select * into inv
  from public.organization_invites i
  where i.token = p_token
  limit 1;

  if inv.id is null then
    raise exception 'Invitation introuvable';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Invitation déjà utilisée';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invitation expirée';
  end if;
  if lower(inv.email) <> user_email then
    raise exception 'Cette invitation est destinée à une autre adresse e-mail';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (inv.organization_id, uid, inv.role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  update public.organization_invites
  set accepted_at = now()
  where id = inv.id;

  update public.profiles
  set organization_id = inv.organization_id
  where id = uid;

  return inv.organization_id;
end;
$$;

create or replace function public.switch_organization(p_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_org_member(p_org_id) then
    raise exception 'Accès refusé à cet espace';
  end if;
  update public.profiles set organization_id = p_org_id where id = uid;
  return p_org_id;
end;
$$;

create or replace function public.create_organization_invite(
  p_org_id uuid,
  p_email text,
  p_role text default 'member'
)
returns public.organization_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  email_norm text := lower(trim(p_email));
  domain text;
  row public.organization_invites;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_org_admin(p_org_id) then
    raise exception 'Seuls les admins de l''espace peuvent inviter';
  end if;
  domain := split_part(email_norm, '@', 2);
  if domain is null or domain = '' or not exists (
    select 1 from public.allowed_email_domains d where d.domain = domain
  ) then
    raise exception 'Invitation réservée aux domaines autorisés';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Rôle invalide';
  end if;

  insert into public.organization_invites (organization_id, email, role, invited_by)
  values (p_org_id, email_norm, p_role, uid)
  returning * into row;

  return row;
end;
$$;

grant execute on function public.seed_workspace_defaults(uuid) to authenticated;
grant execute on function public.create_personal_workspace(text) to authenticated;
grant execute on function public.ensure_user_workspace() to authenticated;
grant execute on function public.accept_organization_invite(text) to authenticated;
grant execute on function public.switch_organization(uuid) to authenticated;
grant execute on function public.create_organization_invite(uuid, text, text) to authenticated;

-- ── RLS policies ──────────────────────────────────────────────────────────────
drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_member
  on public.organizations for select to authenticated
  using (public.is_org_member(id));

drop policy if exists organizations_insert_authenticated on public.organizations;
create policy organizations_insert_authenticated
  on public.organizations for insert to authenticated
  with check (true);

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin
  on public.organizations for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select
  on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists organization_members_admin_write on public.organization_members;
create policy organization_members_admin_write
  on public.organization_members for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists organization_invites_select on public.organization_invites;
create policy organization_invites_select
  on public.organization_invites for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists organization_invites_admin_write on public.organization_invites;
create policy organization_invites_admin_write
  on public.organization_invites for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Helper macro-style: replace authenticated using(true) with org membership
do $$
declare
  t text;
  tables text[] := array[
    'tasks','events','deliverables','dam_assets','stock_ideas','stock_movements',
    'social_posts','social_monthly_targets','intake_requests','automation_rules',
    'proofs','projects','team_members','companies','domains','workflow_columns',
    'inventory_items','expenses','event_retex','event_run_slots',
    'event_material_needs','event_document_meta','idea_votes'
  ];
  pol record;
begin
  foreach t in array tables loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      continue;
    end if;

    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
      t || '_select_org', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_org_member(organization_id))',
      t || '_insert_org', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      t || '_update_org', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_org_member(organization_id))',
      t || '_delete_org', t
    );
  end loop;
end $$;

-- stock_ideas : conserver insert/select anon pour le parcours public (sans org leak)
drop policy if exists stock_ideas_select_anon on public.stock_ideas;
create policy stock_ideas_select_anon
  on public.stock_ideas for select to anon
  using (organization_id = '00000000-0000-0000-0000-000000000001');

drop policy if exists stock_ideas_insert_anon on public.stock_ideas;
create policy stock_ideas_insert_anon
  on public.stock_ideas for insert to anon
  with check (organization_id = '00000000-0000-0000-0000-000000000001');

-- intake anon insert → Communication only
drop policy if exists intake_requests_anon_insert on public.intake_requests;
create policy intake_requests_anon_insert
  on public.intake_requests for insert to anon
  with check (organization_id = '00000000-0000-0000-0000-000000000001');

-- deliverables: keep owner write nuance on top of org
drop policy if exists deliverables_insert_org on public.deliverables;
create policy deliverables_insert_org
  on public.deliverables for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists deliverables_update_org on public.deliverables;
create policy deliverables_update_org
  on public.deliverables for update to authenticated
  using (
    public.is_org_member(organization_id)
    and (created_by = auth.uid() or public.is_admin() or public.is_org_admin(organization_id))
  )
  with check (
    public.is_org_member(organization_id)
    and (created_by = auth.uid() or public.is_admin() or public.is_org_admin(organization_id))
  );

drop policy if exists deliverables_delete_org on public.deliverables;
create policy deliverables_delete_org
  on public.deliverables for delete to authenticated
  using (
    public.is_org_member(organization_id)
    and (created_by = auth.uid() or public.is_admin() or public.is_org_admin(organization_id))
  );

-- Profils visibles entre collègues d'un même espace
drop policy if exists profiles_select_org_mates on public.profiles;
create policy profiles_select_org_mates
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members them
        on them.organization_id = me.organization_id
      where me.user_id = auth.uid()
        and them.user_id = profiles.id
    )
  );

drop policy if exists organization_members_select_self on public.organization_members;
create policy organization_members_select_self
  on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

-- Défaut inserts = espace actif
do $$
declare
  t text;
  tables text[] := array[
    'tasks','events','deliverables','dam_assets','stock_ideas','stock_movements',
    'social_posts','social_monthly_targets','intake_requests','automation_rules',
    'proofs','projects','team_members','companies','domains','workflow_columns',
    'expenses','event_retex','event_run_slots','event_material_needs',
    'event_document_meta','idea_votes','task_assignees','inventory_items'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      execute format(
        'alter table public.%I alter column organization_id set default public.current_org_id()',
        t
      );
    end if;
  end loop;
end $$;
