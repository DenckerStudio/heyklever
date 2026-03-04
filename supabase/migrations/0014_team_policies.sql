-- RLS policies for teams and team_members to allow team creation and membership management

-- Teams
alter table public.teams enable row level security;

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member
  on public.teams for select
  using (public.is_team_member(id));

-- Allow any authenticated user to create a team
drop policy if exists teams_insert_auth on public.teams;
create policy teams_insert_auth
  on public.teams for insert
  with check (auth.uid() is not null);

-- Only admins/owners can update/delete their team (enforced via membership)
drop policy if exists teams_update_admin on public.teams;
create policy teams_update_admin
  on public.teams for update
  using (public.is_team_admin(id));

drop policy if exists teams_delete_admin on public.teams;
create policy teams_delete_admin
  on public.teams for delete
  using (public.is_team_admin(id));

-- Team Members
alter table public.team_members enable row level security;

drop policy if exists team_members_select_member on public.team_members;
create policy team_members_select_member
  on public.team_members for select
  using (public.is_team_member(team_id));

-- Allow a user to insert their own membership row (used right after creating a team)
drop policy if exists team_members_insert_self on public.team_members;
create policy team_members_insert_self
  on public.team_members for insert
  with check (user_id = auth.uid());

-- Only admins/owners can update/delete memberships
drop policy if exists team_members_update_admin on public.team_members;
create policy team_members_update_admin
  on public.team_members for update
  using (public.is_team_admin(team_id));

drop policy if exists team_members_delete_admin on public.team_members;
create policy team_members_delete_admin
  on public.team_members for delete
  using (public.is_team_admin(team_id));

-- Invites
alter table public.invites enable row level security;

drop policy if exists invites_select_member on public.invites;
create policy invites_select_member
  on public.invites for select
  using (public.is_team_member(team_id));

drop policy if exists invites_insert_admin on public.invites;
create policy invites_insert_admin
  on public.invites for insert
  with check (public.is_team_admin(team_id));

drop policy if exists invites_update_admin on public.invites;
create policy invites_update_admin
  on public.invites for update
  using (public.is_team_admin(team_id));

drop policy if exists invites_delete_admin on public.invites;
create policy invites_delete_admin
  on public.invites for delete
  using (public.is_team_admin(team_id));


