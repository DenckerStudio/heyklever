-- 🔧 Create documents table and match_documents function
-- This ensures multi-tenant isolation and proper context filtering

-- 🧠 Enable pgvector to store and search vector embeddings
create extension if not exists vector;

-- 📚 Simple documents table for multi-tenant RAG
-- All metadata (team_id, context, file_name, etc) is stored in the metadata JSONB column
create table if not exists documents (
  id bigserial primary key,                -- Unique ID for each chunk
  content text,                            -- Chunk content (pageContent)
  metadata jsonb default '{}'::jsonb,      -- All metadata: team_id, context, file_name, enrichment, etc
  embedding vector(768)                    -- Gemini embedding (768 dims)
                                           -- ⚠️ If using OpenAI: vector(1536)
);

-- Helpful indexes for performance
-- GIN index for general metadata queries
create index if not exists idx_documents_metadata_gin on documents using gin (metadata);

-- B-tree indexes for specific metadata fields that we filter on frequently
create index if not exists idx_documents_metadata_team_id 
  on documents using btree ((metadata->>'team_id'));

create index if not exists idx_documents_metadata_context 
  on documents using btree ((metadata->>'context'));

-- Composite index for team_id + context (most common query pattern)
create index if not exists idx_documents_team_context 
  on documents using btree ((metadata->>'team_id'), (metadata->>'context'));

-- Note: Vector index will be created after some data is inserted
-- Run this separately after you have at least 1000 rows:
-- create index if not exists idx_documents_embedding on documents 
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Drop existing function versions
drop function if exists public.match_documents(jsonb, int, vector);
drop function if exists public.match_documents(int, vector, jsonb);
drop function if exists public.match_documents(vector, int);
drop function if exists public.match_documents(vector, int, jsonb);

-- Create improved match function with mandatory team_id and context filtering
create or replace function public.match_documents (
  query_embedding vector(768),       -- Input embedding from user query
  match_count int,                   -- Number of results to return
  filter jsonb default '{}'::jsonb   -- Must include team_id and context; may include others
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  embedding vector(768),
  similarity float                   -- Cosine similarity score
)
language sql stable
as $$
  select
    id,
    content,
    metadata,
    embedding,
    1 - (embedding <#> query_embedding) as similarity
  from documents
  where 
    -- MANDATORY: Filter by team_id (multi-tenant isolation)
    (filter ? 'team_id' and (metadata->>'team_id') = (filter->>'team_id'))
    -- MANDATORY: Filter by context (public/private)
    and (filter ? 'context' and (metadata->>'context') = (filter->>'context'))
    -- OPTIONAL: Apply any additional metadata filters
    and (
      jsonb_strip_nulls(filter - 'team_id' - 'context') = '{}'::jsonb 
      or metadata @> (filter - 'team_id' - 'context')
    )
  order by embedding <#> query_embedding
  limit match_count;
$$;
