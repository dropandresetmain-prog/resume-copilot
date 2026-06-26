-- Profiles table for onboarding data
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  target_role text,
  seniority   text,
  vault_method text,           -- 'upload' | 'linkedin' | 'scratch'
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can only read/write their own profile
create policy "profiles: own row read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own row write"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id);
