-- Phase 6: Usage events and AI credits for hybrid pricing / metering

-- 1. usage_events: raw events for metering (n8n, app) -> later aggregate to Stripe or usage_metrics
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  metric_type text not null,
  quantity numeric not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists usage_events_team_created_idx on public.usage_events(team_id, created_at desc);
create index if not exists usage_events_metric_idx on public.usage_events(team_id, metric_type, created_at desc);

alter table public.usage_events enable row level security;
-- Only service_role or backend should insert (metering webhook); team members can read their team's events
create policy "Team members can view usage_events"
  on public.usage_events for select
  using (public.is_team_member(team_id));

-- 2. team_credits: AI credits balance per team (consumed by RAG/chat, topped up by plan or purchase)
create table if not exists public.team_credits (
  team_id uuid primary key references public.teams(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamp with time zone not null default now()
);

alter table public.team_credits enable row level security;
create policy "Team members can view team_credits"
  on public.team_credits for select
  using (public.is_team_member(team_id));
create policy "Team admins can update team_credits"
  on public.team_credits for all
  using (public.is_team_admin(team_id));

-- 3. Extend usage_metrics allowed metric_type for IT platform overage (screens, storage_gb, assets_count, ai_credits)
alter table public.usage_metrics drop constraint if exists usage_metrics_metric_type_check;
alter table public.usage_metrics add constraint usage_metrics_metric_type_check check (
  metric_type in (
    'tokens', 'tokens_input', 'tokens_output', 'documents', 'chat_messages',
    'rag_input_tokens', 'rag_output_tokens', 'rag_queries', 'content_output_tokens', 'content_input_tokens',
    'summary_tokens', 'chatbot_messages', 'chatbot_tokens',
    'screens', 'storage_gb', 'assets_count', 'ai_credits'
  )
);
