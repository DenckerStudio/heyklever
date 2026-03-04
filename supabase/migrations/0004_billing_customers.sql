-- Billing customers mapping (Stripe customer per team)

create table if not exists public.billing_customers (
  team_id uuid primary key references public.teams(id) on delete cascade,
  customer_id text not null unique, -- Stripe customer id
  created_at timestamp with time zone not null default now()
);

alter table public.billing_customers enable row level security;

drop policy if exists billing_customers_team_read on public.billing_customers;
create policy billing_customers_team_read
  on public.billing_customers for select
  using (public.is_team_member(team_id));

drop policy if exists billing_customers_team_write on public.billing_customers;
create policy billing_customers_team_write
  on public.billing_customers for insert
  with check (public.is_team_admin(team_id));


