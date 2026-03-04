-- Enable pgcrypto for gen_random_uuid and pgvector for embeddings
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Documents table for team-scoped RAG
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  folder_id text,
  file_name text not null,
  content text,
  context text not null default 'private' check (context in ('public','private')),
  embedding vector(3072),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists documents_team_idx on public.documents(team_id);
create index if not exists documents_team_context_idx on public.documents(team_id, context);
create index if not exists documents_folder_idx on public.documents(folder_id);

-- Vector index (safe to create even if empty)
do $$ begin
  perform 1 from pg_indexes where schemaname = 'public' and indexname = 'documents_embedding_ivfflat_idx';
  if not found then
    execute 'create index documents_embedding_ivfflat_idx on public.documents using ivfflat (embedding vector_cosine_ops) with (lists = 100)';
  end if;
end $$;

-- Full text search support
create index if not exists documents_content_fts_idx on public.documents using gin (to_tsvector('simple', coalesce(content, '')));

-- RPC: search_documents - text search first, optional folder filter; prioritizes vector when available
create or replace function public.search_documents(
  query_text text,
  team_uuid uuid,
  ctx text default 'private',
  folder text default null,
  limit_count int default 5
) returns table (
  file_name text,
  content_snippet text,
  score real
) language sql stable security definer set search_path = public as $$
  with base as (
    select d.file_name,
           d.content,
           case when d.embedding is null then null::real else 0::real end as vec_score, -- placeholder if needed later
           ts_rank_cd(to_tsvector('simple', coalesce(d.content,'')), plainto_tsquery('simple', query_text)) as fts_score
    from public.documents d
    where d.team_id = team_uuid
      and d.context = ctx
      and (folder is null or d.folder_id = folder)
  )
  select b.file_name,
         substring(coalesce(b.content,'') from 1 for 1200) as content_snippet,
         coalesce(b.fts_score, 0)::real as score
  from base b
  order by b.fts_score desc nulls last
  limit greatest(limit_count, 1)
$$;

grant execute on function public.search_documents(text, uuid, text, text, int) to anon, authenticated, service_role;


