-- 0061_enhanced_chunk_metadata.sql
-- Add enhanced metadata fields for chunk filtering and security

-- Add indexes for new metadata fields
-- file_id: Uses object_path as unique identifier for source document
create index if not exists idx_documents_metadata_file_id 
  on documents using btree ((metadata->>'file_id'));

-- visibility_scope: internal (team only), public (all client chats), or restricted (specific clientCodes)
create index if not exists idx_documents_metadata_visibility_scope 
  on documents using btree ((metadata->>'visibility_scope'));

-- allowed_client_codes: Array of clientCodes that have access (only relevant for 'restricted' scope)
create index if not exists idx_documents_metadata_allowed_client_codes 
  on documents using gin ((metadata->'allowed_client_codes'));

-- Drop existing match_documents function versions
drop function if exists public.match_documents(vector(768), int, jsonb);

-- Create improved match_documents function with support for new metadata fields
create or replace function public.match_documents (
  query_embedding vector(768),       -- Input embedding from user query
  match_count int,                   -- Number of results to return
  filter jsonb default '{}'::jsonb   -- Must include team_id; may include visibility_scope, allowed_client_codes, etc
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
    -- OPTIONAL: Filter by visibility_scope if provided
    and (
      not (filter ? 'visibility_scope')
      or (metadata->>'visibility_scope') = (filter->>'visibility_scope')
      or (metadata->>'visibility_scope') is null  -- Allow legacy documents without visibility_scope
    )
    -- OPTIONAL: Filter by allowed_client_codes if visibility_scope is 'restricted'
    and (
      not (filter ? 'client_code')
      or coalesce(metadata->>'visibility_scope', 'internal') != 'restricted'
      or (metadata->'allowed_client_codes') @> to_jsonb(filter->>'client_code')
    )
    -- OPTIONAL: Filter by file_id if provided (for deleting all chunks of a file)
    and (
      not (filter ? 'file_id')
      or (metadata->>'file_id') = (filter->>'file_id')
    )
    -- OPTIONAL: Apply any additional metadata filters (excluding special filter keys)
    and (
      jsonb_strip_nulls(filter - 'team_id' - 'visibility_scope' - 'client_code' - 'file_id') = '{}'::jsonb 
      or metadata @> (filter - 'team_id' - 'visibility_scope' - 'client_code' - 'file_id')
    )
  order by embedding <#> query_embedding
  limit match_count;
$$;

-- Grant execute permissions
grant execute on function public.match_documents(vector(768), int, jsonb) to anon, authenticated, service_role;

-- Create a helper function to delete all chunks for a specific file
create or replace function public.delete_document_chunks(
  p_team_id text,
  p_file_id text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  delete from documents
  where (metadata->>'team_id') = p_team_id
    and (metadata->>'file_id') = p_file_id;
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.delete_document_chunks(text, text) to authenticated, service_role;
