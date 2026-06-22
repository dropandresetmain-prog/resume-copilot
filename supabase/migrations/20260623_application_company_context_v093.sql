-- v0.9.3 — saved company context on application records

alter table public.application_records
  add column if not exists company_context jsonb,
  add column if not exists company_context_updated_at timestamptz;
