-- Moteur « tableaux sur mesure » (Phase B)
-- Le Kanban legacy devient le board par défaut ; tasks.board_id renseigné.

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  icon text,
  capabilities jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists boards_organization_id_idx on public.boards (organization_id);
create index if not exists boards_service_id_idx on public.boards (service_id);

create table if not exists public.board_fields (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null default 'text'
    check (field_type in ('text', 'number', 'date', 'select')),
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (board_id, key)
);

create index if not exists board_fields_board_id_idx on public.board_fields (board_id);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tasks'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'board_id'
  ) then
    alter table public.tasks
      add column board_id uuid references public.boards (id) on delete set null;
    create index if not exists tasks_board_id_idx on public.tasks (board_id);
  end if;
end $$;

alter table public.boards enable row level security;
alter table public.board_fields enable row level security;

drop policy if exists boards_select_member on public.boards;
create policy boards_select_member on public.boards
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists boards_insert_member on public.boards;
create policy boards_insert_member on public.boards
  for insert to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists boards_update_member on public.boards;
create policy boards_update_member on public.boards
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists boards_delete_admin on public.boards;
create policy boards_delete_admin on public.boards
  for delete to authenticated
  using (public.is_org_admin(organization_id));

drop policy if exists board_fields_select on public.board_fields;
create policy board_fields_select on public.board_fields
  for select to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_id and public.is_org_member(b.organization_id)
    )
  );

drop policy if exists board_fields_write on public.board_fields;
create policy board_fields_write on public.board_fields
  for all to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_id and public.is_org_member(b.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id and public.is_org_member(b.organization_id)
    )
  );

-- Board par défaut « Tableau » pour chaque org (capacités actuelles du Kanban)
insert into public.boards (
  organization_id, name, slug, description, icon, capabilities, is_default, sort_order
)
select
  o.id,
  'Tableau',
  'tableau',
  'Kanban et vues de travail de l’espace',
  'layout-grid',
  jsonb_build_object(
    'columns', true,
    'custom_fields', false,
    'subtasks', true,
    'files', true,
    'calendar', true,
    'automations', true,
    'media', false
  ),
  true,
  0
from public.organizations o
where not exists (
  select 1 from public.boards b
  where b.organization_id = o.id and b.is_default = true
);

-- Backfill tasks → board par défaut de l’org
update public.tasks t
set board_id = b.id
from public.boards b
where b.organization_id = t.organization_id
  and b.is_default = true
  and t.board_id is null;

-- Création d’un tableau sur mesure
create or replace function public.create_board(
  p_org_id uuid,
  p_name text,
  p_capabilities jsonb default null,
  p_service_id uuid default null,
  p_description text default null,
  p_icon text default null,
  p_fields jsonb default null
)
returns public.boards
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_name text := nullif(trim(coalesce(p_name, '')), '');
  base_slug text;
  final_slug text;
  caps jsonb;
  allowed text[] := array[
    'columns','custom_fields','subtasks','files','calendar','automations','media'
  ];
  k text;
  cleaned jsonb := '{}'::jsonb;
  row public.boards;
  field_item jsonb;
  field_key text;
  field_label text;
  field_type text;
  idx int := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_org_member(p_org_id) then
    raise exception 'Accès refusé';
  end if;
  if clean_name is null then
    raise exception 'Nom de tableau requis';
  end if;

  if p_service_id is not null and not exists (
    select 1 from public.services s
    where s.id = p_service_id and s.organization_id = p_org_id
  ) then
    raise exception 'Service invalide pour cet espace';
  end if;

  foreach k in array allowed loop
    cleaned := cleaned || jsonb_build_object(
      k,
      case
        when k = 'columns' then true
        else coalesce((p_capabilities->>k)::boolean, false)
      end
    );
  end loop;
  caps := cleaned;

  base_slug := lower(regexp_replace(
    translate(clean_name, 'àâäáãåèéêëìíîïòóôöõùúûüýÿñçÀÂÄÁÃÅÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÝŸÑÇ',
              'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC'),
    '[^a-z0-9]+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'tableau'; end if;
  base_slug := left(base_slug, 40);
  final_slug := base_slug;

  while exists (
    select 1 from public.boards b
    where b.organization_id = p_org_id and b.slug = final_slug
  ) loop
    idx := idx + 1;
    final_slug := left(base_slug, 36) || '-' || idx::text;
  end loop;

  insert into public.boards (
    organization_id, service_id, name, slug, description, icon,
    capabilities, is_default, sort_order, created_by
  )
  values (
    p_org_id, p_service_id, left(clean_name, 80), final_slug,
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_icon, '')), ''),
    caps, false,
    coalesce((select max(sort_order) + 10 from public.boards where organization_id = p_org_id), 10),
    uid
  )
  returning * into row;

  if p_fields is not null and jsonb_typeof(p_fields) = 'array' then
    idx := 0;
    for field_item in select * from jsonb_array_elements(p_fields)
    loop
      field_label := nullif(trim(coalesce(field_item->>'label', '')), '');
      if field_label is null then continue; end if;
      field_key := nullif(trim(coalesce(field_item->>'key', '')), '');
      if field_key is null then
        field_key := lower(regexp_replace(field_label, '[^a-zA-Z0-9]+', '_', 'g'));
        field_key := trim(both '_' from field_key);
      end if;
      if field_key = '' then field_key := 'champ_' || idx::text; end if;
      field_type := coalesce(nullif(field_item->>'field_type', ''), 'text');
      if field_type not in ('text', 'number', 'date', 'select') then
        field_type := 'text';
      end if;
      insert into public.board_fields (board_id, key, label, field_type, config, sort_order)
      values (
        row.id,
        left(field_key, 48),
        left(field_label, 80),
        field_type,
        coalesce(field_item->'config', '{}'::jsonb),
        idx
      )
      on conflict (board_id, key) do nothing;
      idx := idx + 1;
    end loop;
  end if;

  return row;
end;
$$;

grant execute on function public.create_board(uuid, text, jsonb, uuid, text, text, jsonb) to authenticated;
revoke execute on function public.create_board(uuid, text, jsonb, uuid, text, text, jsonb) from anon, public;
