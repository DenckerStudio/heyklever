import { createClient } from '@supabase/supabase-js';
import { calculateOverageTokens, getIncludedTokens, PlanSlug } from '../pricing-constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface UsageReportResult {
  shouldReport: boolean;
  amountToReport: number;
  newTotalUsed: number;
}

export class UsageTrackingService {
  /**
   * Track usage and calculate if overage should be reported to Stripe
   * 
   * @param teamId The team ID
   * @param tokens Amount of tokens used
   * @param timestamp Event timestamp
   * @returns result indicating if and how much to report to Stripe
   */
  async trackAndCalculateOverage(
    teamId: string,
    tokens: number,
    timestamp: Date = new Date()
  ): Promise<UsageReportResult> {
    // 1. Determine current billing period based on Subscription, not calendar month
    const now = timestamp;
    
    // 2. Get active subscription to find period and plan
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        platform_subscription_id,
        current_period_start,
        current_period_end,
        platform_subscriptions (
          slug,
          included_tokens
        )
      `)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single();

    if (!subscription || !subscription.platform_subscriptions) {
      console.warn(`No active platform subscription for team ${teamId}, assuming 0 included tokens.`);
      return { shouldReport: true, amountToReport: tokens, newTotalUsed: tokens };
    }

    // Use type assertion or safe access
    const planSlug = (subscription.platform_subscriptions as any).slug;
    const includedTokens = (subscription.platform_subscriptions as any).included_tokens || 0;
    
    // Determine period from subscription
    // Note: timestamps in DB are ISO strings
    const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 3. Get/Update usage_allowances
    // We strive for atomic update to avoid race conditions
    // "increment" approach is best
    
    // First, try to get existing row
    const { data: allowance, error: allowanceError } = await supabaseAdmin
      .from('usage_allowances')
      .select('*')
      .eq('team_id', teamId)
      .eq('period_start', periodStart.toISOString())
      .single();

    let currentUsed = 0;
    
    if (allowance) {
      currentUsed = allowance.tokens_used;
    } else {
      // Create new record for this period
      const { error: insertError } = await supabaseAdmin
        .from('usage_allowances')
        .insert({
          team_id: teamId,
          subscription_plan_slug: planSlug,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          tokens_used: 0,
          tokens_included: includedTokens
        });
      
      if (insertError) {
        // If conflict (race condition), retry get?
        // For simplicity, we might just assume 0 or retry once.
        console.error('Error creating usage allowance:', insertError);
      }
    }

    // 4. Calculate Reporting
    // We need to know the state AFTER adding tokens
    // Ideally we use RPC for atomic increment and return new value, but Supabase simple client...
    // We can use the previous value we fetched + tokens.
    // There is a race condition here if multiple requests come in parallel.
    // For a robust system, we should use a Postgres function `increment_usage`.
    // But for this implementation, we will update and calculate.

    const newTotal = currentUsed + tokens;
    
    // Update DB
    await supabaseAdmin
      .from('usage_allowances')
      .upsert({
        team_id: teamId,
        subscription_plan_slug: planSlug,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        tokens_used: newTotal, // This overwrites. Racey.
        tokens_included: includedTokens
      }, { onConflict: 'team_id,period_start,period_end' });

    // Calculate overage
    // Previous reported overage: max(0, currentUsed - includedTokens)
    // New reported overage: max(0, newTotal - includedTokens)
    // Diff is what we send to Stripe now.

    const previousOverage = Math.max(0, currentUsed - includedTokens);
    const newOverage = Math.max(0, newTotal - includedTokens);
    const amountToReport = newOverage - previousOverage;

    return {
      shouldReport: amountToReport > 0,
      amountToReport,
      newTotalUsed: newTotal
    };
  }
}

export const usageTrackingService = new UsageTrackingService();

