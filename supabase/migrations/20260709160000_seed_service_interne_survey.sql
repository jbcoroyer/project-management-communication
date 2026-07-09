-- Amorce du questionnaire interne « Fonctionnement du service Communication ».
-- La définition complète est stockée en base (colonne definition JSONB).
insert into public.survey_definitions (id, version, title, description, status, definition)
values (
  'service-interne-2026',
  'service-interne-2026',
  'Questionnaire interne — Fonctionnement du service Communication',
  'Questionnaire interne (membres du service Communication) sur le fonctionnement du service.',
  'active',
  '{}'::jsonb
)
on conflict (id) do nothing;
