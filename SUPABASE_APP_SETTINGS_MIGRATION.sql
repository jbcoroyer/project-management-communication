-- Paramètres globaux (pictogramme IDENA uploadé depuis l’app)
-- À exécuter dans l’éditeur SQL Supabase.

create table if not exists public.app_settings (
  id text primary key default 'default',
  idena_mark_url text,
  updated_at timestamptz default now() not null
);

insert into public.app_settings (id) values ('default')
  on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_public" on public.app_settings;
drop policy if exists "app_settings_insert_authenticated" on public.app_settings;
drop policy if exists "app_settings_update_authenticated" on public.app_settings;

-- Lecture pour la page de connexion (anon) et l’app (authenticated)
create policy "app_settings_select_public"
  on public.app_settings for select
  to anon, authenticated
  using (true);

-- Mise à jour / insertion par utilisateurs connectés (paramètres)
create policy "app_settings_insert_authenticated"
  on public.app_settings for insert
  to authenticated
  with check (true);

create policy "app_settings_update_authenticated"
  on public.app_settings for update
  to authenticated
  using (true)
  with check (true);

-- Optionnel : activer Realtime pour cette table (Dashboard > Database > Replication)
-- afin que le picto se mette à jour sans recharger toutes les sessions.

-- ─── Storage : bucket public "idena-mark" + policies (requis pour l’upload) ───
-- Sans ces policies, l’erreur « new row violates row-level security policy »
-- apparaît à l’envoi du fichier (insert dans storage.objects).

do $$
begin
  begin
    insert into storage.buckets (id, name, public)
    values ('idena-mark', 'idena-mark', true)
    on conflict (id) do nothing;
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour insert dans storage.buckets (idena-mark). Créez le bucket via le dashboard.';
  end;

  begin
    alter table storage.objects enable row level security;
  exception
    when insufficient_privilege then
      raise notice 'RLS storage.objects : ignorer si déjà actif ou droits insuffisants.';
  end;

  begin
    drop policy if exists "idena_mark_public_read" on storage.objects;
    drop policy if exists "idena_mark_authenticated_insert" on storage.objects;
    drop policy if exists "idena_mark_authenticated_update" on storage.objects;
    drop policy if exists "idena_mark_authenticated_delete" on storage.objects;
  exception
    when insufficient_privilege then
      raise notice 'Drop policies idena-mark : droits insuffisants.';
  end;

  begin
    create policy "idena_mark_public_read"
      on storage.objects
      for select
      to public
      using (bucket_id = 'idena-mark');

    create policy "idena_mark_authenticated_insert"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'idena-mark');

    create policy "idena_mark_authenticated_update"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'idena-mark')
      with check (bucket_id = 'idena-mark');

    create policy "idena_mark_authenticated_delete"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'idena-mark');
  exception
    when insufficient_privilege then
      raise notice 'Création policies idena-mark impossible (droits). Utilisez le dashboard Storage > Policies.';
  end;
end $$;
