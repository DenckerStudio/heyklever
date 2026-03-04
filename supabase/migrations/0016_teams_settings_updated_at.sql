-- Add settings and updated_at to teams
alter table if exists public.teams
  add column if not exists settings jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamp with time zone not null default now();

-- Trigger to auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row execute procedure public.set_updated_at();

