-- Migration Supabase : upload de visuels RS + temps passé
-- A exécuter dans Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- 1) Temps passé sur un post RS
alter table public.social_posts
  add column if not exists time_spent_hours numeric(8,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'social_posts_time_spent_hours_check'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      add constraint social_posts_time_spent_hours_check
      check (time_spent_hours >= 0);
  end if;
end $$;

create index if not exists social_posts_time_spent_hours_idx on public.social_posts (time_spent_hours);
create index if not exists social_posts_responsible_idx on public.social_posts (responsible_member_id);
create index if not exists social_posts_scheduled_at_idx on public.social_posts (scheduled_at);

-- 2) Bucket Storage pour les visuels des posts RS
-- Le bucket doit être public (pour affichage direct dans le calendrier).
do $$
begin
  -- Bucket : si déjà présent, c'est OK.
  begin
    insert into storage.buckets (id, name, public)
    values ('social-post-visuals', 'social-post-visuals', true)
    on conflict (id) do nothing;
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour insert dans storage.buckets (bucket social-post-visuals).';
  end;

  -- Les statements RLS/policies requièrent généralement d'etre owner de storage.objects.
  -- On les "best-effort" : si pas owner, on log et on continue.
  begin
    alter table storage.objects enable row level security;
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour activer RLS sur storage.objects. Les policies ne seront probablement pas créées.';
  end;

  begin
    drop policy if exists "social_post_visuals_public_read" on storage.objects;
    drop policy if exists "social_post_visuals_authenticated_insert" on storage.objects;
    drop policy if exists "social_post_visuals_authenticated_update" on storage.objects;
    drop policy if exists "social_post_visuals_authenticated_delete" on storage.objects;
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour drop des policies sur storage.objects.';
  end;

  begin
    create policy "social_post_visuals_public_read"
    on storage.objects
    for select
    to public
    using (bucket_id = 'social-post-visuals');

    create policy "social_post_visuals_authenticated_insert"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'social-post-visuals');

    create policy "social_post_visuals_authenticated_update"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'social-post-visuals')
    with check (bucket_id = 'social-post-visuals');

    create policy "social_post_visuals_authenticated_delete"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'social-post-visuals');
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour créer les policies sur storage.objects (bucket social-post-visuals).';
  end;
end $$;

