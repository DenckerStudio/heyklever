-- Create knowledge_analytics table for storing daily analytics snapshots
create table if not exists public.knowledge_analytics (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  calculated_at timestamptz not null default now(),
  stats jsonb not null default '{}'::jsonb, -- Stores KnowledgeStats interface data and topics array
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.knowledge_analytics enable row level security;

-- Policies
create policy "Team members can view their team's analytics"
  on public.knowledge_analytics for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.default_team_id = knowledge_analytics.team_id
  ));

create policy "Service role can manage knowledge analytics"
  on public.knowledge_analytics for all
  using (true)
  with check (true);

-- Indexes for efficient queries
create index if not exists idx_knowledge_analytics_team_calculated 
  on public.knowledge_analytics(team_id, calculated_at desc);

-- Function to update updated_at timestamp
create or replace function update_knowledge_analytics_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_knowledge_analytics_updated_at
  before update on public.knowledge_analytics
  for each row
  execute function update_knowledge_analytics_updated_at();

-- Grant permissions
grant select, insert, update, delete on public.knowledge_analytics to authenticated, service_role;
