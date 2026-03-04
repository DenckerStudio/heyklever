-- Tenancy core
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','admin','member','viewer')),
  created_at timestamp with time zone default now(),
  primary key(team_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null,
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone
);

-- Subscriptions (Stripe refs)
create table if not exists public.subscriptions (
  id text primary key, -- stripe subscription id
  team_id uuid references public.teams(id) on delete cascade,
  customer_id text, -- stripe customer id
  price_id text,
  status text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Policies (example; adjust in Supabase dashboard)
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.invites enable row level security;
alter table public.subscriptions enable row level security;


