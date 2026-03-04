-- Enable Realtime for app_notifications table
alter publication supabase_realtime add table public.app_notifications;

-- Add missing columns to app_notifications
alter table public.app_notifications 
add column if not exists content text,
add column if not exists action_url text,
add column if not exists metadata jsonb;
