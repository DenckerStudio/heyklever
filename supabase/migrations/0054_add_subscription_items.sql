-- Add subscription_items table to track Stripe subscription items for usage-based billing

CREATE TABLE IF NOT EXISTS public.subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES public.addons(id) ON DELETE SET NULL,
  stripe_subscription_item_id TEXT NOT NULL UNIQUE, -- Stripe subscription item ID
  stripe_price_id TEXT NOT NULL, -- Stripe price ID for this item
  addon_slug TEXT, -- For quick lookup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription ON public.subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_team ON public.subscription_items(team_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_addon ON public.subscription_items(addon_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_addon_slug ON public.subscription_items(addon_slug);

-- Enable RLS
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view their subscription items
CREATE POLICY "Team members can view subscription items" ON public.subscription_items
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can manage subscription items (for webhooks)
CREATE POLICY "Service role can manage subscription items" ON public.subscription_items
  FOR ALL USING (true); -- Service role bypasses RLS
