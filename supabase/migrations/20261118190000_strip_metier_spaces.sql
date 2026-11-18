-- Retrait des espaces métier (R&D, Gestion de Projet) et désactivation
-- des services hors cœur Communication (ADV, Export, R&D, GdP).
-- Les tables métier sont vidées / droppées ; pas de wipe remote hors migration.

-- 1. Soft-désactiver les services hors Communication
update public.services
set is_active = false
where slug in ('adv', 'export', 'rd', 'gestion-de-projet');

-- 2. Retirer le lien optionnel tâches → projet GdP
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'gdp_project_id'
  ) then
    drop index if exists public.tasks_gdp_project_id_idx;
    alter table public.tasks drop column gdp_project_id;
  end if;
end $$;

-- 3. Supprimer les boards seedés R&D / GdP (tasks.board_id → on delete set null ;
--    board_fields → on delete cascade)
delete from public.boards
where slug in ('travail-rd', 'taches-gdp');

-- 4. Drop tables métier R&D / GdP
drop table if exists public.rd_gates cascade;
drop table if exists public.rd_experiences cascade;
drop table if exists public.rd_projects cascade;
drop table if exists public.gdp_decisions cascade;
drop table if exists public.gdp_risks cascade;
drop table if exists public.gdp_milestones cascade;
drop table if exists public.gdp_projects cascade;
