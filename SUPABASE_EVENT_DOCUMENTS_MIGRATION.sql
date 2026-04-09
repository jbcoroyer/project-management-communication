-- Bucket de documents liés aux événements (devis / factures)
-- Exécuter dans Supabase SQL Editor avec un rôle ayant les droits storage.

do $$
begin
  begin
    insert into storage.buckets (id, name, public)
    values ('event-documents', 'event-documents', true)
    on conflict (id) do nothing;
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour créer le bucket event-documents.';
  end;

  begin
    alter table storage.objects enable row level security;
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour activer RLS sur storage.objects.';
  end;

  begin
    drop policy if exists "event_documents_public_read" on storage.objects;
    drop policy if exists "event_documents_authenticated_insert" on storage.objects;
    drop policy if exists "event_documents_authenticated_update" on storage.objects;
    drop policy if exists "event_documents_authenticated_delete" on storage.objects;
  exception
    when undefined_table then
      raise notice 'Table storage.objects introuvable.';
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour supprimer les policies existantes.';
  end;

  begin
    create policy "event_documents_public_read"
    on storage.objects
    for select
    to public
    using (bucket_id = 'event-documents');

    create policy "event_documents_authenticated_insert"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'event-documents');

    create policy "event_documents_authenticated_update"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'event-documents')
    with check (bucket_id = 'event-documents');

    create policy "event_documents_authenticated_delete"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'event-documents');
  exception
    when insufficient_privilege then
      raise notice 'Pas assez de droits pour créer les policies du bucket event-documents.';
  end;
end $$;
