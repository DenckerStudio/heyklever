-- Platform-level integration credentials (one Nextcloud, one Snipe-IT instance for multi-tenant use).
-- Per-team overrides remain in team_settings.settings (nextcloud, snipe_it).
-- Only service_role should read this table (no RLS policy for authenticated = backend only).

create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  integration_type text not null unique check (integration_type in ('nextcloud', 'snipe_it', 'xibo')),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default now()
);

create index if not exists platform_integrations_type_idx on public.platform_integrations(integration_type);

alter table public.platform_integrations enable row level security;

-- No policies for authenticated/anon: only service_role (backend) can read/write.
-- To manage from dashboard, use a backend API that uses service_role.

comment on table public.platform_integrations is 'Global connection settings for Nextcloud, Snipe-IT, etc. config: nextcloud { url, username, app_password }; snipe_it { base_url, token }; xibo { url }';
