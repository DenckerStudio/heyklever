
-- Updates to existing tables
alter table public.teams add column if not exists slug text unique;

-- Drop existing function if it exists to avoid signature conflicts if arguments changed
drop function if exists public.create_team(text);
drop function if exists public.create_team(text, text);

-- Create Team RPC
create or replace function public.create_team(p_name text, p_slug text default null)
returns uuid
language plpgsql
security definer
as $$
declare
  v_team_id uuid;
  v_slug text;
begin
  -- Generate slug if not provided or clean it up
  v_slug := coalesce(p_slug, lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')));
  
  -- Ensure slug is unique (simple check, let DB constraint fail if duplicate)
  -- Or handle it. For now let it fail.

  -- Insert team
  insert into public.teams (name, slug)
  values (p_name, v_slug)
  returning id into v_team_id;

  -- Add current user as owner
  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, auth.uid(), 'owner');

  return v_team_id;
end;
$$;


-- VPS Plans Table (Recreate if column missing)
create table if not exists public.vps_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric not null,
  stripe_price_id text,
  specs jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Ensure columns exist (if table already existed)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'vps_plans' and column_name = 'price') then
        alter table public.vps_plans add column price numeric not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'vps_plans' and column_name = 'stripe_price_id') then
        alter table public.vps_plans add column stripe_price_id text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'vps_plans' and column_name = 'specs') then
        alter table public.vps_plans add column specs jsonb default '{}'::jsonb;
    end if;
end $$;


-- Addons Table
create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric not null,
  stripe_price_id text,
  type text not null check (type in ('recurring', 'one_time')),
  created_at timestamp with time zone default now()
);

-- Ensure columns exist for addons
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'addons' and column_name = 'price') then
        alter table public.addons add column price numeric not null default 0;
    end if;
     if not exists (select 1 from information_schema.columns where table_name = 'addons' and column_name = 'stripe_price_id') then
        alter table public.addons add column stripe_price_id text;
    end if;
end $$;


-- Team Addons Table
create table if not exists public.team_addons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  addon_id uuid references public.addons(id) on delete cascade,
  status text not null default 'active',
  created_at timestamp with time zone default now(),
  unique(team_id, addon_id)
);

-- VPS Instances Table
create table if not exists public.vps_instances (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade unique, -- One VPS per team
  plan_id uuid references public.vps_plans(id),
  ip_address text,
  status text not null default 'provisioning' check (status in ('provisioning', 'installing_n8n', 'running', 'stopped', 'error')),
  provider_id text,
  n8n_url text,
  n8n_api_key text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Deployments Table
create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  status text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- RLS Policies

-- vps_plans: public read, admin write
alter table public.vps_plans enable row level security;
drop policy if exists "Allow public read access to vps_plans" on public.vps_plans;
create policy "Allow public read access to vps_plans" on public.vps_plans for select using (true);

-- addons: public read, admin write
alter table public.addons enable row level security;
drop policy if exists "Allow public read access to addons" on public.addons;
create policy "Allow public read access to addons" on public.addons for select using (true);

-- team_addons: team read, team owner/admin write
alter table public.team_addons enable row level security;
drop policy if exists "Team members can view their addons" on public.team_addons;
create policy "Team members can view their addons" on public.team_addons
  for select using (public.is_team_member(team_id));
drop policy if exists "Team admins can manage addons" on public.team_addons;
create policy "Team admins can manage addons" on public.team_addons
  for all using (public.is_team_admin(team_id));

-- vps_instances: team read, system write (or team admin for limited updates)
alter table public.vps_instances enable row level security;
drop policy if exists "Team members can view their vps" on public.vps_instances;
create policy "Team members can view their vps" on public.vps_instances
  for select using (public.is_team_member(team_id));
-- Note: Provisioning service usually runs with service role, bypassing RLS.

-- deployments: team read
alter table public.deployments enable row level security;
drop policy if exists "Team members can view deployments" on public.deployments;
create policy "Team members can view deployments" on public.deployments
  for select using (public.is_team_member(team_id));


-- Seed Data

-- VPS Plans
insert into public.vps_plans (name, slug, price, stripe_price_id, specs) values
('Starter', 'starter', 7.50, 'price_starter_placeholder', '{"cpu": "1 vCPU", "ram": "1GB", "storage": "20GB SSD"}'::jsonb),
('Growth', 'growth', 11.25, 'price_growth_placeholder', '{"cpu": "2 vCPU", "ram": "2GB", "storage": "40GB SSD"}'::jsonb),
('Pro', 'pro', 15.00, 'price_pro_placeholder', '{"cpu": "2 vCPU", "ram": "4GB", "storage": "80GB SSD"}'::jsonb),
('Enterprise', 'enterprise', 30.00, 'price_enterprise_placeholder', '{"cpu": "4 vCPU", "ram": "8GB", "storage": "160GB SSD"}'::jsonb)
on conflict (slug) do nothing;

-- Addons
insert into public.addons (name, slug, description, price, stripe_price_id, type) values
('RAG AI', 'rag-ai', 'Retrieval Augmented Generation for your docs', 0, 'price_rag_placeholder', 'recurring'),
('Content Generation', 'content-gen', 'AI-powered content creation tools', 0, 'price_content_placeholder', 'recurring'),
('Customer Chatbot', 'chatbot', 'Embeddable AI chatbot for your site', 0, 'price_chatbot_placeholder', 'recurring'),
('Summarization', 'summarization', 'Auto-summarize long documents', 0, 'price_summarization_placeholder', 'recurring')
on conflict (slug) do nothing;
