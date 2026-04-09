-- =============================================================
-- Migration : Table profiles (lien auth.users <-> team_members)
-- =============================================================

-- 1. Table profiles
create table if not exists public.profiles (
  id              uuid references auth.users on delete cascade primary key,
  team_member_id  uuid references public.team_members(id) on delete set null,
  display_name    text,
  created_at      timestamptz default now() not null
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

-- Chaque utilisateur ne voit et ne modifie que son propre profil
create policy "Profil : lecture propre"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profil : mise à jour propre"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Profil : insertion à la création de compte"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 3. Trigger : créer automatiquement un profil à chaque inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- Instructions post-migration
-- =============================================================
-- 1. Exécutez ce script dans l'éditeur SQL Supabase.
-- 2. Dans "Authentication > Providers > Email", activez
--    "Confirm email" si vous voulez forcer la vérification.
-- 3. Liez les comptes existants en exécutant :
--    UPDATE profiles SET team_member_id = (
--      SELECT id FROM team_members WHERE display_name = 'Prénom Nom' LIMIT 1
--    ) WHERE id = '<uuid-auth-user>';
