-- 0060_add_current_period_start.sql
-- Add current_period_start to subscriptions table to track billing cycles accurately

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'current_period_start'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN current_period_start TIMESTAMPTZ;
    END IF;
END $$;

