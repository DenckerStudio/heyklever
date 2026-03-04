-- Add templates table and update vps_instances with n8n credential fields

-- 1. Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price_cents integer NOT NULL DEFAULT 0,
    workflow_json jsonb NOT NULL, -- full n8n workflow JSON
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Update vps_instances table with new n8n credential fields
ALTER TABLE public.vps_instances 
    ADD COLUMN IF NOT EXISTS n8n_base_url text, -- e.g., https://n8n.c123.yourdomain.com/rest
    ADD COLUMN IF NOT EXISTS n8n_api_user text, -- Basic auth username
    ADD COLUMN IF NOT EXISTS n8n_api_password text; -- Basic auth password

-- Keep existing n8n_url and n8n_api_key for backward compatibility

-- 3. Enable RLS on templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for templates
-- Public read access for templates
CREATE POLICY "Allow public read access to templates" ON public.templates
    FOR SELECT USING (true);

-- Service role can manage templates (for admin operations)
CREATE POLICY "Service role can manage templates" ON public.templates
    FOR ALL USING (true); -- Service role bypasses RLS

-- 5. Index for templates (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_templates_name ON public.templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_price ON public.templates(price_cents);

