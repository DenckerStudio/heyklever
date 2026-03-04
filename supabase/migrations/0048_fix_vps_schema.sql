-- 0048_fix_vps_schema.sql

-- 1. Fix VPS Plans to match explicit UI fields
alter table public.vps_plans
  add column if not exists cpu_cores int,
  add column if not exists ram_gb int,
  add column if not exists storage_gb int;

-- Backfill data
update public.vps_plans set cpu_cores = 1, ram_gb = 4, storage_gb = 50 where slug = 'starter';
update public.vps_plans set cpu_cores = 2, ram_gb = 8, storage_gb = 100 where slug = 'growth';
update public.vps_plans set cpu_cores = 4, ram_gb = 16, storage_gb = 200 where slug = 'pro';
update public.vps_plans set cpu_cores = 8, ram_gb = 32, storage_gb = 400 where slug = 'enterprise';

-- Drop the old specs JSONB column
alter table public.vps_plans drop column if exists specs;

-- 2. Fix Addons for usage pricing
alter table public.addons
  add column if not exists price_per_1k_tokens numeric default 0;

-- Set default usage price (approx $0.02 per 1k tokens based on plan)
update public.addons set price_per_1k_tokens = 0.02;

