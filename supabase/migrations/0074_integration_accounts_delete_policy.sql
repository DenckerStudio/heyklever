-- Allow team admins to delete integration accounts (required for Disconnect)
drop policy if exists integration_accounts_delete on public.integration_accounts;
create policy integration_accounts_delete
  on public.integration_accounts for delete
  using (public.is_team_admin(team_id));
