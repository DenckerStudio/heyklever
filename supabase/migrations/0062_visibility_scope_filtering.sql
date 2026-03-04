-- 0062_visibility_scope_filtering.sql
-- Update match_documents function to properly handle team vs client visibility filtering

-- Drop existing match_documents function
drop function if exists public.match_documents(vector(768), int, jsonb);

-- Create improved match_documents function with proper visibility filtering
-- visibility_scope filter values:
--   'team': returns documents with visibility_scope IN ('internal', 'public')
--   'client': returns documents with visibility_scope IN ('public', 'restricted')
--   or specific value to match exactly
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
    -- VISIBILITY SCOPE FILTERING
    and (
      -- No visibility filter provided: default to internal behavior (team access)
      not (filter ? 'visibility_scope')
      -- Team access: return internal and public documents
      or (
        (filter->>'visibility_scope') = 'team' 
        and coalesce(metadata->>'visibility_scope', 'internal') in ('internal', 'public')
      )
      -- Client access: return public and (restricted if client_code matches)
      or (
        (filter->>'visibility_scope') = 'client'
        and (
          coalesce(metadata->>'visibility_scope', 'internal') = 'public'
          or (
            coalesce(metadata->>'visibility_scope', 'internal') = 'restricted'
            and (
              filter ? 'allowed_client_codes'
              and metadata->'allowed_client_codes' ?| (
                select array_agg(value::text) 
                from jsonb_array_elements_text(filter->'allowed_client_codes')
              )
            )
          )
        )
      )
      -- Direct visibility_scope match (e.g., 'internal', 'public', 'restricted')
      or (
        (filter->>'visibility_scope') not in ('team', 'client')
        and (
          coalesce(metadata->>'visibility_scope', 'internal') = (filter->>'visibility_scope')
          or (metadata->>'visibility_scope') is null  -- Allow legacy documents
        )
      )
    )
    -- OPTIONAL: Filter by file_id if provided (for deleting all chunks of a file)
    and (
      not (filter ? 'file_id')
      or (metadata->>'file_id') = (filter->>'file_id')
    )
    -- OPTIONAL: Apply any additional metadata filters (excluding special filter keys)
    and (
      jsonb_strip_nulls(filter - 'team_id' - 'visibility_scope' - 'allowed_client_codes' - 'file_id' - 'context') = '{}'::jsonb 
      or metadata @> (filter - 'team_id' - 'visibility_scope' - 'allowed_client_codes' - 'file_id' - 'context')
    )
  order by embedding <#> query_embedding
  limit match_count;
$$;

-- Grant execute permissions
grant execute on function public.match_documents(vector(768), int, jsonb) to anon, authenticated, service_role;

-- Add comment explaining the visibility logic
comment on function public.match_documents(vector(768), int, jsonb) is 
'Semantic document search with visibility-based access control.

Filter parameters:
- team_id (required): Multi-tenant isolation
- visibility_scope: 
  - "team": Returns documents with visibility_scope IN (internal, public)
  - "client": Returns documents with visibility_scope IN (public, restricted)
  - or specific value ("internal", "public", "restricted") for exact match
- allowed_client_codes: Array of client codes for restricted document access
- file_id: Filter by source file identifier

Usage in n8n:
- Team chat: { "team_id": "...", "visibility_scope": "team" }
- Client chat: { "team_id": "...", "visibility_scope": "client", "allowed_client_codes": ["CODE1"] }
';
