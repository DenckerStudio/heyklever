-- Add invited_user flag to profiles table
alter table public.profiles 
add column invited_user boolean not null default false;

-- Add comment for clarity
comment on column public.profiles.invited_user is 'True if user was invited to a team and should not create their own team';
