-- Create VPS Plans table
CREATE TABLE IF NOT EXISTS public.vps_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    price_monthly numeric NOT NULL,
    description text,
    cpu_cores int,
    ram_gb int,
    storage_gb int,
    created_at timestamp with time zone DEFAULT now()
);

-- Create Addons table
CREATE TABLE IF NOT EXISTS public.addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    price_monthly numeric DEFAULT 0,
    price_per_1k_tokens numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Create VPS Instances table
CREATE TABLE IF NOT EXISTS public.vps_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    plan_id uuid REFERENCES public.vps_plans(id),
    provider_id text, -- ID from Hostinger
    ip_address text,
    status text CHECK (status IN ('provisioning', 'installing_n8n', 'running', 'stopped', 'error')) DEFAULT 'provisioning',
    n8n_url text,
    n8n_api_key text, -- Encrypt in real app
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create Team Addons table (Activation status)
CREATE TABLE IF NOT EXISTS public.team_addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    addon_id uuid REFERENCES public.addons(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    config jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(team_id, addon_id)
);

-- Create Deployments table
CREATE TABLE IF NOT EXISTS public.deployments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vps_instance_id uuid REFERENCES public.vps_instances(id) ON DELETE CASCADE NOT NULL,
    workflow_name text,
    status text,
    logs text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vps_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- VPS Plans: Readable by everyone (authenticated)
CREATE POLICY "vps_plans_read_all" ON public.vps_plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- Addons: Readable by everyone (authenticated)
CREATE POLICY "addons_read_all" ON public.addons
    FOR SELECT USING (auth.role() = 'authenticated');

-- VPS Instances: Team members can read
CREATE POLICY "vps_instances_read_team" ON public.vps_instances
    FOR SELECT USING (public.is_team_member(team_id));

-- VPS Instances: Team admins can update (e.g., restart) - though usually handled by server actions
CREATE POLICY "vps_instances_update_team" ON public.vps_instances
    FOR UPDATE USING (public.is_team_admin(team_id));

-- Team Addons: Team members can read
CREATE POLICY "team_addons_read_team" ON public.team_addons
    FOR SELECT USING (public.is_team_member(team_id));

-- Team Addons: Team admins can insert/update
CREATE POLICY "team_addons_write_team" ON public.team_addons
    FOR INSERT WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "team_addons_update_team" ON public.team_addons
    FOR UPDATE USING (public.is_team_admin(team_id));

-- Deployments: Team members can read
CREATE POLICY "deployments_read_team" ON public.deployments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vps_instances
            WHERE public.vps_instances.id = public.deployments.vps_instance_id
            AND public.is_team_member(public.vps_instances.team_id)
        )
    );

-- Seed Data (Upsert to avoid duplicates on re-runs)

-- VPS Plans
INSERT INTO public.vps_plans (name, slug, price_monthly, cpu_cores, ram_gb, storage_gb)
VALUES 
    ('Starter', 'starter', 7.50, 1, 1, 20),
    ('Growth', 'growth', 11.25, 2, 4, 40),
    ('Pro', 'pro', 15.00, 4, 8, 80),
    ('Enterprise', 'enterprise', 30.00, 8, 16, 160)
ON CONFLICT (slug) DO UPDATE 
SET price_monthly = EXCLUDED.price_monthly,
    cpu_cores = EXCLUDED.cpu_cores,
    ram_gb = EXCLUDED.ram_gb,
    storage_gb = EXCLUDED.storage_gb;

-- Addons
INSERT INTO public.addons (name, slug, description, price_monthly, price_per_1k_tokens)
VALUES
    ('RAG AI', 'rag-ai', 'Retrieval Augmented Generation for documents', 0, 0.02),
    ('Content Generation', 'content-gen', 'Blog and social media content generation', 0, 0.02),
    ('Customer Chatbot', 'customer-chatbot', 'AI Chatbot for customer support', 10, 0.02),
    ('Summarization', 'summarization', 'Auto-summarization of meetings and docs', 0, 0.02)
ON CONFLICT (slug) DO UPDATE
SET price_monthly = EXCLUDED.price_monthly,
    price_per_1k_tokens = EXCLUDED.price_per_1k_tokens;
