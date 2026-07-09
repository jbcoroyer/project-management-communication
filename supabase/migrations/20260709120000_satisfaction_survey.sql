-- Questionnaire de satisfaction : dépôt public/anonyme (rôle anon),
-- lecture réservée aux membres du service Communication (profiles.team_member_id non nul).

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Version du questionnaire : permet de faire évoluer les questions sans casser l'historique.
  survey_version text not null default 'satisfaction-2026',

  -- Colonnes dénormalisées pour filtrer / agréger rapidement.
  entity text,
  service text,
  prestations text[] not null default '{}'::text[],
  satisfaction smallint,
  nps_score smallint,

  -- Réponses brutes, versionnées et évolutives.
  answers jsonb not null default '{}'::jsonb,

  -- Nom facultatif (q23) : le seul champ potentiellement nominatif.
  respondent_name text
);

create index if not exists survey_responses_created_at_idx on public.survey_responses (created_at desc);
create index if not exists survey_responses_entity_idx on public.survey_responses (entity);
create index if not exists survey_responses_version_idx on public.survey_responses (survey_version);

grant usage on schema public to anon, authenticated;
grant insert on public.survey_responses to anon;
grant select, insert on public.survey_responses to authenticated;

alter table public.survey_responses enable row level security;

-- INSERT : tout le monde peut déposer une réponse (avec le lien, sans compte).
drop policy if exists survey_responses_insert_anon on public.survey_responses;
create policy survey_responses_insert_anon
  on public.survey_responses
  for insert
  to anon
  with check (true);

drop policy if exists survey_responses_insert_authenticated on public.survey_responses;
create policy survey_responses_insert_authenticated
  on public.survey_responses
  for insert
  to authenticated
  with check (true);

-- SELECT : uniquement les membres du service Communication (rattachés à une fiche team_members).
drop policy if exists survey_responses_select_comm on public.survey_responses;
create policy survey_responses_select_comm
  on public.survey_responses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.team_member_id is not null
    )
  );
