-- Track storage sync and indexing jobs per team/provider

create table if not exists public.storage_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  provider text not null check (provider in ('google_drive','onedrive')),
  started_at timestamp with time zone not null default now(),
  finished_at timestamp with time zone,
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  stats jsonb, -- optional counters: files_scanned, files_indexed, errors, etc.
  error text
);

create index if not exists storage_sync_jobs_team_idx on public.storage_sync_jobs(team_id);

alter table public.storage_sync_jobs enable row level security;

drop policy if exists storage_sync_read on public.storage_sync_jobs;
create policy storage_sync_read
  on public.storage_sync_jobs for select
  using (public.is_team_member(team_id));

drop policy if exists storage_sync_write on public.storage_sync_jobs;
create policy storage_sync_write
  on public.storage_sync_jobs for insert
  with check (public.is_team_admin(team_id));

drop policy if exists storage_sync_update on public.storage_sync_jobs;
create policy storage_sync_update
  on public.storage_sync_jobs for update
  using (public.is_team_admin(team_id));


