-- Add settings column to client_urls table for per-URL configuration
alter table public.client_urls add column if not exists settings jsonb default '{}'::jsonb;

-- Update existing client_urls to have default settings
update public.client_urls 
set settings = '{}'::jsonb 
where settings is null;

