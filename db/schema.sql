create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  create type user_role as enum ('normal', 'team_lead', 'admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type workspace_type as enum ('team', 'common');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type source_type as enum (
    'GitLab Page',
    'README',
    'Wiki',
    'Jira',
    'SharePoint',
    'PDF',
    'PPT',
    'Image',
    'Manual Note',
    'Other'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type access_scope as enum ('team', 'common', 'restricted');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type fresh_status as enum ('fresh', 'stale', 'unknown');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type job_status as enum ('queued', 'processing', 'complete', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  role user_role not null default 'normal',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  lead_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_teams (
  user_id uuid not null references users(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  is_lead boolean not null default false,
  member_title text,
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  type workspace_type not null,
  name text not null,
  description text,
  team_id uuid references teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(type, team_id)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  workspace_type workspace_type not null,
  team_id uuid references teams(id) on delete cascade,
  title text not null,
  source_type source_type not null default 'Other',
  original_source_link text,
  file_name text,
  file_path text,
  category text,
  tags text[] not null default '{}',
  access_scope access_scope not null default 'team',
  source_authority_level integer not null default 3 check (source_authority_level between 1 and 5),
  fresh_status fresh_status not null default 'unknown',
  uploaded_by uuid references users(id) on delete set null,
  uploaded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_updated_at timestamptz,
  last_indexed_at timestamptz,
  is_active boolean not null default true,
  checksum text,
  summary text,
  total_chunks integer not null default 0,
  last_error text
);

create index if not exists documents_workspace_type_idx on documents(workspace_type);
create index if not exists documents_team_id_idx on documents(team_id);
create index if not exists documents_category_idx on documents(category);
create index if not exists documents_tags_gin_idx on documents using gin(tags);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  section_heading text,
  token_count integer not null default 0,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index if not exists document_chunks_document_id_idx on document_chunks(document_id);
create index if not exists document_chunks_embedding_idx on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  job_type text not null default 'ingest',
  status job_status not null default 'queued',
  attempts integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ingestion_jobs_status_idx on ingestion_jobs(status, scheduled_at);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_scope text not null default 'both',
  selected_team_id uuid references teams(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on chat_messages(session_id, created_at);

create table if not exists source_citations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  chunk_id uuid references document_chunks(id) on delete set null,
  citation_order integer not null,
  snippet text not null,
  source_link text,
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  payload jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_action_idx on audit_logs(action, created_at desc);

create table if not exists search_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  session_id uuid references chat_sessions(id) on delete set null,
  question text not null,
  workspace_scope text not null,
  top_document_ids text[] not null default '{}',
  result_count integer not null default 0,
  confidence text not null default 'low',
  created_at timestamptz not null default now()
);

create table if not exists unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  user_id uuid references users(id) on delete set null,
  workspace_scope text not null,
  reason text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists resource_pins (
  user_id uuid not null references users(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, document_id)
);

create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into roles (key, name, description)
values
  ('normal', 'Normal User', 'Can ask questions and view accessible sources'),
  ('team_lead', 'Team Lead', 'Can manage team workspace resources and memberships'),
  ('admin', 'Admin', 'Can manage all shared knowledge and system settings')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into system_settings (key, value)
values
  ('stale_days_default', '30'::jsonb),
  ('authority_weights', '{"1":0.55,"2":0.72,"3":0.88,"4":1.0,"5":1.12}'::jsonb),
  ('source_categories', '["Onboarding","Setup","Troubleshooting","Process","Tooling","Demos","Access Requests","Dashboards","Ownership"]'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

