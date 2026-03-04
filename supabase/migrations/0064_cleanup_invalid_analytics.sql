-- Clean up invalid analytics records where stats is stored as an array instead of an object
-- This can happen if old data was stored incorrectly before the schema was finalized

-- Delete records where stats is an array (invalid format)
-- We check if stats is an array by checking if it starts with '[' (JSON array)
DELETE FROM public.knowledge_analytics
WHERE jsonb_typeof(stats) = 'array';

-- Alternative: If the above doesn't work, we can also check for records where stats doesn't have expected fields
-- DELETE FROM public.knowledge_analytics
-- WHERE NOT (stats ? 'totalDocuments' AND stats ? 'visibilityBreakdown');
