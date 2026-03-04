-- Remove VPS plans and deployments tables
-- These are no longer needed with the shared VPS architecture

-- 1. Drop foreign key constraint from vps_instances.plan_id
ALTER TABLE public.vps_instances 
    DROP CONSTRAINT IF EXISTS vps_instances_plan_id_fkey;

-- 2. Drop vps_plans table
DROP TABLE IF EXISTS public.vps_plans CASCADE;

-- 3. Drop deployments table (unused/legacy)
DROP TABLE IF EXISTS public.deployments CASCADE;

-- Note: vps_instances.plan_id column will be handled in next migration
-- We keep it for now to avoid breaking legacy data, but mark it as deprecated

