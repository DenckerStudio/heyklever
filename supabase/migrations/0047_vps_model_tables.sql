-- 0047_vps_model_tables.sql

-- 1. VPS Plans
create table if not exists public.vps_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_monthly numeric not null,
  specs jsonb default '{}'::jsonb, -- e.g., { "cpu": "1 vCPU", "ram": "1GB" }
  stripe_price_id text, -- Seeded later or updated manually
  hostinger_plan_id text, -- Mapping to Hostinger
  created_at timestamp with time zone default now()
);

-- 2. Addons
create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_monthly numeric not null,
  stripe_price_id text,
  created_at timestamp with time zone default now()
);

-- 3. VPS Instances
create table if not exists public.vps_instances (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  plan_id uuid references public.vps_plans(id),
  status text not null check (status in ('provisioning', 'installing', 'running', 'stopped', 'error')),
  ip_address text,
  provider_id text, -- Hostinger Instance ID
  n8n_url text,
  n8n_credentials jsonb, -- Should be encrypted ideally, storing plainly for now/mock
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Team Addons
create table if not exists public.team_addons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete cascade,
  enabled boolean default true,
  config jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  unique(team_id, addon_id)
);

-- 5. Deployments
create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  vps_instance_id uuid references public.vps_instances(id) on delete set null,
  workflow_id text, -- n8n workflow ID
  status text not null check (status in ('pending', 'deploying', 'success', 'failed')),
  logs text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.vps_plans enable row level security;
alter table public.addons enable row level security;
alter table public.vps_instances enable row level security;
alter table public.team_addons enable row level security;
alter table public.deployments enable row level security;

-- Policies

-- VPS Plans (Public read)
create policy "VPS Plans are viewable by everyone"
  on public.vps_plans for select
  using (true);

-- Addons (Public read)
create policy "Addons are viewable by everyone"
  on public.addons for select
  using (true);

-- VPS Instances (Team access)
create policy "Team members can view their VPS instances"
  on public.vps_instances for select
  using (public.is_team_member(team_id));

create policy "Team admins can update their VPS instances"
  on public.vps_instances for update
  using (public.is_team_admin(team_id));

-- Team Addons (Team access)
create policy "Team members can view their addons"
  on public.team_addons for select
  using (public.is_team_member(team_id));

create policy "Team admins can manage addons"
  on public.team_addons for all
  using (public.is_team_admin(team_id));

-- Deployments (Team access)
create policy "Team members can view deployments"
  on public.deployments for select
  using (public.is_team_member(team_id));

-- Seed Data: VPS Plans
insert into public.vps_plans (name, slug, description, price_monthly, specs, stripe_price_id)
values
  ('Starter', 'starter', 'Perfect for small teams and pilots.', 7.50, '{"cpu": "1 vCPU", "ram": "4GB", "storage": "50GB"}', 'price_starter_placeholder'),
  ('Growth', 'growth', 'For growing teams with more workflows.', 11.25, '{"cpu": "2 vCPU", "ram": "8GB", "storage": "100GB"}', 'price_growth_placeholder'),
  ('Pro', 'pro', 'High performance for serious automation.', 15.00, '{"cpu": "4 vCPU", "ram": "16GB", "storage": "200GB"}', 'price_pro_placeholder'),
  ('Enterprise', 'enterprise', 'Maximum power and isolation.', 30.00, '{"cpu": "8 vCPU", "ram": "32GB", "storage": "400GB"}', 'price_enterprise_placeholder')
on conflict (slug) do nothing;

-- Seed Data: Addons
insert into public.addons (name, slug, description, price_monthly, stripe_price_id)
values
  ('RAG AI', 'rag-ai', 'Connect your documents to AI for context-aware answers.', 0.00, 'price_rag_placeholder'), -- Usage based? Or flat fee? Plan says usage based mostly, but also "Addons (workflows)". I'll put 0 for now or a base fee if implied. User said: "Addons (workflows)... Customer pays for VPS plan... Addons... AI usage".
  ('Content Generation', 'content-gen', 'AI-powered content creation workflows.', 0.00, 'price_content_placeholder'),
  ('Customer Chatbot', 'customer-chatbot', 'Deploy a custom chatbot for your customers.', 0.00, 'price_chatbot_placeholder'),
  ('Summarization', 'summarization', 'Automated document and meeting summarization.', 0.00, 'price_summarization_placeholder')
on conflict (slug) do nothing;

-- Add triggers for updated_at if needed (assuming moddatetime extension exists, or standard trigger)
-- For now we leave it simple.

