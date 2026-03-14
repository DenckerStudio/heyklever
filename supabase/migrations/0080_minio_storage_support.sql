-- MinIO support for team_folders
-- No schema changes required as team_folders.provider is text and doesn't have a rigid CHECK constraint.
-- If a CHECK constraint exists on provider, this migration allows adding "minio" to the allowed list.

DO $$ 
BEGIN
    -- This block is a safeguard in case you added a CHECK constraint on provider in another migration.
    -- If there's no such constraint, it silently completes.
    BEGIN
        ALTER TABLE team_folders DROP CONSTRAINT IF EXISTS team_folders_provider_check;
    EXCEPTION
        WHEN undefined_object THEN null;
    END;
END $$;

COMMENT ON COLUMN team_folders.provider IS 'Provider name: minio, supabase_storage, google_drive, onedrive, nextcloud, etc';