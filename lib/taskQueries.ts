/** Sélection Supabase des tâches avec le nom du salon (jointure `events`). */
export const TASK_SELECT_WITH_EVENT = `
  id,
  project_name,
  company,
  domain,
  admin,
  is_client_request,
  client_name,
  request_date,
  deadline,
  budget,
  description,
  column_id,
  priority,
  projected_work,
  elapsed_ms,
  is_running,
  last_start_time_ms,
  is_archived,
  estimated_hours,
  estimated_days,
  created_at,
  completed_at,
  parent_task_id,
  event_id,
  event_category,
  events (
    name
  )
`;
