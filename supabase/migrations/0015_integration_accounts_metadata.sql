-- Store provider account identifiers and arbitrary metadata for integrations

alter table if exists public.integration_accounts
  add column if not exists provider_account_id text,
  add column if not exists provider_account_email text,
  add column if not exists metadata jsonb,
  add column if not exists connected_at timestamp with time zone not null default now();

create index if not exists integration_accounts_provider_account_idx
  on public.integration_accounts(provider_account_id);


