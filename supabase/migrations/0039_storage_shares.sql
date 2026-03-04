create table if not exists public.storage_shares (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null,
  scope text not null check (scope in ('public','private')),
  object_path text not null,
  object_type text not null check (object_type in ('file','folder')),
  token text not null unique,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists storage_shares_team_id_idx on public.storage_shares(team_id);
create index if not exists storage_shares_token_idx on public.storage_shares(token);

alter table public.storage_shares enable row level security;

drop policy if exists storage_shares_read on public.storage_shares;
create policy storage_shares_read
  on public.storage_shares for select
  using (true);

drop policy if exists storage_shares_write on public.storage_shares;
create policy storage_shares_write
  on public.storage_shares for insert
  with check (auth.uid() = created_by);

drop policy if exists storage_shares_delete on public.storage_shares;
create policy storage_shares_delete
  on public.storage_shares for delete
  using (auth.uid() = created_by);


