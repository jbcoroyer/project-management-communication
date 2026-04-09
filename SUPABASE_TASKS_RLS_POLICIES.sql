-- Policies RLS pour la table tasks — accès réservé aux utilisateurs authentifiés.
-- L’app impose la connexion via middleware ; la clé anon ne doit plus suffire à lire/écrire les tâches.
-- Réappliquer après changement de schéma si besoin.

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_public" on public.tasks;
drop policy if exists "tasks_insert_public" on public.tasks;
drop policy if exists "tasks_update_public" on public.tasks;
drop policy if exists "tasks_delete_public" on public.tasks;
drop policy if exists "tasks_select_authenticated" on public.tasks;
drop policy if exists "tasks_insert_authenticated" on public.tasks;
drop policy if exists "tasks_update_authenticated" on public.tasks;
drop policy if exists "tasks_delete_authenticated" on public.tasks;

create policy "tasks_select_authenticated"
on public.tasks
for select
to authenticated
using (true);

create policy "tasks_insert_authenticated"
on public.tasks
for insert
to authenticated
with check (true);

create policy "tasks_update_authenticated"
on public.tasks
for update
to authenticated
using (true)
with check (true);

create policy "tasks_delete_authenticated"
on public.tasks
for delete
to authenticated
using (true);
