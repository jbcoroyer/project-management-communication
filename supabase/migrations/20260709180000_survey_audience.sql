-- Type d'audience pour différencier visuellement les questionnaires en liste.
alter table public.survey_definitions add column if not exists audience text not null default 'general';
alter table public.survey_definitions drop constraint if exists survey_definitions_audience_check;
alter table public.survey_definitions add constraint survey_definitions_audience_check check (audience in ('externe', 'interne', 'general'));

update public.survey_definitions set audience = 'externe' where id = 'satisfaction-2026';
update public.survey_definitions set audience = 'interne' where id = 'service-interne-2026';

update public.survey_definitions
set description = 'Questionnaire annuel de satisfaction du service Communication — destiné aux collaborateurs du groupe.'
where id = 'satisfaction-2026' and (description is null or description = '');
