-- Create schema for Supabase PostgreSQL (run in SQL editor)

create extension if not exists "pgcrypto";

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text unique not null,
  email text not null,
  full_name text,
  age int,
  weight_kg float,
  height_cm float,
  gender text,
  conditions jsonb default '[]'::jsonb,
  allergies jsonb default '[]'::jsonb,
  medicines jsonb default '[]'::jsonb,
  lifestyle jsonb default '{}'::jsonb,
  family_history jsonb default '[]'::jsonb,
  locale text default 'en',
  theme text default 'system',
  large_text boolean default false,
  high_contrast boolean default false,
  health_score float,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  title text,
  kind text default 'chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  event_type text,
  title text,
  summary text,
  payload jsonb,
  severity text,
  created_at timestamptz default now()
);

create table if not exists image_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  storage_path text,
  body_region text,
  result jsonb,
  severity_score float,
  confidence float,
  created_at timestamptz default now()
);

create table if not exists report_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  storage_path text,
  report_type text,
  extracted_text text,
  analysis jsonb,
  created_at timestamptz default now()
);

create table if not exists vaccinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  name text,
  category text,
  administered_on timestamptz,
  due_on timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists lab_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  name text,
  value float,
  unit text,
  reference_low float,
  reference_high float,
  measured_at timestamptz default now(),
  notes text
);

create table if not exists mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  mood int,
  note text,
  phq9_score int,
  gad7_score int,
  created_at timestamptz default now()
);

create table if not exists water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  ml int,
  logged_at timestamptz default now()
);

create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  hours float,
  quality int,
  logged_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  action text,
  resource text,
  ip_address text,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists medication_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  medicines jsonb,
  result jsonb,
  created_at timestamptz default now()
);

-- Storage buckets (create via Supabase dashboard as well)
-- medical-images (private), medical-reports (private)

alter table user_profiles enable row level security;
create policy "Users read own profile" on user_profiles for select using (auth.uid()::text = auth_user_id);
create policy "Users update own profile" on user_profiles for update using (auth.uid()::text = auth_user_id);
