-- Career Resume Copilot — Supabase schema (v0.3.0 / Supabase Foundation)
-- Run in Supabase SQL editor. Requires Supabase Auth enabled.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- resume_inventories
-- ---------------------------------------------------------------------------
create table if not exists public.resume_inventories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  schema_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resume_inventories_user_id_idx
  on public.resume_inventories(user_id);

drop trigger if exists resume_inventories_set_updated_at on public.resume_inventories;
create trigger resume_inventories_set_updated_at
before update on public.resume_inventories
for each row execute function public.set_updated_at();

alter table public.resume_inventories enable row level security;

drop policy if exists "resume_inventories_select_own" on public.resume_inventories;
create policy "resume_inventories_select_own"
on public.resume_inventories for select
using (auth.uid() = user_id);

drop policy if exists "resume_inventories_insert_own" on public.resume_inventories;
create policy "resume_inventories_insert_own"
on public.resume_inventories for insert
with check (auth.uid() = user_id);

drop policy if exists "resume_inventories_update_own" on public.resume_inventories;
create policy "resume_inventories_update_own"
on public.resume_inventories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "resume_inventories_delete_own" on public.resume_inventories;
create policy "resume_inventories_delete_own"
on public.resume_inventories for delete
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- job_descriptions
-- ---------------------------------------------------------------------------
create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  company_name text,
  role_title text,
  job_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_descriptions_user_id_idx
  on public.job_descriptions(user_id);

drop trigger if exists job_descriptions_set_updated_at on public.job_descriptions;
create trigger job_descriptions_set_updated_at
before update on public.job_descriptions
for each row execute function public.set_updated_at();

alter table public.job_descriptions enable row level security;

drop policy if exists "job_descriptions_select_own" on public.job_descriptions;
create policy "job_descriptions_select_own"
on public.job_descriptions for select
using (auth.uid() = user_id);

drop policy if exists "job_descriptions_insert_own" on public.job_descriptions;
create policy "job_descriptions_insert_own"
on public.job_descriptions for insert
with check (auth.uid() = user_id);

drop policy if exists "job_descriptions_update_own" on public.job_descriptions;
create policy "job_descriptions_update_own"
on public.job_descriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "job_descriptions_delete_own" on public.job_descriptions;
create policy "job_descriptions_delete_own"
on public.job_descriptions for delete
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- application_records (future tracker)
-- ---------------------------------------------------------------------------
create table if not exists public.application_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_description_id uuid references public.job_descriptions(id) on delete set null,
  company_name text,
  role_title text,
  job_url text,
  status text not null default 'drafting',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists application_records_user_id_idx
  on public.application_records(user_id);

drop trigger if exists application_records_set_updated_at on public.application_records;
create trigger application_records_set_updated_at
before update on public.application_records
for each row execute function public.set_updated_at();

alter table public.application_records enable row level security;

drop policy if exists "application_records_select_own" on public.application_records;
create policy "application_records_select_own"
on public.application_records for select
using (auth.uid() = user_id);

drop policy if exists "application_records_insert_own" on public.application_records;
create policy "application_records_insert_own"
on public.application_records for insert
with check (auth.uid() = user_id);

drop policy if exists "application_records_update_own" on public.application_records;
create policy "application_records_update_own"
on public.application_records for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "application_records_delete_own" on public.application_records;
create policy "application_records_delete_own"
on public.application_records for delete
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- generated_resume_drafts (future)
-- ---------------------------------------------------------------------------
create table if not exists public.generated_resume_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.application_records(id) on delete cascade,
  job_description_id uuid references public.job_descriptions(id) on delete set null,
  content jsonb not null,
  rationale jsonb,
  provider text,
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_resume_drafts_user_id_idx
  on public.generated_resume_drafts(user_id);

drop trigger if exists generated_resume_drafts_set_updated_at on public.generated_resume_drafts;
create trigger generated_resume_drafts_set_updated_at
before update on public.generated_resume_drafts
for each row execute function public.set_updated_at();

alter table public.generated_resume_drafts enable row level security;

drop policy if exists "generated_resume_drafts_select_own" on public.generated_resume_drafts;
create policy "generated_resume_drafts_select_own"
on public.generated_resume_drafts for select
using (auth.uid() = user_id);

drop policy if exists "generated_resume_drafts_insert_own" on public.generated_resume_drafts;
create policy "generated_resume_drafts_insert_own"
on public.generated_resume_drafts for insert
with check (auth.uid() = user_id);

