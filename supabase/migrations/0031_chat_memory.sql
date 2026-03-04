create extension if not exists pgcrypto;

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  team_id uuid references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  team_id uuid references public.teams(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx on public.chat_messages(session_id, created_at);
create index if not exists chat_messages_team_idx on public.chat_messages(team_id);

grant select, insert, update, delete on public.chat_sessions to anon, authenticated, service_role;
grant select, insert, update, delete on public.chat_messages to anon, authenticated, service_role;


