-- Create usage tracking tables for dashboard stats
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('tokens', 'documents', 'chat_messages')),
  value BIGINT NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_usage_metrics_team_period ON usage_metrics(team_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type ON usage_metrics(metric_type);

-- Create function to get current month usage
CREATE OR REPLACE FUNCTION get_current_month_usage(team_uuid UUID)
RETURNS TABLE (
  tokens BIGINT,
  documents BIGINT,
  chat_messages BIGINT,
  estimated_cost NUMERIC
) AS $$
DECLARE
  current_month_start TIMESTAMPTZ;
  current_month_end TIMESTAMPTZ;
BEGIN
  current_month_start := date_trunc('month', NOW());
  current_month_end := date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
  
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN metric_type = 'tokens' THEN value ELSE 0 END), 0) as tokens,
    COALESCE(SUM(CASE WHEN metric_type = 'documents' THEN value ELSE 0 END), 0) as documents,
    COALESCE(SUM(CASE WHEN metric_type = 'chat_messages' THEN value ELSE 0 END), 0) as chat_messages,
    -- Calculate estimated cost based on token usage (using our pricing model)
    COALESCE(SUM(CASE WHEN metric_type = 'tokens' THEN value ELSE 0 END), 0) * 0.0000003 as estimated_cost
  FROM usage_metrics 
  WHERE team_id = team_uuid 
    AND period_start >= current_month_start 
    AND period_end <= current_month_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for team members to read their team's usage
CREATE POLICY "Team members can view usage metrics" ON usage_metrics
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Policy for team admins to insert/update usage metrics
CREATE POLICY "Team admins can manage usage metrics" ON usage_metrics
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert some sample data for testing
INSERT INTO usage_metrics (team_id, metric_type, value, period_start, period_end)
SELECT 
  t.id,
  'tokens',
  275000,
  date_trunc('month', NOW()),
  date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second'
FROM teams t
LIMIT 1;

INSERT INTO usage_metrics (team_id, metric_type, value, period_start, period_end)
SELECT 
  t.id,
  'documents',
  182,
  date_trunc('month', NOW()),
  date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second'
FROM teams t
LIMIT 1;

INSERT INTO usage_metrics (team_id, metric_type, value, period_start, period_end)
SELECT 
  t.id,
  'chat_messages',
  1250,
  date_trunc('month', NOW()),
  date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second'
FROM teams t
LIMIT 1;
