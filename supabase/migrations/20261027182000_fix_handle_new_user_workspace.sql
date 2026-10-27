-- Fix inscription : créer un espace perso (ou accepter une invite) + renseigner organization_id

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_member_id uuid;
  display text;
  job text;
  org_id uuid;
  invite_rec public.organization_invites%rowtype;
  base_slug text;
  final_slug text;
  n int := 0;
  email_norm text;
begin
  display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Utilisateur'
  );
  job := nullif(trim(new.raw_user_meta_data->>'job_title'), '');
  email_norm := lower(trim(coalesce(new.email, '')));

  select * into invite_rec
  from public.organization_invites i
  where lower(i.email) = email_norm
    and i.accepted_at is null
    and i.expires_at > now()
  order by i.created_at
  limit 1;

  if invite_rec.id is not null then
    org_id := invite_rec.organization_id;
  else
    base_slug := lower(regexp_replace(display, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then
      base_slug := 'espace';
    end if;
    final_slug := base_slug;
    while exists (select 1 from public.organizations o where o.slug = final_slug) loop
      n := n + 1;
      final_slug := base_slug || '-' || n::text;
    end loop;

    insert into public.organizations (name, slug, plan)
    values (display || ' — espace', final_slug, 'trial')
    returning id into org_id;

    perform public.seed_workspace_defaults(org_id);
  end if;

  insert into public.team_members (display_name, job_title, organization_id)
  values (display, job, org_id)
  returning id into new_member_id;

  insert into public.profiles (id, team_member_id, display_name, role, organization_id)
  values (new.id, new_member_id, display, 'user', org_id);

  insert into public.organization_members (organization_id, user_id, role)
  values (
    org_id,
    new.id,
    case
      when invite_rec.id is not null then coalesce(invite_rec.role, 'member')
      else 'owner'
    end
  )
  on conflict (organization_id, user_id) do nothing;

  if invite_rec.id is not null then
    update public.organization_invites
    set accepted_at = now()
    where id = invite_rec.id;
  end if;

  return new;
end;
$$;

alter table public.team_members
  alter column organization_id set default '00000000-0000-0000-0000-000000000001';
