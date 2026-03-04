-- Digital signage: register players (Xibo, Anthias) and store status from n8n polling
create table if not exists public.signage_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('xibo', 'anthias', 'pisignage')),
  name text not null,
  endpoint text,
  external_id text,
  status text not null default 'unknown' check (status in ('online', 'offline', 'unknown', 'error')),
  last_seen_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists signage_players_team_idx on public.signage_players(team_id);
create index if not exists signage_players_status_idx on public.signage_players(team_id, status);

alter table public.signage_players enable row level security;

create policy "Team members can view signage players"
  on public.signage_players for select
  using (public.is_team_member(team_id));

create policy "Team admins can manage signage players"
  on public.signage_players for all
  using (public.is_team_admin(team_id));

-- n8n or other backends use service_role to upsert status
comment on table public.signage_players is 'Digital signage players (Xibo, Anthias). Status updated by n8n polling.';
