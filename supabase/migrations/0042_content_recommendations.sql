-- Create content recommendations table for analyzing poor chat responses
create table if not exists public.content_recommendations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  document_name text not null,
  topics jsonb not null default '[]'::jsonb, -- Array of strings
  summary text,
  status text not null default 'pending' check (status in ('pending', 'created', 'dismissed', 'analyzing')),
  metadata_recommendations jsonb default '{}'::jsonb, -- { language, audience, feature, use_case }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.content_recommendations enable row level security;

-- Policies
create policy "Team members can view content recommendations"
  on public.content_recommendations for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.default_team_id = content_recommendations.team_id
  ));

create policy "Team members can update content recommendations"
  on public.content_recommendations for update
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.default_team_id = content_recommendations.team_id
  ));

create policy "Service role can manage content recommendations"
  on public.content_recommendations for all
  using (true)
  with check (true);

-- Index for faster queries
create index if not exists idx_content_recommendations_team_status 
  on public.content_recommendations(team_id, status);

-- Grant permissions
grant select, insert, update, delete on public.content_recommendations to authenticated, service_role;

