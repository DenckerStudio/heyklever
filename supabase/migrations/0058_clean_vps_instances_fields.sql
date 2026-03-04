-- Clean up VPS-specific fields from vps_instances table
-- These fields are deprecated but kept for legacy instances

-- 1. Mark deprecated fields with comments
COMMENT ON COLUMN public.vps_instances.plan_id IS 'DEPRECATED: No longer used with shared VPS architecture. Legacy VPS instances may still have this.';
COMMENT ON COLUMN public.vps_instances.provider_id IS 'DEPRECATED: Hostinger VM ID, only for legacy VPS instances. Container-based instances use n8n_container_name instead.';
COMMENT ON COLUMN public.vps_instances.ip_address IS 'DEPRECATED: VPS IP address, not needed for containers. Container-based instances use shared_vps_ip and n8n_domain.';
COMMENT ON COLUMN public.vps_instances.location IS 'DEPRECATED: VPS location, not needed since all containers use shared VPS.';
COMMENT ON COLUMN public.vps_instances.os IS 'DEPRECATED: VPS OS, not needed for containers.';

-- 2. Make deprecated fields nullable (if not already)
ALTER TABLE public.vps_instances 
    ALTER COLUMN plan_id DROP NOT NULL,
    ALTER COLUMN provider_id DROP NOT NULL,
    ALTER COLUMN ip_address DROP NOT NULL,
    ALTER COLUMN location DROP NOT NULL,
    ALTER COLUMN os DROP NOT NULL;

-- 3. Remove any remaining foreign key constraints (should already be dropped, but safe to try)
ALTER TABLE public.vps_instances 
    DROP CONSTRAINT IF EXISTS vps_instances_plan_id_fkey;

-- Note: These columns will be dropped in a future migration after verifying no legacy data needs them

