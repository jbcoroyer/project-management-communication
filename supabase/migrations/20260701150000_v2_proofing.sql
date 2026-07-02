-- Phase 3 V2 — Proofing créatif (épreuves, versions, annotations, chaîne d'approbation)
-- Une seule table : versions / commentaires / approbateurs stockés en JSONB.

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  company_id uuid references public.companies (id) on delete set null,
  status text not null default 'in_review',
  current_version integer not null default 1,
  visual_url text,
  versions jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  approvers jsonb not null default '[]'::jsonb
);

alter table public.proofs enable row level security;

drop policy if exists "proofs_select_authenticated" on public.proofs;
create policy "proofs_select_authenticated"
  on public.proofs for select
  to authenticated
  using (true);

drop policy if exists "proofs_insert_authenticated" on public.proofs;
create policy "proofs_insert_authenticated"
  on public.proofs for insert
  to authenticated
  with check (true);

drop policy if exists "proofs_update_authenticated" on public.proofs;
create policy "proofs_update_authenticated"
  on public.proofs for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "proofs_delete_authenticated" on public.proofs;
create policy "proofs_delete_authenticated"
  on public.proofs for delete
  to authenticated
  using (true);

create index if not exists proofs_company_idx on public.proofs (company_id);
create index if not exists proofs_status_idx on public.proofs (status);
