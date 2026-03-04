-- Integration accounts store per-team OAuth credentials and metadata

create table if not exists public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  provider text not null check (provider in ('google_drive','onedrive')),
  -- Google Drive
  client_id text,
  client_secret text,
  -- OneDrive specific
  authorization_url text,
  access_token_url text,
  -- OAuth tokens
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  -- Metadata
  scope text,
  status text not null default 'connected',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(team_id, provider)
);

create index if not exists integration_accounts_team_idx on public.integration_accounts(team_id);

alter table public.integration_accounts enable row level security;

drop policy if exists integration_accounts_read on public.integration_accounts;
create policy integration_accounts_read
  on public.integration_accounts for select
  using (public.is_team_member(team_id));

drop policy if exists integration_accounts_write on public.integration_accounts;
create policy integration_accounts_write
  on public.integration_accounts for insert
  with check (public.is_team_admin(team_id));

drop policy if exists integration_accounts_update on public.integration_accounts;
create policy integration_accounts_update
  on public.integration_accounts for update
  using (public.is_team_admin(team_id));


