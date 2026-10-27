create or replace function public.add_or_invite_organization_member(
  p_org_id uuid,
  p_email text,
  p_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  email_norm text := lower(trim(p_email));
  domain text;
  target_id uuid;
  inv public.organization_invites;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_org_admin(p_org_id) then
    raise exception 'Seuls les admins de l''espace peuvent ajouter des membres';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Rôle invalide';
  end if;

  domain := split_part(email_norm, '@', 2);
  if domain is null or domain = '' or not exists (
    select 1 from public.allowed_email_domains d where d.domain = domain
  ) then
    raise exception 'Adresse réservée aux domaines autorisés';
  end if;

  select au.id into target_id
  from auth.users au
  where lower(au.email) = email_norm
  limit 1;

  if target_id is not null then
    if target_id = uid then
      raise exception 'Vous êtes déjà dans cet espace';
    end if;
    if exists (
      select 1 from public.organization_members m
      where m.organization_id = p_org_id and m.user_id = target_id
    ) then
      raise exception 'Cette personne est déjà membre de l''espace';
    end if;

    insert into public.organization_members (organization_id, user_id, role)
    values (p_org_id, target_id, p_role)
    on conflict (organization_id, user_id) do update set role = excluded.role;

    return jsonb_build_object(
      'status', 'added',
      'user_id', target_id,
      'email', email_norm,
      'role', p_role
    );
  end if;

  insert into public.organization_invites (organization_id, email, role, invited_by)
  values (p_org_id, email_norm, p_role, uid)
  returning * into inv;

  return jsonb_build_object(
    'status', 'invited',
    'invite_id', inv.id,
    'token', inv.token,
    'email', inv.email,
    'role', inv.role
  );
end;
$$;

grant execute on function public.add_or_invite_organization_member(uuid, text, text) to authenticated;
revoke execute on function public.add_or_invite_organization_member(uuid, text, text) from anon, public;
