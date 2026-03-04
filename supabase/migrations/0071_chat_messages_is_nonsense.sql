-- Add is_nonsense column to chat_messages and search_analytics tables
-- This flag indicates if a query was detected as irrelevant/nonsense
-- (e.g., "hva er datoen?", "hei", "test", etc.)
-- Used to filter out noise from analytics and recommendations

-- chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_nonsense boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_is_nonsense 
ON public.chat_messages(is_nonsense) 
WHERE is_nonsense = false;

COMMENT ON COLUMN public.chat_messages.is_nonsense IS 
'Flag to mark irrelevant queries (greetings, date/time questions, tests, etc.) - excluded from analytics';

-- search_analytics table  
ALTER TABLE public.search_analytics 
ADD COLUMN IF NOT EXISTS is_nonsense boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_search_analytics_is_nonsense 
ON public.search_analytics(is_nonsense) 
WHERE is_nonsense = false;

COMMENT ON COLUMN public.search_analytics.is_nonsense IS 
'Flag to mark irrelevant queries (greetings, date/time questions, tests, etc.) - excluded from analytics';
