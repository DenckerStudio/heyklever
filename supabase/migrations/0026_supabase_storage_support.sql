-- Add storage bucket reference and indexes for supabase storage provider
ALTER TABLE team_folders
ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

-- Helpful index for provider lookups
CREATE INDEX IF NOT EXISTS idx_team_folders_provider ON team_folders(provider);

-- Ensure a team has at most one storage record per provider
CREATE UNIQUE INDEX IF NOT EXISTS uniq_team_provider ON team_folders(team_id, provider);

-- Comments
COMMENT ON COLUMN team_folders.storage_bucket IS 'Supabase storage bucket name for supabase_storage provider';


