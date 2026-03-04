-- Seed integration configs for Google Drive and OneDrive

-- Ensure provider is unique to allow idempotent seeds
create unique index if not exists integration_configs_provider_key
  on public.integration_configs(provider);

-- Google Drive requires client_id and client_secret
insert into public.integration_configs (provider, requires_client_id, requires_client_secret, requires_auth_url, requires_token_url)
values ('google_drive', true, true, false, false)
on conflict (provider) do nothing;

-- OneDrive requires client_id, client_secret, and auth/token URLs
insert into public.integration_configs (provider, requires_client_id, requires_client_secret, requires_auth_url, requires_token_url)
values ('onedrive', true, true, true, true)
on conflict (provider) do nothing;


