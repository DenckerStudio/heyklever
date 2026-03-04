
-- Clean up existing VPS tables to fix schema conflicts (price vs price_monthly)
-- We are standardizing on the schema used in the application code.

DROP TABLE IF EXISTS public.deployments CASCADE;
DROP TABLE IF EXISTS public.team_addons CASCADE;
DROP TABLE IF EXISTS public.vps_instances CASCADE;
DROP TABLE IF EXISTS public.addons CASCADE;
DROP TABLE IF EXISTS public.vps_plans CASCADE;

-- Ensure Teams table has slug column
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- 1. VPS Plans
CREATE TABLE public.vps_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    price numeric NOT NULL DEFAULT 0, -- Matching application code 'price'
    stripe_price_id text,
    specs jsonb DEFAULT '{}'::jsonb, -- e.g. { "cpu": "1 vCPU", "ram": "1GB" }
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Addons
CREATE TABLE public.addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    price numeric NOT NULL DEFAULT 0, -- Matching application code 'price'
    stripe_price_id text,
    type text NOT NULL CHECK (type IN ('recurring', 'one_time')),
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Team Addons
CREATE TABLE public.team_addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    addon_id uuid REFERENCES public.addons(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(team_id, addon_id)
);

-- 4. VPS Instances
CREATE TABLE public.vps_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE UNIQUE, -- One VPS per team
    plan_id uuid REFERENCES public.vps_plans(id),
    ip_address text,
    status text NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'installing_n8n', 'running', 'stopped', 'error')),
    provider_id text,
    n8n_url text,
    n8n_api_key text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 5. Deployments
CREATE TABLE public.deployments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    status text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vps_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- vps_plans: public read
CREATE POLICY "Allow public read access to vps_plans" ON public.vps_plans FOR SELECT USING (true);

-- addons: public read
CREATE POLICY "Allow public read access to addons" ON public.addons FOR SELECT USING (true);

-- team_addons: team read, team owner/admin write
CREATE POLICY "Team members can view their addons" ON public.team_addons
  FOR SELECT USING (public.is_team_member(team_id));

CREATE POLICY "Team admins can manage addons" ON public.team_addons
  FOR ALL USING (public.is_team_admin(team_id));

-- vps_instances: team read
CREATE POLICY "Team members can view their vps" ON public.vps_instances
  FOR SELECT USING (public.is_team_member(team_id));

-- deployments: team read
CREATE POLICY "Team members can view deployments" ON public.deployments
  FOR SELECT USING (public.is_team_member(team_id));


-- Seed Data

-- VPS Plans
INSERT INTO public.vps_plans (name, slug, price, stripe_price_id, specs) VALUES
('Starter', 'starter', 7.50, 'price_starter_placeholder', '{"cpu": "1 vCPU", "ram": "1GB", "storage": "20GB SSD"}'::jsonb),
('Growth', 'growth', 11.25, 'price_growth_placeholder', '{"cpu": "2 vCPU", "ram": "2GB", "storage": "40GB SSD"}'::jsonb),
('Pro', 'pro', 15.00, 'price_pro_placeholder', '{"cpu": "2 vCPU", "ram": "4GB", "storage": "80GB SSD"}'::jsonb),
('Enterprise', 'enterprise', 30.00, 'price_enterprise_placeholder', '{"cpu": "4 vCPU", "ram": "8GB", "storage": "160GB SSD"}'::jsonb)
ON CONFLICT (slug) DO UPDATE 
SET price = EXCLUDED.price,
    specs = EXCLUDED.specs,
    stripe_price_id = EXCLUDED.stripe_price_id;

-- Addons
INSERT INTO public.addons (name, slug, description, price, stripe_price_id, type) VALUES
('RAG AI', 'rag-ai', 'Retrieval Augmented Generation for your docs', 0, 'price_rag_placeholder', 'recurring'),
('Content Generation', 'content-gen', 'AI-powered content creation tools', 0, 'price_content_placeholder', 'recurring'),
('Customer Chatbot', 'chatbot', 'Embeddable AI chatbot for your site', 0, 'price_chatbot_placeholder', 'recurring'),
('Summarization', 'summarization', 'Auto-summarize long documents', 0, 'price_summarization_placeholder', 'recurring')
ON CONFLICT (slug) DO UPDATE 
SET price = EXCLUDED.price,
    description = EXCLUDED.description,
    stripe_price_id = EXCLUDED.stripe_price_id;

-- Ensure create_team function exists (re-asserting just in case)
CREATE OR REPLACE FUNCTION public.create_team(p_name text, p_slug text default null)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_slug text;
BEGIN
  v_slug := coalesce(p_slug, lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')));
  
  INSERT INTO public.teams (name, slug)
  VALUES (p_name, v_slug)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, auth.uid(), 'owner');

  RETURN v_team_id;
END;
$$;
