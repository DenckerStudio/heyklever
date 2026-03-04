-- Add custom_domain to team_settings for premium custom domains

alter table if exists public.team_settings
  add column if not exists custom_domain text;

-- Optional index if lookups by custom_domain are needed later
create index if not exists team_settings_custom_domain_idx on public.team_settings(custom_domain);


