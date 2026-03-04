import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { usageTrackingService } from '@/lib/services/usage-tracking';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-09-30.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to map addon + type to meter event name
function getMeterEventName(addonSlug: string, type?: 'input' | 'output'): string {
  if (addonSlug === 'rag-ai') {
    return type === 'input' ? 'rag_input_tokens' : 'rag_output_tokens';
  }
  if (addonSlug === 'content-gen') {
    return 'content_output_tokens';
  }
  if (addonSlug === 'summarization') {
    return 'summary_tokens';
  }
  if (addonSlug === 'chatbot') {
    return 'chatbot_tokens'; // Changed from chatbot_messages to tokens per decision
  }
  return `tokens_${addonSlug}`; // Fallback
}

/**
 * Report token usage to Stripe for usage-based billing
 * 
 * POST /api/stripe/report-usage
 * Body: {
 *   teamId: string,
 *   addonSlug: string,
 *   tokens: number,
 *   type?: 'input' | 'output', // Required for RAG AI
 *   timestamp?: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId, addonSlug, tokens, type, timestamp } = body;

    if (!teamId || !addonSlug || tokens === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: teamId, addonSlug, tokens' },
        { status: 400 }
      );
    }

    if (addonSlug === 'rag-ai' && !type) {
        return NextResponse.json(
            { error: 'Field "type" (input/output) is required for RAG AI' },
            { status: 400 }
        );
    }

    // 1. Get customer ID
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('customer_id')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription?.customer_id) {
      console.error(`No active subscription found for team ${teamId}`);
      return NextResponse.json(
        { error: 'No active subscription found for this team' },
        { status: 404 }
      );
    }

    // 2. Track internal usage and calculate overage
    // This updates the global allowance counter
    const { shouldReport, amountToReport, newTotalUsed } = await usageTrackingService.trackAndCalculateOverage(
      teamId,
      tokens,
      timestamp ? new Date(timestamp * 1000) : new Date()
    );

    let stripeEventId = null;

    // 3. Report to Stripe ONLY if there is overage
    if (shouldReport && amountToReport > 0) {
        const meterEventName = getMeterEventName(addonSlug, type);
        const eventTimestamp = timestamp || Math.floor(Date.now() / 1000);
        
        // Convert to 1k units?
        // Pricing is "Per 1k tokens".
        // Stripe Metered Billing (Billing Scheme: per_unit).
        // If we send raw tokens (e.g. 100), and price is per 1k.
        // Usually, we set the Price "Transform Quantity: Divide by 1000" in Stripe Dashboard or API?
        // Or we send pre-divided units.
        // In previous code: "Convert tokens to 1k token units ... Math.ceil(tokens / 1000)".
        // If we do that, we lose precision on small reports.
        // Ideally, we send RAW tokens, and Stripe Price has "Transform quantity: Divide by 1,000".
        // But `setup-stripe-products.ts` didn't set `transform_quantity`.
        // It set `billing_scheme: 'per_unit'` and `unit_amount` based on 1k cost.
        // Example: Cost $0.00175 per 1k.
        // If we send 1 unit, we charge $0.00175.
        // If 1 unit = 1k tokens, then we must divide by 1000.
        // Let's stick to the previous logic of dividing by 1000 for now to match the "unit" concept, 
        // BUT `amountToReport` might be small (e.g. 500 tokens). Math.ceil(500/1000) = 1.
        // If we always round up, we overcharge.
        // Stripe supports decimal quantities in API? "The value must be a non-negative integer." for `create` meter event payload?
        // Stripe Meter Events `value` is string.
        // If we use `sum` aggregation, we can send integers.
        // If our Price is "Per 1 Unit", and "1 Unit = 1000 Tokens",
        // Then we should probably send fractional units if allowed, OR we should change Price to be "Per 1 Token" (very small amount).
        // Stripe minimum unit amount is 1 cent? No, can be smaller with `unit_amount_decimal`.
        // $0.00175 per 1k = $0.00000175 per 1 token.
        // `unit_amount_decimal` supports up to 12 decimal places.
        // It is cleaner to bill per 1 Token and send raw counts.
        // BUT, existing Setup Script uses "Price per 1k tokens".
        // And I followed that.
        // So I must send units of 1k.
        // To avoid rounding issues with small batches, we should ideally aggregate locally or accept rounding.
        // "Reporting strategy: Real-time OR Batched every 5–15 minutes".
        // If batched, numbers are bigger.
        // For now, I will use `tokens / 1000` and keep decimals if Stripe allows?
        // Meter event payload values must be numeric strings.
        // Stripe Docs: "The value of the event. ... must be a real number."
        // So I can send "0.5" for 500 tokens.
        
        const tokensIn1kUnits = amountToReport / 1000;

        const event = await stripe.billing.meterEvents.create({
            event_name: meterEventName,
            identifier: subscription.customer_id,
            payload: {
                tokens: tokensIn1kUnits.toString(),
            },
            timestamp: eventTimestamp,
        });
        
        // Use type assertion to avoid build error if 'id' is missing on type definition
        stripeEventId = (event as any).id;
    }

    // 4. Update usage_metrics (Internal Analytics)
    // We want to track the specific type usage regardless of allowance
    const metricType = getMeterEventName(addonSlug, type);
    const periodStart = new Date();
    // Use Daily granularity for better analytics and kill-switch enforcement
    // periodStart.setDate(1); // Removed to track daily
    periodStart.setHours(0, 0, 0, 0);
    
    // We need to fetch existing to increment
    const { data: existingMetric } = await supabaseAdmin
        .from('usage_metrics')
        .select('value')
        .eq('team_id', teamId)
        .eq('metric_type', metricType)
        .eq('period_start', periodStart.toISOString())
        .single();
        
    const newValue = (existingMetric?.value || 0) + tokens;

    await supabaseAdmin
      .from('usage_metrics')
      .upsert({
        team_id: teamId,
        metric_type: metricType,
        value: newValue,
        period_start: periodStart.toISOString(),
        period_end: new Date(new Date(periodStart).setDate(periodStart.getDate() + 1)).toISOString(),
      }, {
        onConflict: 'team_id,metric_type,period_start',
      });

    return NextResponse.json({
      success: true,
      reportedToStripe: shouldReport && amountToReport > 0,
      amountReported: amountToReport,
      stripeEventId,
      totalUsed: newTotalUsed
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to report usage';
    console.error('Usage reporting error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
