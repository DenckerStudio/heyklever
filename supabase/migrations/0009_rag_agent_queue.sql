-- RAG Agent: queue items for n8n backend processing

create table if not exists public.rag_agent_queue (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('google_drive','onedrive','manual')),
  action text not null check (action in ('index','reindex','delete')),
  payload jsonb not null, -- exact payload to send to n8n
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamp with time zone not null default now(),
  processed_at timestamp with time zone
);

create index if not exists rag_queue_team_status_idx on public.rag_agent_queue(team_id, status);

alter table public.rag_agent_queue enable row level security;

drop policy if exists rag_queue_read on public.rag_agent_queue;
create policy rag_queue_read
  on public.rag_agent_queue for select
  using (public.is_team_member(team_id));

drop policy if exists rag_queue_write on public.rag_agent_queue;
create policy rag_queue_write
  on public.rag_agent_queue for insert
  with check (public.is_team_admin(team_id));

drop policy if exists rag_queue_update on public.rag_agent_queue;
create policy rag_queue_update
  on public.rag_agent_queue for update
  using (public.is_team_admin(team_id));


