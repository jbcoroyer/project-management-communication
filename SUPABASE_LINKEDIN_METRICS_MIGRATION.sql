-- Historique métriques LinkedIn (abonnés) pour calculs de variations mensuelles.
-- Exécuter dans Supabase SQL Editor.

create table if not exists public.linkedin_company_metrics (
  id bigint generated always as identity primary key,
  company_slug text not null,
  source_url text not null,
  captured_date date not null default current_date,
  followers_count int not null check (followers_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_slug, captured_date)
);

create index if not exists linkedin_company_metrics_company_date_idx
on public.linkedin_company_metrics (company_slug, captured_date desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists linkedin_company_metrics_set_updated_at on public.linkedin_company_metrics;
create trigger linkedin_company_metrics_set_updated_at
before update on public.linkedin_company_metrics
for each row execute function public.set_updated_at();

alter table public.linkedin_company_metrics enable row level security;

drop policy if exists "linkedin_company_metrics_select_authenticated" on public.linkedin_company_metrics;
drop policy if exists "linkedin_company_metrics_insert_authenticated" on public.linkedin_company_metrics;
drop policy if exists "linkedin_company_metrics_update_authenticated" on public.linkedin_company_metrics;

create policy "linkedin_company_metrics_select_authenticated"
on public.linkedin_company_metrics
for select
to authenticated
using (true);

create policy "linkedin_company_metrics_insert_authenticated"
on public.linkedin_company_metrics
for insert
to authenticated
with check (true);

create policy "linkedin_company_metrics_update_authenticated"
on public.linkedin_company_metrics
for update
to authenticated
using (true)
with check (true);
