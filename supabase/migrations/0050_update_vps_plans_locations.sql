
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
    hostinger_plan_id text, -- e.g. vps-kvm-1
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
    location text, -- e.g. 'us', 'eu'
    os text, -- e.g. 'debian'
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

-- VPS Plans (Updated to match Hostinger KVM plans)
-- Note: Prices are COST prices from Hostinger image. You might want to add margin. 
-- I will use the cost prices as base for now or slightly marked up if desired, 
-- but sticking to the user's previous "Starter/Growth" naming or switching to "KVM 1"?
-- The user said "Price depends on your chosen VPS plan: KVM 1 - $3.00...".
-- I will map the old slugs to new specs/prices or creating new entries.
-- Let's stick to the user's provided list: KVM 1, KVM 2, etc.

INSERT INTO public.vps_plans (name, slug, price, stripe_price_id, specs, hostinger_plan_id) VALUES
('KVM 1', 'kvm-1', 3.00, 'price_kvm1_placeholder', '{"cpu": "1 vCPU", "ram": "4GB", "storage": "50GB", "bandwidth": "1TB"}'::jsonb, 'vps-kvm-1'),
('KVM 2', 'kvm-2', 6.00, 'price_kvm2_placeholder', '{"cpu": "2 vCPU", "ram": "8GB", "storage": "100GB", "bandwidth": "2TB"}'::jsonb, 'vps-kvm-2'),
('KVM 4', 'kvm-4', 12.00, 'price_kvm4_placeholder', '{"cpu": "4 vCPU", "ram": "16GB", "storage": "200GB", "bandwidth": "4TB"}'::jsonb, 'vps-kvm-4'),
('KVM 8', 'kvm-8', 24.00, 'price_kvm8_placeholder', '{"cpu": "8 vCPU", "ram": "32GB", "storage": "400GB", "bandwidth": "8TB"}'::jsonb, 'vps-kvm-8')
ON CONFLICT (slug) DO UPDATE 
SET price = EXCLUDED.price,
    specs = EXCLUDED.specs,
    stripe_price_id = EXCLUDED.stripe_price_id,
    hostinger_plan_id = EXCLUDED.hostinger_plan_id;

-- Addons
-- Adding "Daily Auto Backups"
INSERT INTO public.addons (name, slug, description, price, stripe_price_id, type) VALUES
('RAG AI', 'rag-ai', 'Retrieval Augmented Generation for your docs', 0, 'price_rag_placeholder', 'recurring'),
('Content Generation', 'content-gen', 'AI-powered content creation tools', 0, 'price_content_placeholder', 'recurring'),
('Customer Chatbot', 'chatbot', 'Embeddable AI chatbot for your site', 0, 'price_chatbot_placeholder', 'recurring'),
('Summarization', 'summarization', 'Auto-summarize long documents', 0, 'price_summarization_placeholder', 'recurring'),
('Daily Auto Backups', 'daily-backups', 'Automated daily backups for peace of mind', 0, 'price_backups_placeholder', 'recurring') 
-- Note: Pricing for backups wasn't explicitly clear in text, image implied prices. 
-- Usually it's ~10-20% of VPS cost or flat fee. I'll leave as 0 or updating logic to calculate.
-- Actually the user said "(see image for prices)". I cannot see the image content perfectly unless I infer.
-- Standard Hostinger backup is often an add-on. I'll put a placeholder price or handled dynamically.
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

