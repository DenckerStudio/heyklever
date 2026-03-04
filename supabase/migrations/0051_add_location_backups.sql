
-- Add location and os columns to vps_instances if they don't exist
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS os text DEFAULT 'debian';
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS n8n_credentials jsonb DEFAULT '{}'::jsonb;

-- Add hostinger_plan_id to vps_plans if it doesn't exist
ALTER TABLE public.vps_plans ADD COLUMN IF NOT EXISTS hostinger_plan_id text;

-- Add plan-based pricing support for addons
-- Create a table to store plan-specific addon pricing
CREATE TABLE IF NOT EXISTS public.addon_plan_pricing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_id uuid REFERENCES public.addons(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES public.vps_plans(id) ON DELETE CASCADE,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(addon_id, plan_id)
);

-- Enable RLS
ALTER TABLE public.addon_plan_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to addon_plan_pricing" ON public.addon_plan_pricing FOR SELECT USING (true);

-- Update VPS Plans to use KVM naming and Hostinger plan IDs
UPDATE public.vps_plans SET 
    name = CASE slug
        WHEN 'starter' THEN 'KVM 1'
        WHEN 'growth' THEN 'KVM 2'
        WHEN 'pro' THEN 'KVM 4'
        WHEN 'enterprise' THEN 'KVM 8'
        ELSE name
    END,
    slug = CASE slug
        WHEN 'starter' THEN 'kvm-1'
        WHEN 'growth' THEN 'kvm-2'
        WHEN 'pro' THEN 'kvm-4'
        WHEN 'enterprise' THEN 'kvm-8'
        ELSE slug
    END,
    price = CASE slug
        WHEN 'starter' THEN 3.00
        WHEN 'growth' THEN 6.00
        WHEN 'pro' THEN 12.00
        WHEN 'enterprise' THEN 24.00
        ELSE price
    END,
    hostinger_plan_id = CASE slug
        WHEN 'starter' THEN 'vps-kvm-1'
        WHEN 'growth' THEN 'vps-kvm-2'
        WHEN 'pro' THEN 'vps-kvm-4'
        WHEN 'enterprise' THEN 'vps-kvm-8'
        ELSE hostinger_plan_id
    END
WHERE slug IN ('starter', 'growth', 'pro', 'enterprise');

-- Insert KVM plans if they don't exist
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

-- Add Daily Auto Backups addon if it doesn't exist
INSERT INTO public.addons (name, slug, description, price, stripe_price_id, type) VALUES
('Daily Auto Backups', 'daily-backups', 'Automated daily backups for your VPS', 0, 'price_backups_placeholder', 'recurring')
ON CONFLICT (slug) DO UPDATE 
SET description = EXCLUDED.description;

-- Add plan-based pricing for Daily Auto Backups
-- KVM 1: $3/mo, KVM 2: $6/mo, KVM 4: $12/mo, KVM 8: $24/mo (as per image)
INSERT INTO public.addon_plan_pricing (addon_id, plan_id, price)
SELECT 
    a.id as addon_id,
    p.id as plan_id,
    CASE p.slug
        WHEN 'kvm-1' THEN 3.00
        WHEN 'kvm-2' THEN 6.00
        WHEN 'kvm-4' THEN 12.00
        WHEN 'kvm-8' THEN 24.00
        ELSE 0
    END as price
FROM public.addons a
CROSS JOIN public.vps_plans p
WHERE a.slug = 'daily-backups'
  AND p.slug IN ('kvm-1', 'kvm-2', 'kvm-4', 'kvm-8')
ON CONFLICT (addon_id, plan_id) DO UPDATE 
SET price = EXCLUDED.price;

