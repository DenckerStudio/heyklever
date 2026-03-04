-- Add container-related fields to vps_instances for shared VPS architecture
-- This migration adds fields needed to map containers to customers/teams

ALTER TABLE public.vps_instances 
    -- Customer's n8n domain (e.g., team1.heyklever.ai)
    ADD COLUMN IF NOT EXISTS n8n_domain text,
    
    -- Docker container name (e.g., n8n_team1) for internal admin
    ADD COLUMN IF NOT EXISTS n8n_container_name text,
    
    -- Database name (e.g., postgres_team1) for internal admin (optional, for future use)
    ADD COLUMN IF NOT EXISTS n8n_db_name text,
    
    -- Shared VPS IP address (72.62.148.138)
    ADD COLUMN IF NOT EXISTS shared_vps_ip text;

-- Create index on n8n_domain for quick lookups when interacting with customer's n8n
CREATE INDEX IF NOT EXISTS idx_vps_instances_n8n_domain ON public.vps_instances(n8n_domain);

-- Create index on n8n_container_name for container management
CREATE INDEX IF NOT EXISTS idx_vps_instances_n8n_container_name ON public.vps_instances(n8n_container_name);

-- Add comment explaining the new architecture
COMMENT ON COLUMN public.vps_instances.n8n_domain IS 'Customer n8n domain (e.g., team1.heyklever.ai). Used to interact with customer n8n via https://n8n_domain + API key.';
COMMENT ON COLUMN public.vps_instances.n8n_container_name IS 'Docker container name on shared VPS (e.g., n8n_team1). Used for internal admin and container management.';
COMMENT ON COLUMN public.vps_instances.n8n_db_name IS 'Database name for this container (e.g., postgres_team1). Optional, for future use.';
COMMENT ON COLUMN public.vps_instances.shared_vps_ip IS 'IP address of the shared VPS (72.62.148.138). All containers run on this single VPS.';

