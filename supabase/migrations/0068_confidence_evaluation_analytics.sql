-- Store daily confidence evaluation from chat_messages (RAG performance).
-- Always one row per team per day; includes topics_performing_well and topics_needing_attention.
create table if not exists public.confidence_evaluation_analytics (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  calculated_at timestamptz not null default now(),
  calculated_date date not null generated always as ((calculated_at at time zone 'UTC')::date) stored,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per team per calendar day (UTC)
create unique index if not exists idx_confidence_eval_team_date
  on public.confidence_evaluation_analytics (team_id, calculated_date);

-- Enable RLS
alter table public.confidence_evaluation_analytics enable row level security;

create policy "Team members can view their team's confidence evaluation"
  on public.confidence_evaluation_analytics for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.default_team_id = confidence_evaluation_analytics.team_id
  ));

create policy "Service role can manage confidence evaluation analytics"
  on public.confidence_evaluation_analytics for all
  using (true)
  with check (true);

create index if not exists idx_confidence_eval_team_calculated
  on public.confidence_evaluation_analytics(team_id, calculated_at desc);

-- Reuse existing trigger pattern for updated_at
create or replace function update_confidence_evaluation_analytics_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_confidence_evaluation_analytics_updated_at
  before update on public.confidence_evaluation_analytics
  for each row
  execute function update_confidence_evaluation_analytics_updated_at();

grant select, insert, update, delete on public.confidence_evaluation_analytics to authenticated, service_role;
