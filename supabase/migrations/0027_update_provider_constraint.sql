-- Update team_folders provider constraint to include supabase_storage
ALTER TABLE team_folders DROP CONSTRAINT IF EXISTS team_folders_provider_check;
ALTER TABLE team_folders ADD CONSTRAINT team_folders_provider_check 
  CHECK (provider IN ('google_drive', 'onedrive', 'supabase_storage'));

-- Add storage_bucket column if it doesn't exist (from 0026 migration)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_folders' 
                   AND column_name = 'storage_bucket') THEN
        ALTER TABLE team_folders ADD COLUMN storage_bucket TEXT;
    END IF;
END $$;

-- Add helpful index for provider lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_team_folders_provider ON team_folders(provider);

-- Ensure a team has at most one storage record per provider
CREATE UNIQUE INDEX IF NOT EXISTS uniq_team_provider ON team_folders(team_id, provider);

-- Add comment for storage_bucket
COMMENT ON COLUMN team_folders.storage_bucket IS 'Supabase storage bucket name for supabase_storage provider';
