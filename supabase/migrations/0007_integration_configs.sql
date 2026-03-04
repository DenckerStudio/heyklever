-- Integration configs define required fields per provider (static-ish)

create table if not exists public.integration_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google_drive','onedrive')),
  -- For Google Drive we need client_id and client_secret
  requires_client_id boolean not null default true,
  requires_client_secret boolean not null default true,
  -- For OneDrive we also need authorization endpoints
  requires_auth_url boolean not null default false,
  requires_token_url boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table public.integration_configs enable row level security;

-- Readonly to all authenticated users
drop policy if exists integration_configs_read on public.integration_configs;
create policy integration_configs_read
  on public.integration_configs for select
  using (true);

-- Seed convenience (optional upsert handled in app)


