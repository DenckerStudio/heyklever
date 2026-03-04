-- Stripe Webhook Events for auditing/debugging

create table if not exists public.stripe_webhook_events (
  id text primary key, -- stripe event id
  type text not null,
  data jsonb not null,
  received_at timestamp with time zone not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- Restrict to service role (no user access). Keep table for ops only.
drop policy if exists stripe_events_block_all on public.stripe_webhook_events;
create policy stripe_events_block_all on public.stripe_webhook_events
  for all using (false) with check (false);


