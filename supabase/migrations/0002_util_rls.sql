-- Utility functions for Row Level Security (RLS)
-- These helpers allow concise policy definitions across team-scoped tables

-- is current auth user a member of given team
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  );
$$;

-- is current auth user an admin/owner of given team
create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid() and tm.role in ('owner','admin')
  );
$$;


