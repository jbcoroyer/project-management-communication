-- Cleanup sûr (hors workspaces) : index dupliqué + FK manquants + revoke triggers

-- 1) Index dupliqué sur tasks.parent_task_id (garder idx_tasks_parent)
drop index if exists public.tasks_parent_task_id_idx;

-- 2) Indexes FK manquants (advisors performance)
create index if not exists dam_assets_created_by_idx on public.dam_assets (created_by);
create index if not exists event_document_meta_expense_id_idx on public.event_document_meta (expense_id);
create index if not exists event_material_needs_inventory_item_id_idx on public.event_material_needs (inventory_item_id);
create index if not exists event_retex_updated_by_idx on public.event_retex (updated_by);
create index if not exists idea_votes_user_id_idx on public.idea_votes (user_id);
create index if not exists intake_requests_linked_task_id_idx on public.intake_requests (linked_task_id);
create index if not exists outlook_calendar_events_task_id_idx on public.outlook_calendar_events (task_id);

-- 3) Fonctions trigger-only : ne doivent pas être appelables via RPC REST
revoke execute on function public.enforce_row_organization_id() from public, anon, authenticated;
revoke execute on function public.enforce_signup_email_domain() from public, anon, authenticated;

-- is_admin / current_org_id restent utilisables en RLS pour authenticated ;
-- retirer seulement anon (pas utile pour policies authentifiées)
revoke execute on function public.current_org_id() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from public;
