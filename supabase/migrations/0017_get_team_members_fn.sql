-- Drop old signature to allow return type changes
drop function if exists public.get_team_members(uuid);

-- Secure function to list team members with profile info
create or replace function public.get_team_members(p_team_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  role text,
  created_at timestamp with time zone
) as $$
  select tm.user_id, p.email, coalesce(p.full_name, ''), p.avatar_url, tm.role, tm.created_at
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = p_team_id
    and public.is_team_member(tm.team_id);
$$ language sql security definer set search_path = public;

grant execute on function public.get_team_members(uuid) to authenticated;

