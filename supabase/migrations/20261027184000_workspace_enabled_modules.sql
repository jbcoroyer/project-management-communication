-- Modules par espace (NULL = tout activé, ex. Service Communication)
alter table public.organizations
  add column if not exists enabled_modules jsonb;

alter table public.organizations
  add column if not exists modules_configured_at timestamptz;

update public.organizations
set enabled_modules = null,
    modules_configured_at = coalesce(modules_configured_at, now())
where id = '00000000-0000-0000-0000-000000000001';

create or replace function public.save_workspace_modules(
  p_org_id uuid,
  p_modules jsonb
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.organizations;
  allowed text[] := array['tableau','livrables','events','medias','idees','stock'];
  k text;
  cleaned jsonb := '{}'::jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_org_id = '00000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'Les modules du Service Communication ne sont pas modifiables';
  end if;
  if not public.is_org_admin(p_org_id) then
    raise exception 'Seuls les admins peuvent configurer les modules';
  end if;
  if p_modules is null or jsonb_typeof(p_modules) <> 'object' then
    raise exception 'Modules invalides';
  end if;

  foreach k in array allowed loop
    cleaned := cleaned || jsonb_build_object(
      k,
      coalesce((p_modules->>k)::boolean, false)
    );
  end loop;

  update public.organizations
  set enabled_modules = cleaned,
      modules_configured_at = now()
  where id = p_org_id
  returning * into row;

  if row.id is null then
    raise exception 'Espace introuvable';
  end if;
  return row;
end;
$$;

grant execute on function public.save_workspace_modules(uuid, jsonb) to authenticated;
revoke execute on function public.save_workspace_modules(uuid, jsonb) from anon, public;
