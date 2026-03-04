-- Migrate context usage to metadata->>'context'
-- This updates RPCs and trigger to no longer rely on a removed documents.context column.

-- Safe: drop old index if it existed on (team_id, context)
do $$ begin
  begin
    execute 'drop index if exists documents_team_context_idx';
  exception when others then
    -- ignore if it fails (e.g., index already gone)
    null;
  end;
end $$;

-- Create expression index for metadata context lookups
create index if not exists documents_team_metadata_context_idx
  on public.documents (team_id, ((metadata->>'context')));

-- search_documents: compare ctx against metadata->>'context'
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
           ts_rank_cd(to_tsvector('simple', coalesce(d.content,'')), plainto_tsquery('simple', query_text)) as fts_score
    from public.documents d
    where d.team_id = team_uuid
      and coalesce(d.metadata->>'context','private') = ctx
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

-- search_storage_documents: compare ctx against metadata->>'context'
create or replace function public.search_storage_documents(
  query_text text,
  team_uuid uuid,
  ctx text default 'private',
  bucket text default null,
  folder text default null,
  limit_count int default 5
) returns table (
  file_name text,
  bucket_id text,
  object_path text,
  content_snippet text,
  score real
) language sql stable security definer set search_path = public as $$
  with base as (
    select d.file_name,
           d.bucket_id,
           d.object_path,
           d.content,
           ts_rank_cd(to_tsvector('simple', coalesce(d.content,'')), plainto_tsquery('simple', query_text)) as fts_score
    from public.documents d
    where d.team_id = team_uuid
      and coalesce(d.metadata->>'context','private') = ctx
      and (folder is null or d.folder_id = folder)
      and (bucket is null or d.bucket_id = bucket)
  )
  select b.file_name,
         b.bucket_id,
         b.object_path,
         substring(coalesce(b.content,'') from 1 for 1200) as content_snippet,
         coalesce(b.fts_score, 0)::real as score
  from base b
  order by b.fts_score desc nulls last
  limit greatest(limit_count, 1)
$$;

grant execute on function public.search_storage_documents(text, uuid, text, text, text, int) to anon, authenticated, service_role;

-- match_documents: filter on metadata->>'context'
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
      and (p.ctx is null or coalesce(d.metadata->>'context','private') = p.ctx)
      and (p.folder is null or d.folder_id = p.folder)
      and d.embedding is not null
    order by d.embedding <=> query_embedding asc
    limit greatest(match_count, 1)
  )
  select * from ranked where similarity >= (select min_similarity from params)
$$;

grant execute on function public.match_documents(vector, int, jsonb) to anon, authenticated, service_role;

-- upsert_document_from_storage: write context into metadata, not a column
create or replace function public.upsert_document_from_storage(
  p_team_id uuid,
  p_context text,
  p_bucket_id text,
  p_object_path text,
  p_file_name text,
  p_content text
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into public.documents (team_id, bucket_id, object_path, folder_id, file_name, content, metadata)
  values (
    p_team_id,
    p_bucket_id,
    p_object_path,
    split_part(p_object_path, '/', 1) || '/' || split_part(p_object_path, '/', 2) || '/' || split_part(p_object_path, '/', 3),
    p_file_name,
    p_content,
    jsonb_build_object('context', p_context)
  )
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.documents where team_id = p_team_id and object_path = p_object_path;
    update public.documents
      set content = p_content,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('context', p_context),
          updated_at = now()
      where id = v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_document_from_storage(uuid, text, text, text, text, text) to anon, authenticated, service_role;


