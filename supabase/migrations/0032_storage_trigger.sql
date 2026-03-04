-- Trigger function to upsert documents rows when files are uploaded to Supabase Storage via edge function/webhook pipeline
-- This assumes you call this via an HTTP endpoint or task that passes team_id, context, and content extraction.

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
  insert into public.documents (team_id, context, bucket_id, object_path, folder_id, file_name, content)
  values (p_team_id, p_context, p_bucket_id, p_object_path, split_part(p_object_path, '/', 1) || '/' || split_part(p_object_path, '/', 2) || '/' || split_part(p_object_path, '/', 3), p_file_name, p_content)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.documents where team_id = p_team_id and object_path = p_object_path;
    update public.documents set content = p_content, updated_at = now() where id = v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_document_from_storage(uuid, text, text, text, text, text) to anon, authenticated, service_role;


