-- Create app_notifications table
create table public.app_notifications (
  id bigserial not null,
  created_at timestamp with time zone null default now(),
  team_id uuid not null,
  message text not null,
  type text not null,
  status text null default 'new'::text,
  document_identifier text null,
  constraint app_notifications_pkey primary key (id)
) TABLESPACE pg_default;

-- Add RLS policies
alter table public.app_notifications enable row level security;

-- Policy to allow team members to read notifications for their team
create policy "Team members can read notifications for their team" on public.app_notifications
  for select using (
    team_id in (
      select team_id from public.team_members 
      where user_id = auth.uid()
    )
  );

-- Policy to allow team members to update notification status
create policy "Team members can update notification status" on public.app_notifications
  for update using (
    team_id in (
      select team_id from public.team_members 
      where user_id = auth.uid()
    )
  );

-- Add foreign key constraint to teams table
alter table public.app_notifications 
  add constraint app_notifications_team_id_fkey 
  foreign key (team_id) references public.teams(id) on delete cascade;

-- Create index for better performance
create index idx_app_notifications_team_id on public.app_notifications(team_id);
create index idx_app_notifications_status on public.app_notifications(status);
create index idx_app_notifications_created_at on public.app_notifications(created_at desc);
