-- Amorce du questionnaire interne « Fonctionnement du service Communication ».
-- La définition détaillée reste le fichier groupé (lib/survey/serviceInterne2026.ts)
-- tant qu'elle n'est pas éditée depuis l'éditeur.
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
