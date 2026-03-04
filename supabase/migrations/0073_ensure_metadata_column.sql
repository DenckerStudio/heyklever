-- Ensure metadata columns exist in integration_accounts
-- This is a safety migration in case 0015 was skipped or schema cache is stale

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'integration_accounts' and column_name = 'metadata') then
    alter table public.integration_accounts add column metadata jsonb;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'integration_accounts' and column_name = 'provider_account_id') then
    alter table public.integration_accounts add column provider_account_id text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'integration_accounts' and column_name = 'provider_account_email') then
    alter table public.integration_accounts add column provider_account_email text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'integration_accounts' and column_name = 'connected_at') then
    alter table public.integration_accounts add column connected_at timestamp with time zone default now();
  end if;
end $$;

-- Force schema cache reload by notifying pgrst (if using Supabase/PostgREST)
NOTIFY pgrst, 'reload config';
