-- Team settings for preferences and feature flags

create table if not exists public.team_settings (
  team_id uuid primary key references public.teams(id) on delete cascade,
  timezone text,
  locale text,
  indexing_enabled boolean not null default true,
  rag_enabled boolean not null default true,
  data_retention_days int,
  settings jsonb,
  updated_at timestamp with time zone not null default now()
);

alter table public.team_settings enable row level security;

drop policy if exists team_settings_read on public.team_settings;
create policy team_settings_read
  on public.team_settings for select
  using (public.is_team_member(team_id));

drop policy if exists team_settings_write on public.team_settings;
create policy team_settings_write
  on public.team_settings for insert
  with check (public.is_team_admin(team_id));

drop policy if exists team_settings_update on public.team_settings;
create policy team_settings_update
  on public.team_settings for update
  using (public.is_team_admin(team_id));


