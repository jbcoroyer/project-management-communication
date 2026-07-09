-- Portail Ask externe : format du support attendu (budget/charge/priorité restent au triage).
alter table public.intake_requests
  add column if not exists support_format text not null default '';
