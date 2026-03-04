-- Felles tabell for alle daglige evalueringstyper (confidence, response_quality, osv.).
-- Én rad per team per dag per evaluation_type.
create table if not exists public.evaluation_analytics (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  calculated_at timestamptz not null default now(),
  calculated_date date not null generated always as ((calculated_at at time zone 'UTC')::date) stored,
  evaluation_type text not null check (evaluation_type in ('confidence', 'response_quality')),
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.evaluation_analytics.evaluation_type is 'confidence: RAG svarkvalitet. response_quality: brukerfeedback "var dette nyttig?". Legg til flere i check ved behov.';

-- Én rad per team per kalenderdag per type (UTC)
create unique index if not exists idx_evaluation_analytics_team_date_type
  on public.evaluation_analytics (team_id, calculated_date, evaluation_type);

-- Enable RLS
alter table public.evaluation_analytics enable row level security;

create policy "Team members can view their team's evaluation analytics"
  on public.evaluation_analytics for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.default_team_id = evaluation_analytics.team_id
  ));

create policy "Service role can manage evaluation analytics"
  on public.evaluation_analytics for all
  using (true)
  with check (true);

create index if not exists idx_evaluation_analytics_team_type_calculated
  on public.evaluation_analytics(team_id, evaluation_type, calculated_at desc);

-- Trigger for updated_at
create or replace function update_evaluation_analytics_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_evaluation_analytics_updated_at
  before update on public.evaluation_analytics
  for each row
  execute function update_evaluation_analytics_updated_at();

grant select, insert, update, delete on public.evaluation_analytics to authenticated, service_role;
