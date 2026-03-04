-- 0059_create_platform_subscriptions.sql

-- 1. Create platform_subscriptions table
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE, -- 'starter', 'growth', 'pro'
    price_monthly numeric NOT NULL,
    stripe_price_id text,
    included_tokens bigint NOT NULL DEFAULT 0,
    specs jsonb DEFAULT '{}'::jsonb, -- e.g. { "cpu": "2 vCPU", "ram": "4GB" }
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create usage_allowances table
CREATE TABLE IF NOT EXISTS public.usage_allowances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    subscription_plan_slug text NOT NULL REFERENCES public.platform_subscriptions(slug),
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    tokens_used bigint NOT NULL DEFAULT 0,
    tokens_included bigint NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(team_id, period_start, period_end)
);

-- 3. Create usage_limits table
CREATE TABLE IF NOT EXISTS public.usage_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    max_tokens_per_day bigint,
    max_tokens_per_month bigint,
    max_monthly_cost_eur numeric,
    paused_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(team_id)
);

-- 4. Update subscriptions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'platform_subscription_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN platform_subscription_id uuid REFERENCES public.platform_subscriptions(id);
    END IF;
END $$;

-- 5. Update usage_metrics table to support separate input/output tokens
-- We'll add a 'sub_type' column or similar if needed, but the current schema uses 'metric_type'.
-- We can add 'tokens_input' and 'tokens_output' as metric_types.
ALTER TABLE public.usage_metrics 
DROP CONSTRAINT IF EXISTS usage_metrics_metric_type_check;

ALTER TABLE public.usage_metrics
ADD CONSTRAINT usage_metrics_metric_type_check 
CHECK (metric_type IN ('tokens', 'tokens_input', 'tokens_output', 'documents', 'chat_messages', 'rag_input_tokens', 'rag_output_tokens', 'rag_queries', 'content_output_tokens', 'content_input_tokens', 'summary_tokens', 'chatbot_messages', 'chatbot_tokens'));

-- Enable RLS
ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- platform_subscriptions: Readable by everyone (authenticated)
CREATE POLICY "Platform subscriptions are viewable by everyone" ON public.platform_subscriptions
    FOR SELECT USING (auth.role() = 'authenticated');

-- usage_allowances: Team members can view their own
CREATE POLICY "Team members can view usage allowances" ON public.usage_allowances
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
    );

-- usage_limits: Team members can view their own
CREATE POLICY "Team members can view usage limits" ON public.usage_limits
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
    );

-- usage_limits: Owners and admins can update their own
CREATE POLICY "Team owners/admins can update usage limits" ON public.usage_limits
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Service role policies
CREATE POLICY "Service role can manage platform subscriptions" ON public.platform_subscriptions
    FOR ALL USING (true); -- Service role bypasses RLS, but explicit is good practice for some setups

CREATE POLICY "Service role can manage usage allowances" ON public.usage_allowances
    FOR ALL USING (true);

CREATE POLICY "Service role can manage usage limits" ON public.usage_limits
    FOR ALL USING (true);

