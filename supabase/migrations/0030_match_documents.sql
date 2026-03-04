-- Match documents using pgvector with team/context/folder filtering
-- Assumes documents table with columns: id, team_id uuid, context text, folder_id text, embedding vector(1536), file_name text, content text

-- Preferred signature used by many vector clients (including n8n's Supabase vector store):
-- (query_embedding vector, match_count int, filter jsonb)
drop function if exists public.match_documents(vector, int, uuid, text, text, float);

create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  file_name text,
  content text,
  similarity float
)
language sql stable security definer set search_path = public as $$
  with params as (
    select 
      nullif(filter ->> 'team_id', '')::uuid as team_uuid,
      coalesce(filter ->> 'context', 'private') as ctx,
      nullif(filter ->> 'folder_id', '') as folder,
      coalesce((filter ->> 'min_similarity')::float, 0.1)::float as min_similarity
  ),
  ranked as (
    select d.id,
           d.file_name,
           d.content,
           (1 - (d.embedding <=> query_embedding))::float as similarity
    from public.documents d, params p
    where (p.team_uuid is null or d.team_id = p.team_uuid)
      and (p.ctx is null or d.context = p.ctx)
      and (p.folder is null or d.folder_id = p.folder)
      and d.embedding is not null
    order by d.embedding <=> query_embedding asc
    limit greatest(match_count, 1)
  )
  select * from ranked where similarity >= (select min_similarity from params)
$$;

grant execute on function public.match_documents(vector, int, jsonb) to anon, authenticated, service_role;


