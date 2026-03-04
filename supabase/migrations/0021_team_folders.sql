-- Team folders table to track created folders in drive providers

create table if not exists public.team_folders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  provider text not null check (provider in ('google_drive','onedrive')),
  folder_id text not null, -- The folder ID in the provider's system
  folder_name text not null,
  folder_url text, -- Direct link to the folder
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(team_id, provider)
);

create index if not exists team_folders_team_id_idx on public.team_folders(team_id);
create index if not exists team_folders_provider_idx on public.team_folders(provider);

alter table public.team_folders enable row level security;

drop policy if exists team_folders_read on public.team_folders;
create policy team_folders_read
  on public.team_folders for select
  using (public.is_team_member(team_id));

drop policy if exists team_folders_write on public.team_folders;
create policy team_folders_write
  on public.team_folders for insert
  with check (public.is_team_admin(team_id));

drop policy if exists team_folders_update on public.team_folders;
create policy team_folders_update
  on public.team_folders for update
  using (public.is_team_admin(team_id));

drop policy if exists team_folders_delete on public.team_folders;
create policy team_folders_delete
  on public.team_folders for delete
  using (public.is_team_admin(team_id));
