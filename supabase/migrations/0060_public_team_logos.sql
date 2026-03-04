-- Storage policy to allow public read access to team logo files
-- Pattern: teams/{team_id}/logo.*

-- Policy: anyone can read team logos (public access)
-- Pattern: teams/{team_id}/logo.{ext}
drop policy if exists "Public read team logos in teams bucket" on storage.objects;
create policy "Public read team logos in teams bucket"
on storage.objects for select
to public
using (
  bucket_id = 'team-files'
  and name ~ '^teams/[^/]+/logo\.(png|jpg|jpeg|gif|webp|svg)$'
);

-- Policy: team admins/owners can manage their team logo
drop policy if exists "Admins can manage team logo in teams bucket" on storage.objects;
create policy "Admins can manage team logo in teams bucket"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'team-files'
  and name ~ '^teams/[^/]+/logo\.(png|jpg|jpeg|gif|webp|svg)$'
  and (
    case
      when (split_part(name, '/', 2) != '') then 
        public.is_team_admin((split_part(name, '/', 2))::uuid)
      else false
    end
  )
)
with check (
  bucket_id = 'team-files'
  and name ~ '^teams/[^/]+/logo\.(png|jpg|jpeg|gif|webp|svg)$'
  and (
    case
      when (split_part(name, '/', 2) != '') then 
        public.is_team_admin((split_part(name, '/', 2))::uuid)
      else false
    end
  )
);

