-- Create search analytics table for tracking query performance
create table if not exists public.search_analytics (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  session_id text, -- optional link to chat session
  query_text text not null,
  context text default 'private' check (context in ('public', 'private')),
  was_successful boolean default false,
  failure_reason text,
  confidence text check (confidence in ('high', 'medium', 'low')),
  language text default 'en',
  keywords jsonb default '[]'::jsonb, -- Array of strings
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.search_analytics enable row level security;

-- Policies
create policy "Team members can view search analytics"
  on public.search_analytics for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.default_team_id = search_analytics.team_id
  ));

create policy "Service role can manage search analytics"
  on public.search_analytics for all
  using (true)
  with check (true);

-- Indexes
create index if not exists idx_search_analytics_team_created on public.search_analytics(team_id, created_at desc);
create index if not exists idx_search_analytics_team_success on public.search_analytics(team_id, was_successful);

-- Grant permissions
grant select, insert, update, delete on public.search_analytics to authenticated, service_role;

-- RPC for weekly activity chart
create or replace function public.get_weekly_search_activity(team_uuid uuid)
returns table (
  day text,
  value bigint
) language plpgsql security definer as $$
begin
  return query
  select
    to_char(d, 'Dy') as day,
    count(sa.id) as value
  from generate_series(
    date_trunc('day', now()) - interval '6 days',
    date_trunc('day', now()),
    interval '1 day'
  ) as d
  left join public.search_analytics sa
    on date_trunc('day', sa.created_at) = d
    and sa.team_id = team_uuid
  group by d
  order by d;
end;
$$;

grant execute on function public.get_weekly_search_activity(uuid) to authenticated, service_role;
