create or replace function public.purge_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  tables text[] := array[
    'idea_votes','event_retex','event_document_meta','event_material_needs','event_run_slots',
    'expenses','deliverables','dam_assets','proofs','task_assignees',
    'stock_movements','stock_ideas','inventory_items','social_posts','social_monthly_targets',
    'intake_requests','automation_rules','tasks','events','projects',
    'workflow_columns','domains','companies','team_members',
    'organization_invites','organization_members'
  ];
begin
  if p_org_id = '00000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'Impossible de purger le Service Communication';
  end if;

  foreach t in array tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      execute format('delete from public.%I where organization_id = $1', t) using p_org_id;
    end if;
  end loop;

  delete from public.organizations where id = p_org_id;
end;
$$;

revoke all on function public.purge_organization(uuid) from public, anon, authenticated;
grant execute on function public.purge_organization(uuid) to service_role;
