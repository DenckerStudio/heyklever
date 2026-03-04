import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface UsageLimitCheckResult {
  allowed: boolean;
  reason?: string;
  limits?: {
    maxDaily: number | null;
    maxMonthly: number | null;
    maxCost: number | null;
    currentDaily: number;
    currentMonthly: number;
    currentCost: number;
  };
}

interface UsageLimitRow {
    max_tokens_per_day: number | null;
    max_tokens_per_month: number | null;
    max_monthly_cost_eur: number | null;
    paused_until: string | null;
}

export class UsageLimitService {
  /**
   * Check if a team can execute a workflow based on defined limits
   */
  async checkLimits(teamId: string, estimatedTokens: number = 0): Promise<UsageLimitCheckResult> {
    // 1. Fetch usage limits configuration
    const { data: rawLimits } = await supabaseAdmin
      .from('usage_limits')
      .select('*')
      .eq('team_id', teamId)
      .single();
      
    const limits = rawLimits as UsageLimitRow | null;

    // If no limits defined, allow execution (or default limits?)
    // For now: unlimited if no record, effectively.
    if (!limits) {
        return { allowed: true };
    }

    if (limits.paused_until && new Date(limits.paused_until) > new Date()) {
        return { 
            allowed: false, 
            reason: `Workflows paused until ${new Date(limits.paused_until).toLocaleString()}` 
        };
    }

    // 2. Calculate Current Usage
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch daily usage (from usage_metrics, where period_start = startOfDay)
    // We sum all token-related metrics for the day
    
    // Daily Usage
    const { data: dailyMetrics } = await supabaseAdmin
        .from('usage_metrics')
        .select('value')
        .eq('team_id', teamId)
        .gte('period_start', startOfDay.toISOString());
    
    const currentDaily = dailyMetrics?.reduce((sum, m) => sum + (m.value || 0), 0) || 0;

    // Monthly Usage
    const { data: monthlyMetrics } = await supabaseAdmin
        .from('usage_metrics')
        .select('value')
        .eq('team_id', teamId)
        .gte('period_start', startOfMonth.toISOString());
        
    const currentMonthly = monthlyMetrics?.reduce((sum, m) => sum + (m.value || 0), 0) || 0;

    // Cost Calculation (Approximation for safety check)
    // Assuming blended cost of ~€5.00 per 1M tokens (conservative estimate)
    const currentCost = (currentMonthly / 1_000_000) * 5.0; 

    // 3. Compare
    if (limits.max_tokens_per_day && (currentDaily + estimatedTokens) > limits.max_tokens_per_day) {
        return { allowed: false, reason: 'Daily token limit exceeded', limits: this.formatLimits(limits, currentDaily, currentMonthly, currentCost) };
    }

    if (limits.max_tokens_per_month && (currentMonthly + estimatedTokens) > limits.max_tokens_per_month) {
         return { allowed: false, reason: 'Monthly token limit exceeded', limits: this.formatLimits(limits, currentDaily, currentMonthly, currentCost) };
    }
    
    if (limits.max_monthly_cost_eur && currentCost > limits.max_monthly_cost_eur) {
         return { allowed: false, reason: 'Monthly cost limit exceeded', limits: this.formatLimits(limits, currentDaily, currentMonthly, currentCost) };
    }

    return { 
        allowed: true, 
        limits: this.formatLimits(limits, currentDaily, currentMonthly, currentCost)
    };
  }

  private formatLimits(limits: UsageLimitRow, daily: number, monthly: number, cost: number) {
      return {
        maxDaily: limits.max_tokens_per_day,
        maxMonthly: limits.max_tokens_per_month,
        maxCost: limits.max_monthly_cost_eur,
        currentDaily: daily,
        currentMonthly: monthly,
        currentCost: cost
      };
  }
}

export const usageLimitService = new UsageLimitService();
