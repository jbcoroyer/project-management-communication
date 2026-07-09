-- Définitions de questionnaires éditables (JSONB versionné).

create table if not exists public.survey_definitions (
  id text primary key,
  version text not null,
  title text not null,
  definition jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select on public.survey_definitions to anon, authenticated;
grant insert, update on public.survey_definitions to authenticated;

alter table public.survey_definitions enable row level security;

drop policy if exists survey_definitions_select on public.survey_definitions;
create policy survey_definitions_select
  on public.survey_definitions
  for select
  to anon, authenticated
  using (true);

drop policy if exists survey_definitions_write_comm on public.survey_definitions;
create policy survey_definitions_write_comm
  on public.survey_definitions
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.team_member_id is not null
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.team_member_id is not null
    )
  );
