-- Add only the missing columns to team_folders table
-- Check if columns exist before adding them

-- Add notification_channel_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_folders' 
                   AND column_name = 'notification_channel_id') THEN
        ALTER TABLE team_folders ADD COLUMN notification_channel_id TEXT;
    END IF;
END $$;

-- Add notification_resource_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_folders' 
                   AND column_name = 'notification_resource_id') THEN
        ALTER TABLE team_folders ADD COLUMN notification_resource_id TEXT;
    END IF;
END $$;

-- Add notification_expiration if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_folders' 
                   AND column_name = 'notification_expiration') THEN
        ALTER TABLE team_folders ADD COLUMN notification_expiration TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add public_folder_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_folders' 
                   AND column_name = 'public_folder_id') THEN
        ALTER TABLE team_folders ADD COLUMN public_folder_id TEXT;
    END IF;
END $$;

-- Add private_folder_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_folders' 
                   AND column_name = 'private_folder_id') THEN
        ALTER TABLE team_folders ADD COLUMN private_folder_id TEXT;
    END IF;
END $$;

-- Add index for notification lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_team_folders_notification_channel ON team_folders(notification_channel_id);

-- Add comments explaining the notification fields
COMMENT ON COLUMN team_folders.notification_channel_id IS 'Google Drive push notification channel ID';
COMMENT ON COLUMN team_folders.notification_resource_id IS 'Google Drive resource ID for notifications';
COMMENT ON COLUMN team_folders.notification_expiration IS 'When the notification subscription expires';
COMMENT ON COLUMN team_folders.public_folder_id IS 'Google Drive folder ID for public content';
COMMENT ON COLUMN team_folders.private_folder_id IS 'Google Drive folder ID for private content';
