-- Extend documents to reference Supabase Storage objects (optional linkage)
alter table if exists public.documents
  add column if not exists bucket_id text,
  add column if not exists object_path text;

-- Helpful composite index for filtering by storage linkage
create index if not exists documents_storage_idx on public.documents(bucket_id, object_path);

-- RPC: search_storage_documents - searches team-scoped documents (from Supabase Storage ingestion)
-- Optional filters: bucket_id (storage bucket) and folder_id
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
      and d.context = ctx
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


