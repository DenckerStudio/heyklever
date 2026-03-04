-- Pinecone namespace management for multi-tenancy

-- Add namespace fields to team_folders table
alter table public.team_folders add column if not exists pinecone_namespace text;
alter table public.team_folders add column if not exists public_namespace text;
alter table public.team_folders add column if not exists private_namespace text;

-- Add namespace fields to integration_accounts table
alter table public.integration_accounts add column if not exists pinecone_namespace text;

-- Create index for namespace lookups
create index if not exists team_folders_pinecone_namespace_idx on public.team_folders(pinecone_namespace);
create index if not exists team_folders_public_namespace_idx on public.team_folders(public_namespace);
create index if not exists team_folders_private_namespace_idx on public.team_folders(private_namespace);
create index if not exists integration_accounts_pinecone_namespace_idx on public.integration_accounts(pinecone_namespace);

-- Function to generate namespace names
create or replace function generate_pinecone_namespace(team_id uuid, folder_type text default 'main')
returns text
language plpgsql
as $$
declare
  team_code text;
  namespace text;
begin
  -- Get team code
  select team_code into team_code from public.teams where id = team_id;
  
  -- If no team_code, generate one from team_id
  if team_code is null then
    team_code := upper(substring(team_id::text from 1 for 8));
  end if;
  
  -- Generate namespace based on folder type
  case folder_type
    when 'public' then
      namespace := 'team_' || team_code || '_public';
    when 'private' then
      namespace := 'team_' || team_code || '_private';
    else
      namespace := 'team_' || team_code || '_main';
  end case;
  
  return namespace;
end;
$$;

-- Function to get team namespace info
create or replace function get_team_namespaces(team_id uuid)
returns table(
  main_namespace text,
  public_namespace text,
  private_namespace text
)
language plpgsql
as $$
begin
  return query
  select 
    generate_pinecone_namespace(team_id, 'main') as main_namespace,
    generate_pinecone_namespace(team_id, 'public') as public_namespace,
    generate_pinecone_namespace(team_id, 'private') as private_namespace;
end;
$$;
