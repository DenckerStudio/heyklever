-- Add 'microsoft' as a valid provider to integration_accounts and integration_configs
alter table public.integration_accounts drop constraint integration_accounts_provider_check;
alter table public.integration_accounts add constraint integration_accounts_provider_check check (provider in ('google_drive', 'onedrive', 'microsoft'));

alter table public.integration_configs drop constraint integration_configs_provider_check;
alter table public.integration_configs add constraint integration_configs_provider_check check (provider in ('google_drive', 'onedrive', 'microsoft'));
