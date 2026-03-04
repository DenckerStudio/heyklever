-- 0046_ai_documents_table.sql

create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  file_name text not null,
  content text,
  bucket_id text,
  object_path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists ai_documents_team_idx on public.ai_documents(team_id);
create index if not exists ai_documents_object_path_idx on public.ai_documents(object_path);

-- RLS
alter table public.ai_documents enable row level security;

-- Policy: Team Members can view Team Docs (Public/Private folders)
create policy "Team Members can view Team Docs"
on public.ai_documents for select
to authenticated
using (
  public.is_team_member(team_id)
  and (
    object_path like 'teams/%/Public/AI-Docs/%' 
    or object_path like 'teams/%/Private/AI-Docs/%'
  )
);

-- Policy: Users can view their own Personal Docs
create policy "Users can view their own Personal Docs"
on public.ai_documents for select
to authenticated
using (
  public.is_team_member(team_id)
  and object_path like 'teams/%/members/' || auth.uid() || '/AI-Docs/%'
);

-- Policy: Service Role (Admin) has full access
create policy "Service Role has full access"
on public.ai_documents
using (true)
with check (true);

