-- Extension portail de demandes : entité, objet, échéance obligatoire, budget et charge estimée.
alter table public.intake_requests
  add column if not exists company text not null default '',
  add column if not exists concern text not null default '',
  add column if not exists deadline date,
  add column if not exists budget text not null default '',
  add column if not exists estimated_hours numeric not null default 0;
