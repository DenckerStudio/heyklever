-- Profiles & Teams enhancements for multi-team default handling

-- 1) Ensure teams has a description column used by the app layer
alter table public.teams add column if not exists description text;

-- 2) Helpful indexes
-- Speed up lookups by default team
create index if not exists profiles_default_team_id_idx on public.profiles(default_team_id);
-- Speed up membership lookups by user
create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- 3) Secure helper to set the current user's default team
--    Verifies membership before updating profile
create or replace function public.set_default_team(p_team_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Verify user is a member of the team
  if not exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = v_user_id
  ) then
    raise exception 'User is not a member of this team';
  end if;

  -- Update default team on profile
  update public.profiles
  set default_team_id = p_team_id,
      updated_at = now()
  where id = v_user_id;

  return true;
end;
$$;

grant execute on function public.set_default_team(uuid) to authenticated;


