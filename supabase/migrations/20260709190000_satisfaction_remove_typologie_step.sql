-- Questionnaire externe satisfaction-2026 : retire l'étape 4 « Par type de prestation »
-- (questions q12–q15, conditionnelles selon les prestations cochées en q4).

update public.survey_definitions
set
  definition = jsonb_set(
    jsonb_set(
      definition,
      '{steps}',
      coalesce(
        (
          select jsonb_agg(elem order by ord)
          from jsonb_array_elements(definition->'steps') with ordinality as t(elem, ord)
          where elem->>'id' <> 'typologie'
        ),
        '[]'::jsonb
      )
    ),
    '{questions}',
    coalesce(
      (
        select jsonb_agg(elem order by ord)
        from jsonb_array_elements(definition->'questions') with ordinality as t(elem, ord)
        where elem->>'id' not in ('q12', 'q13', 'q14', 'q15')
      ),
      '[]'::jsonb
    )
  ),
  updated_at = now()
where id = 'satisfaction-2026'
  and jsonb_typeof(definition->'steps') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(definition->'steps') s
    where s->>'id' = 'typologie'
  );
