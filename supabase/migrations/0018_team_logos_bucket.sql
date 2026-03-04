-- Storage bucket for team logos and teams.logo_url column

-- 1) Add logo_url column to teams
alter table public.teams add column if not exists logo_url text;

-- 2) Create storage bucket if not exists
insert into storage.buckets (id, name, public)
select 'team-logos', 'team-logos', true
where not exists (select 1 from storage.buckets where id = 'team-logos');

-- 3) RLS policies on storage.objects for 'team-logos'
-- Enable RLS (Storage uses RLS tables by default)

-- Policy: anyone can read team logos (public bucket)
drop policy if exists "Public read team logos" on storage.objects;
create policy "Public read team logos"
on storage.objects for select
using ( bucket_id = 'team-logos' );

-- Policy: only team admins/owners can insert/update/delete their team's logo path
-- We encode team id in object path as: {team_id}/logo.png inside bucket 'team-logos'
drop policy if exists "Admins can manage their team logo" on storage.objects;
create policy "Admins can manage their team logo"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'team-logos'
  and (
    case
      when (position('/' in name) > 0) then public.is_team_admin((split_part(name, '/', 1))::uuid)
      else false
    end
  )
)
with check (
  bucket_id = 'team-logos'
  and (
    case
      when (position('/' in name) > 0) then public.is_team_admin((split_part(name, '/', 1))::uuid)
      else false
    end
  )
);


