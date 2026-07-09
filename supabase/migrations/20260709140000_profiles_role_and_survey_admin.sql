-- Rôle applicatif : 'admin' (gestion des questionnaires) ou 'user'.
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'user'));

-- Jean-Baptiste COROYER est administrateur.
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id and lower(u.email) = 'jean-baptiste.coroyer@idena.fr';

-- Helper : l'utilisateur courant est-il admin ?
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

-- survey_responses : lecture + suppression réservées aux admins.
drop policy if exists survey_responses_select_comm on public.survey_responses;
drop policy if exists survey_responses_select_admin on public.survey_responses;
create policy survey_responses_select_admin
  on public.survey_responses
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists survey_responses_delete_admin on public.survey_responses;
create policy survey_responses_delete_admin
  on public.survey_responses
  for delete
  to authenticated
  using (public.is_admin());

grant delete on public.survey_responses to authenticated;

-- survey_definitions : écriture réservée aux admins.
drop policy if exists survey_definitions_write_comm on public.survey_definitions;
drop policy if exists survey_definitions_write_admin on public.survey_definitions;
create policy survey_definitions_write_admin
  on public.survey_definitions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
