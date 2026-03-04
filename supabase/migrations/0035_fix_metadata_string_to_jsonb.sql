-- 🔧 Fix metadata column: Convert double-escaped strings to proper JSONB
-- This fixes the issue where n8n stores metadata as: "\"{...}\"" instead of {...}

-- Step 1: Check current state (uncomment to debug)
-- SELECT id, jsonb_typeof(metadata) as type, metadata::text FROM documents LIMIT 3;

-- Step 2: Fix double-escaped metadata
-- Handle case where metadata is stored as a JSONB string containing an escaped JSON string
UPDATE documents
SET metadata = 
  CASE 
    -- If metadata is already a proper JSONB object, keep it
    WHEN jsonb_typeof(metadata) = 'object' THEN metadata
    
    -- If metadata is a JSONB string (the n8n bug case)
    WHEN jsonb_typeof(metadata) = 'string' THEN 
      -- Extract the string value and parse it as JSONB
      -- This handles both "\"{}\"" and regular "{}" strings
      CASE 
        WHEN trim(both '"' from (metadata #>> '{}')) ~ '^\{.*\}$' 
        THEN trim(both '"' from (metadata #>> '{}'))::jsonb
        ELSE (metadata #>> '{}')::jsonb
      END
    
    -- Fallback: try to keep as is
    ELSE metadata
  END
WHERE jsonb_typeof(metadata) = 'string';

-- Step 3: Create trigger to automatically fix future inserts/updates
-- This prevents the issue from happening again when n8n inserts new data

CREATE OR REPLACE FUNCTION fix_metadata_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If metadata is a JSONB string, convert it to a proper JSONB object
  IF jsonb_typeof(NEW.metadata) = 'string' THEN
    BEGIN
      -- Try to parse the string content as JSONB
      NEW.metadata := CASE 
        WHEN trim(both '"' from (NEW.metadata #>> '{}')) ~ '^\{.*\}$' 
        THEN trim(both '"' from (NEW.metadata #>> '{}'))::jsonb
        ELSE (NEW.metadata #>> '{}')::jsonb
      END;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, log but don't block the insert
      RAISE WARNING 'Could not parse metadata string for document: %', NEW.id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS fix_metadata_trigger ON documents;

-- Create trigger that runs before insert or update
CREATE TRIGGER fix_metadata_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION fix_metadata_on_insert();

-- Step 4: Verify the fix (uncomment to check)
-- SELECT 
--   id, 
--   jsonb_typeof(metadata) as type,
--   metadata->>'team_id' as team_id, 
--   metadata->>'context' as context,
--   metadata->>'file_name' as file_name
-- FROM documents 
-- LIMIT 5;

