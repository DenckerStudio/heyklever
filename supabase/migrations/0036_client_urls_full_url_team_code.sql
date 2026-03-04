-- Add full_url and team_code columns to client_urls table

-- Add full_url column to store the complete client URL
alter table public.client_urls add column if not exists full_url text;

-- Add team_code column for easier querying (denormalized for performance)
alter table public.client_urls add column if not exists team_code text;

-- Create index on team_code for faster queries
create index if not exists client_urls_team_code_idx on public.client_urls(team_code);

-- Create index on full_url for faster lookups
create index if not exists client_urls_full_url_idx on public.client_urls(full_url);

-- Update existing client_urls with team_code and full_url
update public.client_urls 
set team_code = (
  select teams.team_code 
  from public.teams 
  where teams.id = client_urls.team_id
),
full_url = concat(
  coalesce(current_setting('app.settings.site_url', true), 'http://localhost:3000'),
  '/client/',
  (select teams.team_code from public.teams where teams.id = client_urls.team_id),
  '/',
  client_urls.display_code
)
where team_code is null or full_url is null;