drop policy if exists "generated_resume_drafts_update_own" on public.generated_resume_drafts;
create policy "generated_resume_drafts_update_own"
on public.generated_resume_drafts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "generated_resume_drafts_delete_own" on public.generated_resume_drafts;
create policy "generated_resume_drafts_delete_own"
on public.generated_resume_drafts for delete
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- generated_cover_letter_drafts (future)
-- ---------------------------------------------------------------------------
create table if not exists public.generated_cover_letter_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.application_records(id) on delete cascade,
  body text not null,
  rationale jsonb,
  provider text,
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_cover_letter_drafts_user_id_idx
  on public.generated_cover_letter_drafts(user_id);

drop trigger if exists generated_cover_letter_drafts_set_updated_at on public.generated_cover_letter_drafts;
create trigger generated_cover_letter_drafts_set_updated_at
before update on public.generated_cover_letter_drafts
for each row execute function public.set_updated_at();

alter table public.generated_cover_letter_drafts enable row level security;

drop policy if exists "generated_cover_letter_drafts_select_own" on public.generated_cover_letter_drafts;
create policy "generated_cover_letter_drafts_select_own"
on public.generated_cover_letter_drafts for select
using (auth.uid() = user_id);

drop policy if exists "generated_cover_letter_drafts_insert_own" on public.generated_cover_letter_drafts;
create policy "generated_cover_letter_drafts_insert_own"
on public.generated_cover_letter_drafts for insert
with check (auth.uid() = user_id);

drop policy if exists "generated_cover_letter_drafts_update_own" on public.generated_cover_letter_drafts;
create policy "generated_cover_letter_drafts_update_own"
on public.generated_cover_letter_drafts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "generated_cover_letter_drafts_delete_own" on public.generated_cover_letter_drafts;
create policy "generated_cover_letter_drafts_delete_own"
on public.generated_cover_letter_drafts for delete
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- stored_files
-- ---------------------------------------------------------------------------
create table if not exists public.stored_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.application_records(id) on delete set null,
  resume_inventory_id uuid references public.resume_inventories(id) on delete set null,
  document_type text not null,
  bucket text not null,
  storage_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  file_hash text,
  created_at timestamptz not null default now()
);

create index if not exists stored_files_user_id_idx
  on public.stored_files(user_id);

create index if not exists stored_files_file_hash_idx
  on public.stored_files(user_id, file_hash);

alter table public.stored_files enable row level security;

drop policy if exists "stored_files_select_own" on public.stored_files;
create policy "stored_files_select_own"
on public.stored_files for select
using (auth.uid() = user_id);

drop policy if exists "stored_files_insert_own" on public.stored_files;
create policy "stored_files_insert_own"
on public.stored_files for insert
with check (auth.uid() = user_id);

drop policy if exists "stored_files_update_own" on public.stored_files;
create policy "stored_files_update_own"
on public.stored_files for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "stored_files_delete_own" on public.stored_files;
create policy "stored_files_delete_own"
on public.stored_files for delete
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage buckets (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('original-resume-files', 'original-resume-files', false),
  ('generated-documents', 'generated-documents', false)
on conflict (id) do update set public = excluded.public;

-- Path convention: {userId}/{fileId}/{fileName}
-- First folder must equal auth.uid()

drop policy if exists "original_resume_files_select_own" on storage.objects;
create policy "original_resume_files_select_own"
on storage.objects for select
using (
  bucket_id = 'original-resume-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "original_resume_files_insert_own" on storage.objects;
create policy "original_resume_files_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'original-resume-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "original_resume_files_update_own" on storage.objects;
create policy "original_resume_files_update_own"
on storage.objects for update
using (
  bucket_id = 'original-resume-files'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'original-resume-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "original_resume_files_delete_own" on storage.objects;
create policy "original_resume_files_delete_own"
on storage.objects for delete
using (
  bucket_id = 'original-resume-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_documents_select_own" on storage.objects;
create policy "generated_documents_select_own"
on storage.objects for select
using (
  bucket_id = 'generated-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_documents_insert_own" on storage.objects;
create policy "generated_documents_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'generated-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_documents_update_own" on storage.objects;
create policy "generated_documents_update_own"
on storage.objects for update
using (
  bucket_id = 'generated-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'generated-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_documents_delete_own" on storage.objects;
create policy "generated_documents_delete_own"
on storage.objects for delete
using (
  bucket_id = 'generated-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
