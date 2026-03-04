-- 0045_ai_docs_storage_policy.sql

-- 1. Ensure 'team-files' bucket exists
insert into storage.buckets (id, name, public)
select 'team-files', 'team-files', false
where not exists (select 1 from storage.buckets where id = 'team-files');

-- Ensure documents table has object_path column (in case migration 0029 wasn't run)
alter table public.documents add column if not exists object_path text;

-- 2. Drop existing policies that might conflict or be too broad if we want strict control
-- (We'll assume we are adding to existing policies, but careful about overlap)

-- 3. PERSONAL DOCS Policies
-- Pattern: teams/{team_id}/members/{user_id}/AI-Docs/*

drop policy if exists "Personal AI Docs Read" on storage.objects;
create policy "Personal AI Docs Read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'team-files'
  and name like 'teams/%/members/' || auth.uid() || '/AI-Docs/%'
);

drop policy if exists "Personal AI Docs Insert" on storage.objects;
create policy "Personal AI Docs Insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'team-files'
  and name like 'teams/%/members/' || auth.uid() || '/AI-Docs/%'
);

drop policy if exists "Personal AI Docs Update" on storage.objects;
create policy "Personal AI Docs Update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'team-files'
  and name like 'teams/%/members/' || auth.uid() || '/AI-Docs/%'
);

drop policy if exists "Personal AI Docs Delete" on storage.objects;
create policy "Personal AI Docs Delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'team-files'
  and name like 'teams/%/members/' || auth.uid() || '/AI-Docs/%'
);

-- 4. TEAM DOCS Policies
-- Pattern: teams/{team_id}/(Public|Private)/AI-Docs/*

drop policy if exists "Team AI Docs Read" on storage.objects;
create policy "Team AI Docs Read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'team-files'
  and (name like 'teams/%/Public/AI-Docs/%' or name like 'teams/%/Private/AI-Docs/%')
  and public.is_team_member((split_part(name, '/', 2))::uuid)
);

drop policy if exists "Team AI Docs Insert" on storage.objects;
create policy "Team AI Docs Insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'team-files'
  and (name like 'teams/%/Public/AI-Docs/%' or name like 'teams/%/Private/AI-Docs/%')
  and public.is_team_member((split_part(name, '/', 2))::uuid)
);

drop policy if exists "Team AI Docs Update" on storage.objects;
create policy "Team AI Docs Update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'team-files'
  and (name like 'teams/%/Public/AI-Docs/%' or name like 'teams/%/Private/AI-Docs/%')
  and public.is_team_member((split_part(name, '/', 2))::uuid)
);

drop policy if exists "Team AI Docs Delete" on storage.objects;
create policy "Team AI Docs Delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'team-files'
  and (name like 'teams/%/Public/AI-Docs/%' or name like 'teams/%/Private/AI-Docs/%')
  and public.is_team_member((split_part(name, '/', 2))::uuid)
);

-- 5. Helper function update (optional but good practice)
-- Update upsert_document_from_storage to NOT rely on context parameter but derive from path if needed?
-- For now, we will handle logic in the webhook/API level as requested ("Fix up the mistakes with context").

