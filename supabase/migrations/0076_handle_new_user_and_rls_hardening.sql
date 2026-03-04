-- Phase 1: handle_new_user trigger and RLS hardening for IT-administrasjonsplattform
-- 1. handle_new_user: create profile and optionally set default_team_id when a new auth user is created
-- 2. RLS on documents (tenant data in metadata->>'team_id')
-- 3. RLS policies on subscriptions (had RLS enabled but no policies)

-- ---------------------------------------------------------------------------
-- 1. handle_new_user trigger on auth.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_full_name text;
begin
  v_email := coalesce(NEW.email, '');
  v_full_name := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(NEW.raw_user_meta_data->>'name'), ''),
    ''
  );
  insert into public.profiles (id, email, full_name)
  values (NEW.id, v_email, v_full_name)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(trim(profiles.full_name), ''), excluded.full_name),
    updated_at = now();
  return NEW;
end;
$$;

-- Trigger on auth.users (Supabase auth schema)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. RLS on documents table (multi-tenant via metadata->>'team_id')
-- ---------------------------------------------------------------------------
alter table if exists public.documents enable row level security;

-- Allow select when user is member of the team stored in document metadata
drop policy if exists documents_select_team_member on public.documents;
create policy documents_select_team_member
  on public.documents for select
  using (
    (metadata->>'team_id')::uuid in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Allow insert when user is member of the team they are inserting for
drop policy if exists documents_insert_team_member on public.documents;
create policy documents_insert_team_member
  on public.documents for insert
  with check (
    (metadata->>'team_id')::uuid in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Allow update when user is member of the team
drop policy if exists documents_update_team_member on public.documents;
create policy documents_update_team_member
  on public.documents for update
  using (
    (metadata->>'team_id')::uuid in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Allow delete when user is member of the team
drop policy if exists documents_delete_team_member on public.documents;
create policy documents_delete_team_member
  on public.documents for delete
  using (
    (metadata->>'team_id')::uuid in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. RLS policies on subscriptions (team_id scoped)
-- ---------------------------------------------------------------------------
-- subscriptions already has RLS enabled in 0001_init.sql but had no policies

drop policy if exists subscriptions_select_team_member on public.subscriptions;
create policy subscriptions_select_team_member
  on public.subscriptions for select
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Only service_role / backend should insert/update/delete (e.g. Stripe webhook)
-- Restrict write to team admins for app-initiated changes if any
drop policy if exists subscriptions_insert_admin on public.subscriptions;
create policy subscriptions_insert_admin
  on public.subscriptions for insert
  with check (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid() and role in ('owner','admin')
    )
  );

drop policy if exists subscriptions_update_admin on public.subscriptions;
create policy subscriptions_update_admin
  on public.subscriptions for update
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid() and role in ('owner','admin')
    )
  );

drop policy if exists subscriptions_delete_admin on public.subscriptions;
create policy subscriptions_delete_admin
  on public.subscriptions for delete
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. RPC for tenant resolution: return team_id by slug only if user is member
--    (used by middleware for subdomain/path-based tenant routing)
-- ---------------------------------------------------------------------------
create or replace function public.get_team_id_by_slug(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teams t
  join public.team_members tm on tm.team_id = t.id
  where t.slug = p_slug and tm.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_team_id_by_slug(text) to authenticated;
grant execute on function public.get_team_id_by_slug(text) to service_role;
