-- v0.9.0 — Application Communication Profile + cover letter draft metadata

create table if not exists public.application_communication_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_communication_profiles_user_id_idx
  on public.application_communication_profiles(user_id);

drop trigger if exists application_communication_profiles_set_updated_at on public.application_communication_profiles;
create trigger application_communication_profiles_set_updated_at
before update on public.application_communication_profiles
for each row execute function public.set_updated_at();

alter table public.application_communication_profiles enable row level security;

drop policy if exists "application_communication_profiles_select_own" on public.application_communication_profiles;
create policy "application_communication_profiles_select_own"
on public.application_communication_profiles for select
using (auth.uid() = user_id);

drop policy if exists "application_communication_profiles_insert_own" on public.application_communication_profiles;
create policy "application_communication_profiles_insert_own"
on public.application_communication_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "application_communication_profiles_update_own" on public.application_communication_profiles;
create policy "application_communication_profiles_update_own"
on public.application_communication_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "application_communication_profiles_delete_own" on public.application_communication_profiles;
create policy "application_communication_profiles_delete_own"
on public.application_communication_profiles for delete
using (auth.uid() = user_id);

alter table public.generated_cover_letter_drafts
  add column if not exists job_description_id uuid references public.job_descriptions(id) on delete set null,
  add column if not exists resume_draft_id uuid references public.generated_resume_drafts(id) on delete set null,
  add column if not exists company_name text,
  add column if not exists country text,
  add column if not exists company_website text,
  add column if not exists additional_instructions text,
  add column if not exists company_context jsonb;

create index if not exists generated_cover_letter_drafts_jd_id_idx
  on public.generated_cover_letter_drafts(job_description_id);

create index if not exists generated_cover_letter_drafts_resume_draft_id_idx
  on public.generated_cover_letter_drafts(resume_draft_id);
