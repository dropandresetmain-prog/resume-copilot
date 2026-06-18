-- Add resume draft metadata columns and indexes for generated_resume_drafts.
-- Idempotent: safe to run via `supabase db push` on fresh or partially migrated databases.

alter table public.generated_resume_drafts
  add column if not exists reference_resume_id text,
  add column if not exists input_snapshot jsonb,
  add column if not exists status text not null default 'generated',
  add column if not exists schema_version text not null default 'v1';

create index if not exists generated_resume_drafts_jd_id_idx
  on public.generated_resume_drafts(job_description_id);

create index if not exists generated_resume_drafts_status_idx
  on public.generated_resume_drafts(user_id, status);
