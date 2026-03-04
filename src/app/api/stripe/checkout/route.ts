import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Initialize clients
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-09-30.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      teamId, 
      planSlug, // 'starter', 'growth', 'pro'
      addonSlugs, // ['content-gen', 'chatbot', ...] (RAG AI is auto-included)
      successUrl, 
      cancelUrl, 
      couponCode 
    } = body;

    if (!teamId || !planSlug) {
      return NextResponse.json({ error: 'Missing teamId or planSlug' }, { status: 400 });
    }

    // 1. Fetch Platform Subscription details
    const { data: planData, error: planError } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !planData) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    if (!planData.stripe_price_id) {
       return NextResponse.json({ error: 'Plan configuration error: missing Stripe price' }, { status: 500 });
    }

    // 2. Find Setup Fee Price
    // We search for the price marked as setup_fee
    const setupFeePrices = await stripe.prices.search({
      query: "metadata['type']:'setup_fee' AND active:'true'",
      limit: 1,
    });
    
    const setupPriceId = setupFeePrices.data[0]?.id;
    if (!setupPriceId && process.env.NODE_ENV === 'production') {
       console.error('Setup fee price not found');
       // We might proceed without setup fee in dev, but strictly required in plan
       // For now, warn and proceed or error? Plan says "Must be paid".
       return NextResponse.json({ error: 'Setup fee configuration missing' }, { status: 500 });
    }

    // 3. Prepare Line Items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // A) One-time Setup Fee
    if (setupPriceId) {
      // Validate currency
      const setupPrice = await stripe.prices.retrieve(setupPriceId);
      if (setupPrice.currency !== 'usd') {
        return NextResponse.json({ 
          error: `Setup fee price has currency ${setupPrice.currency}, but all prices must be USD. Please update the price in Stripe.` 
        }, { status: 500 });
      }
      lineItems.push({
        price: setupPriceId,
        quantity: 1,
      });
    }

    // B) Platform Subscription
    // Validate currency
    const planPrice = await stripe.prices.retrieve(planData.stripe_price_id);
    if (planPrice.currency !== 'usd') {
      return NextResponse.json({ 
        error: `Plan price has currency ${planPrice.currency}, but all prices must be USD. Please update the price in Stripe.` 
      }, { status: 500 });
    }
    lineItems.push({
      price: planData.stripe_price_id,
      quantity: 1,
    });

    // C) Addons
    const finalAddonSlugs = new Set(addonSlugs || []);
    finalAddonSlugs.add('rag-ai'); // Required

    const { data: addonsData } = await supabaseAdmin
      .from('addons')
      .select('*')
      .in('slug', Array.from(finalAddonSlugs));

    const addons = addonsData || [];

    for (const addon of addons) {
      // For RAG AI, we need multiple prices (input/output)
      // Since our DB only stores one price ID, we might need to fetch all prices for the product
      // Or we can rely on stripe_price_id if it was just one (but RAG has 2).
      
      if (addon.slug === 'rag-ai') {
        // Fetch all recurring metered prices for this product (we can find product via the stored price, or name search)
        // Since we stored one price ID, we can get the product ID from it
        if (addon.stripe_price_id) {
            const priceObj = await stripe.prices.retrieve(addon.stripe_price_id);
            const productId = typeof priceObj.product === 'string' ? priceObj.product : priceObj.product.id;
            
            const allPrices = await stripe.prices.list({
                product: productId,
                active: true,
                type: 'recurring',
                limit: 10
            });
            
            // Add all metered prices for RAG AI
            for (const p of allPrices.data) {
                if (p.recurring?.usage_type === 'metered') {
                    // Validate currency
                    if (p.currency !== 'usd') {
                        console.error(`RAG AI price ${p.id} has currency ${p.currency}, expected USD`);
                        continue; // Skip non-USD prices
                    }
                    lineItems.push({ price: p.id });
                }
            }
        }
      } else {
        // Standard single-meter addons
        if (addon.stripe_price_id) {
            // Validate currency
            const addonPrice = await stripe.prices.retrieve(addon.stripe_price_id);
            if (addonPrice.currency !== 'usd') {
                console.error(`Addon ${addon.slug} price has currency ${addonPrice.currency}, expected USD`);
                continue; // Skip non-USD prices
            }
            lineItems.push({ price: addon.stripe_price_id });
        }
      }
    }

    // 4. Validate Coupon
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (couponCode) {
        // ... (coupon logic same as before)
        try {
            const coupon = await stripe.coupons.retrieve(couponCode);
            if (coupon.valid) {
                discounts = [{ coupon: couponCode }];
            }
        } catch (e) {
            console.warn('Invalid coupon', e);
        }
    }

    // 5. Create Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      allow_promotion_codes: true,
      discounts,
      metadata: {
        teamId,
        planSlug,
        addonSlugs: Array.from(finalAddonSlugs).join(','),
        type: 'platform_provisioning'
      },
      subscription_data: {
        metadata: {
          teamId,
          planSlug,
          // Platform subscription ID will be linked in webhook via planSlug
        }
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/onboarding`,
      client_reference_id: teamId,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
