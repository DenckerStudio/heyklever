-- Audit logs for critical actions

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null, -- e.g., 'team.created', 'integration.connected', 'billing.updated'
  target text, -- optional target id/type
  metadata jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists audit_logs_team_idx on public.audit_logs(team_id);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read
  on public.audit_logs for select
  using (public.is_team_member(team_id));

-- Writes allowed only by admins/owners
drop policy if exists audit_logs_write on public.audit_logs;
create policy audit_logs_write
  on public.audit_logs for insert
  with check (team_id is null or public.is_team_admin(team_id));


