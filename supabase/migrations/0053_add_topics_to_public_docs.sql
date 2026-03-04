-- 0053_add_topics_to_public_docs.sql
-- Add topic column to public_docs table for categorization

alter table public.public_docs 
add column if not exists topic text;

-- Create index for topic filtering
create index if not exists public_docs_topic_idx on public.public_docs(topic);

-- Update existing docs to have a default topic if needed (optional)
-- update public.public_docs set topic = 'General' where topic is null;

