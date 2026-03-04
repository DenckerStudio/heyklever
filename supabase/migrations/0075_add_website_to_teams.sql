-- Add website column to teams table
alter table public.teams add column if not exists website text;
