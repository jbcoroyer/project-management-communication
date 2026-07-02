-- Synchronisation agenda Outlook 365 (Microsoft Graph), par utilisateur.
-- Ces tables contiennent des secrets (jetons OAuth) : elles ne doivent JAMAIS
-- être exposées au client. Accès uniquement via la clé service_role (admin)
-- côté serveur. Le RLS est activé SANS aucune policy → la clé anon/authenticated
-- ne peut lire/écrire aucune ligne.

create table if not exists public.outlook_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ms_user_id text,
  account_email text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outlook_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  -- clé d'occurrence dérivée d'un item projected_work : "date|startTime|endTime"
  occurrence_key text not null,
  outlook_event_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_id, occurrence_key)
);

create index if not exists outlook_calendar_events_user_task_idx
  on public.outlook_calendar_events (user_id, task_id);

alter table public.outlook_connections enable row level security;
alter table public.outlook_calendar_events enable row level security;
-- Volontairement aucune policy : accès serveur uniquement (service_role).
