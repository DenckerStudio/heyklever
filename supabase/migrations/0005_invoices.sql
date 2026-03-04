-- Invoices table (mirror from Stripe)

create table if not exists public.invoices (
  id text primary key, -- stripe invoice id
  team_id uuid not null references public.teams(id) on delete cascade,
  customer_id text not null, -- stripe customer id
  status text,
  amount_due bigint,
  amount_paid bigint,
  amount_remaining bigint,
  currency text,
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create index if not exists invoices_team_id_idx on public.invoices(team_id);

alter table public.invoices enable row level security;

drop policy if exists invoices_team_read on public.invoices;
create policy invoices_team_read
  on public.invoices for select
  using (public.is_team_member(team_id));


