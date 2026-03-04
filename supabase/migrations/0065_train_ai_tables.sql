-- 0065_train_ai_tables.sql
-- Tables for AI Agent Training feature: monitored URLs, training sources, generated outputs

-- ============================================================================
-- MONITORED URLS TABLE
-- Stores URLs that are observed for changes and auto-synced to RAG
-- ============================================================================
create table if not exists public.monitored_urls (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  url text not null,
  check_frequency text not null default 'daily' check (check_frequency in ('daily', 'weekly')),
  last_checked_at timestamptz,
  last_content_hash text,
  has_changes boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists monitored_urls_team_idx on public.monitored_urls(team_id);
create index if not exists monitored_urls_active_idx on public.monitored_urls(is_active) where is_active = true;
create index if not exists monitored_urls_check_due_idx on public.monitored_urls(check_frequency, last_checked_at);
create unique index if not exists monitored_urls_team_url_unique on public.monitored_urls(team_id, url);

-- RLS
alter table public.monitored_urls enable row level security;

-- Policy: Team members can view their team's monitored URLs
create policy "Team members can view monitored URLs"
on public.monitored_urls for select
to authenticated
using (public.is_team_member(team_id));

-- Policy: Team members can insert monitored URLs
create policy "Team members can insert monitored URLs"
on public.monitored_urls for insert
to authenticated
with check (public.is_team_member(team_id));

-- Policy: Team members can update their team's monitored URLs
create policy "Team members can update monitored URLs"
on public.monitored_urls for update
to authenticated
using (public.is_team_member(team_id));

-- Policy: Team members can delete their team's monitored URLs
create policy "Team members can delete monitored URLs"
on public.monitored_urls for delete
to authenticated
using (public.is_team_member(team_id));

-- ============================================================================
-- TRAINING SOURCES TABLE
-- Tracks sources (files, URLs, audio) used in AI training sessions
-- ============================================================================
create table if not exists public.training_sources (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'file', 'audio')),
  source_name text not null,
  source_url text,
  file_path text,
  content_hash text,
  content_preview text,
  metadata jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists training_sources_team_idx on public.training_sources(team_id);
create index if not exists training_sources_type_idx on public.training_sources(source_type);
create index if not exists training_sources_created_idx on public.training_sources(created_at desc);

-- RLS
alter table public.training_sources enable row level security;

-- Policy: Team members can view their team's training sources
create policy "Team members can view training sources"
on public.training_sources for select
to authenticated
using (public.is_team_member(team_id));

-- Policy: Team members can insert training sources
create policy "Team members can insert training sources"
on public.training_sources for insert
to authenticated
with check (public.is_team_member(team_id));

-- Policy: Team members can delete training sources
create policy "Team members can delete training sources"
on public.training_sources for delete
to authenticated
using (public.is_team_member(team_id));

-- ============================================================================
-- GENERATED OUTPUTS TABLE
-- Tracks AI-generated documents, their status, and approval workflow
-- ============================================================================
create table if not exists public.generated_outputs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  
  -- Output details
  title text not null,
  output_type text not null check (output_type in ('user-manual', 'documentation', 'step-by-step', 'blog-post', 'custom')),
  custom_output_type text,
  content text not null,
  
  -- Generation configuration
  questionnaire_answers jsonb default '{}'::jsonb,
  source_ids uuid[] default '{}',
  
  -- Workflow status
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  
  -- RAG integration
  document_id bigint references public.documents(id) on delete set null,
  ingested_at timestamptz,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists generated_outputs_team_idx on public.generated_outputs(team_id);
create index if not exists generated_outputs_status_idx on public.generated_outputs(status);
create index if not exists generated_outputs_type_idx on public.generated_outputs(output_type);
create index if not exists generated_outputs_created_idx on public.generated_outputs(created_at desc);
create index if not exists generated_outputs_document_idx on public.generated_outputs(document_id) where document_id is not null;

-- RLS
alter table public.generated_outputs enable row level security;

-- Policy: Team members can view their team's generated outputs
create policy "Team members can view generated outputs"
on public.generated_outputs for select
to authenticated
using (public.is_team_member(team_id));

-- Policy: Team members can insert generated outputs
create policy "Team members can insert generated outputs"
on public.generated_outputs for insert
to authenticated
with check (public.is_team_member(team_id));

-- Policy: Team members can update their team's generated outputs
create policy "Team members can update generated outputs"
on public.generated_outputs for update
to authenticated
using (public.is_team_member(team_id));

-- Policy: Team members can delete their team's generated outputs
create policy "Team members can delete generated outputs"
on public.generated_outputs for delete
to authenticated
using (public.is_team_member(team_id));

-- ============================================================================
-- URL MONITORING HISTORY TABLE
-- Tracks history of URL checks and detected changes
-- ============================================================================
create table if not exists public.url_check_history (
  id uuid primary key default gen_random_uuid(),
  monitored_url_id uuid not null references public.monitored_urls(id) on delete cascade,
  checked_at timestamptz not null default now(),
  content_hash text,
  has_changes boolean not null default false,
  error_message text,
  metadata jsonb default '{}'::jsonb
);

-- Indexes
create index if not exists url_check_history_url_idx on public.url_check_history(monitored_url_id);
create index if not exists url_check_history_checked_idx on public.url_check_history(checked_at desc);

-- RLS (inherits access from parent monitored_urls)
alter table public.url_check_history enable row level security;

create policy "Team members can view URL check history"
on public.url_check_history for select
to authenticated
using (
  exists (
    select 1 from public.monitored_urls mu
    where mu.id = monitored_url_id
    and public.is_team_member(mu.team_id)
  )
);

-- ============================================================================
-- HELPER FUNCTION: Get URLs due for checking
-- ============================================================================
create or replace function public.get_urls_due_for_check(
  max_urls int default 100
) returns table (
  id uuid,
  team_id uuid,
  url text,
  check_frequency text,
  last_checked_at timestamptz,
  last_content_hash text
) language sql stable security definer set search_path = public as $$
  select 
    mu.id,
    mu.team_id,
    mu.url,
    mu.check_frequency,
    mu.last_checked_at,
    mu.last_content_hash
  from public.monitored_urls mu
  where mu.is_active = true
    and (
      mu.last_checked_at is null
      or (mu.check_frequency = 'daily' and mu.last_checked_at < now() - interval '1 day')
      or (mu.check_frequency = 'weekly' and mu.last_checked_at < now() - interval '7 days')
    )
  order by mu.last_checked_at nulls first
  limit max_urls;
$$;

grant execute on function public.get_urls_due_for_check(int) to authenticated, service_role;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for monitored_urls
drop trigger if exists update_monitored_urls_updated_at on public.monitored_urls;
create trigger update_monitored_urls_updated_at
  before update on public.monitored_urls
  for each row execute function public.update_updated_at_column();

-- Trigger for generated_outputs
drop trigger if exists update_generated_outputs_updated_at on public.generated_outputs;
create trigger update_generated_outputs_updated_at
  before update on public.generated_outputs
  for each row execute function public.update_updated_at_column();
