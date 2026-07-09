-- survey_definitions devient le catalogue des questionnaires (liste pilotée par la base).
alter table public.survey_definitions add column if not exists status text not null default 'active';
alter table public.survey_definitions drop constraint if exists survey_definitions_status_check;
alter table public.survey_definitions add constraint survey_definitions_status_check check (status in ('active', 'draft'));
alter table public.survey_definitions add column if not exists created_at timestamptz not null default now();
alter table public.survey_definitions add column if not exists description text not null default '';

grant delete on public.survey_definitions to authenticated;

-- Amorce du questionnaire existant (définition complète en base, colonne definition JSONB).
insert into public.survey_definitions (id, version, title, description, status, definition)
values (
  'satisfaction-2026',
  'satisfaction-2026',
  'Questionnaire de satisfaction — Service Communication',
  'Questionnaire annuel de satisfaction du service Communication IDENA.',
  'active',
  '{}'::jsonb
)
on conflict (id) do nothing;
