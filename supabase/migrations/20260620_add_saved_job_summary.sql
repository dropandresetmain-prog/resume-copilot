alter table public.job_descriptions
  add column if not exists summary text;
