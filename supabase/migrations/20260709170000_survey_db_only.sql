-- Questionnaires : métadonnées et configuration entièrement en base (plus de fichiers TS codés en dur).

alter table public.survey_definitions add column if not exists public_path text;

update public.survey_definitions
set public_path = '/questionnaire'
where id = 'satisfaction-2026' and (public_path is null or public_path = '');

update public.survey_definitions
set public_path = '/questionnaire/f/service-interne-2026'
where id = 'service-interne-2026' and (public_path is null or public_path = '');

update public.survey_definitions
set public_path = '/questionnaire/f/' || id
where public_path is null or public_path = '';

-- Questionnaire satisfaction : entités dynamiques + colonnes indexées pour l'analyse.
update public.survey_definitions
set definition = definition
  || '{"exports":{"entityQuestionId":"q1","serviceQuestionId":"q2","prestationsQuestionId":"q4","satisfactionQuestionId":"q5","npsQuestionId":"q6","respondentNameQuestionId":"q23"}}'::jsonb
  || jsonb_build_object(
    'questions',
    (
      select jsonb_agg(
        case
          when elem->>'id' = 'q1' then elem || '{"optionsSource":"companies"}'::jsonb
          else elem
        end
        order by ord
      )
      from jsonb_array_elements(definition->'questions') with ordinality as t(elem, ord)
    )
  )
where id = 'satisfaction-2026';

-- Questionnaire interne : satisfaction globale (q21) indexée pour les KPI.
update public.survey_definitions
set definition = definition
  || '{"exports":{"satisfactionQuestionId":"q21"}}'::jsonb
where id = 'service-interne-2026';
