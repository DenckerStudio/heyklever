-- Team codes and client URLs for premium features

-- Add team_code to teams table
alter table public.teams add column if not exists team_code text unique;
alter table public.teams add column if not exists plan text not null default 'free' check (plan in ('free', 'premium'));

-- Create client URLs table
create table if not exists public.client_urls (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  display_code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(team_id, display_code)
);

-- Create indexes
create index if not exists teams_team_code_idx on public.teams(team_code);
create index if not exists client_urls_team_id_idx on public.client_urls(team_id);
create index if not exists client_urls_display_code_idx on public.client_urls(display_code);

-- Enable RLS
alter table public.client_urls enable row level security;

-- RLS policies for client_urls
drop policy if exists client_urls_read on public.client_urls;
create policy client_urls_read
  on public.client_urls for select
  using (public.is_team_member(team_id));

drop policy if exists client_urls_write on public.client_urls;
create policy client_urls_write
  on public.client_urls for insert
  with check (public.is_team_admin(team_id));

drop policy if exists client_urls_update on public.client_urls;
create policy client_urls_update
  on public.client_urls for update
  using (public.is_team_admin(team_id));

drop policy if exists client_urls_delete on public.client_urls;
create policy client_urls_delete
  on public.client_urls for delete
  using (public.is_team_admin(team_id));

-- Function to generate team codes
create or replace function generate_team_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists boolean;
begin
  loop
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    select exists(select 1 from public.teams where team_code = code) into exists;
    
    if not exists then
      return code;
    end if;
  end loop;
end;
$$;

-- Function to generate display codes
create or replace function generate_display_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists boolean;
begin
  loop
    -- Generate 6-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    select exists(select 1 from public.client_urls where display_code = code) into exists;
    
    if not exists then
      return code;
    end if;
  end loop;
end;
$$;

-- Update existing teams with team codes
update public.teams 
set team_code = generate_team_code() 
where team_code is null;
