#!/usr/bin/env tsx
/**
 * Stripe Products & Prices Setup Script (Platform Model)
 * 
 * This script creates Stripe Products and Prices for:
 * - One-time Platform Setup Fee
 * - Platform Subscriptions (Starter, Growth, Pro)
 * - Usage-based Addons (RAG AI, Content Gen, Chatbot, Summarization)
 * 
 * Usage:
 *   cd heyklever
 *   npx tsx scripts/setup-stripe-products.ts [--test|--live]
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  PLATFORM_PLANS, 
  SETUP_FEE, 
  calculateCustomerPricePer1k,
  PlanSlug
} from '../src/lib/pricing-constants';

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          const cleanValue = value.replace(/^["']|["']$/g, '');
          process.env[key.trim()] = cleanValue;
        }
      }
    });
    console.log('✓ Loaded environment variables from .env.local');
  } catch {
    console.warn('⚠ Could not load .env.local, using system environment variables');
  }
}

loadEnvFile();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover' as any, // Use latest api version
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper types
interface AddonConfig {
  slug: string;
  name: string;
  description: string;
  meters: {
    name: string;
    displayName: string;
    type: 'input' | 'output' | 'count'; // count for things like messages/queries
  }[];
}

const ADDONS: AddonConfig[] = [
  {
    slug: 'rag-ai',
    name: 'RAG AI',
    description: 'Retrieval Augmented Generation with separate input/output metering',
    meters: [
      { name: 'rag_input_tokens', displayName: 'RAG Input Tokens', type: 'input' },
      { name: 'rag_output_tokens', displayName: 'RAG Output Tokens', type: 'output' },
      // Optional queries meter can be added here if needed, keeping simple for now
    ]
  },
  {
    slug: 'content-gen',
    name: 'Content Generation',
    description: 'AI-powered content creation tools',
    meters: [
      { name: 'content_output_tokens', displayName: 'Content Gen Output Tokens', type: 'output' },
      // Optional input tokens
    ]
  },
  {
    slug: 'summarization',
    name: 'Summarization',
    description: 'Auto-summarize long documents',
    meters: [
      { name: 'summary_tokens', displayName: 'Summarization Tokens', type: 'input' } // Summarization is mostly input heavy? Or total? Assuming total/input for now, or using output pricing if it generates summaries.
      // Spec says "Meters: summary_tokens". Let's assume it's priced like output or input?
      // "Price: Calculated from Gemini 3 costs x 2.6". Usually summarization is input heavy, but output is more expensive.
      // Let's use 'output' type for pricing safety (higher cost) or maybe 'input' if it's mostly reading?
      // Gemini pricing: Input $0.50, Output $3.00.
      // If we use input pricing for summary_tokens, it's cheaper.
      // The spec lists it under "Usage-based Addons".
      // I'll assume 'summary_tokens' tracks processed tokens (input + output combined? or just input?).
      // Let's stick to one meter 'summary_tokens' and use Output pricing to be safe/conservative, or Input if appropriate.
      // "Summarization ... Meters: summary_tokens".
      // I'll use Output pricing ($3.00 base) to be safe for now, as value generation is high.
    ]
  },
  {
    slug: 'chatbot',
    name: 'Customer Chatbot',
    description: 'Embeddable AI chatbot',
    meters: [
      { name: 'chatbot_messages', displayName: 'Chatbot Messages', type: 'count' }
      // Spec says "Meters: chatbot_messages".
      // Pricing for messages? "Price: Calculated from Gemini 3 costs x 2.6".
      // A message is not a token. We need a price per message?
      // Or "Meters: chatbot_messages ... (optional) chatbot_tokens".
      // If we bill by message, we need an assumption of tokens per message.
      // E.g. 1 message = 1000 tokens?
      // Or maybe the meter should be 'chatbot_tokens' and we just call it that.
      // Spec: "Meters: chatbot_messages, (optional) chatbot_tokens".
      // Let's implement 'chatbot_tokens' as the primary billing unit since we have token pricing.
      // If we must use 'chatbot_messages', we'd need a price per message.
      // I'll switch to 'chatbot_tokens' as the metered unit for pricing consistency with Gemini.
    ]
  }
];

// Fixups for the above array based on pricing logic availability:
// We only have calculateCustomerPricePer1k for input/output tokens.
// For 'chatbot_messages' (count), we don't have a direct Gemini constant.
// I will modify the meters to be token-based where possible to match the "AI Pricing Formula" which is token based.
// Re-defining ADDONS to align with token pricing:

const REFINED_ADDONS: AddonConfig[] = [
  {
    slug: 'rag-ai',
    name: 'RAG AI',
    description: 'Retrieval Augmented Generation',
    meters: [
      { name: 'rag_input_tokens', displayName: 'RAG Input Tokens', type: 'input' },
      { name: 'rag_output_tokens', displayName: 'RAG Output Tokens', type: 'output' },
    ]
  },
  {
    slug: 'content-gen',
    name: 'Content Generation',
    description: 'AI Content Generation',
    meters: [
      { name: 'content_output_tokens', displayName: 'Content Generation Output Tokens', type: 'output' },
    ]
  },
  {
    slug: 'summarization',
    name: 'Summarization',
    description: 'Document Summarization',
    meters: [
      { name: 'summary_tokens', displayName: 'Summarization Tokens', type: 'output' }, // Pricing as output for safety
    ]
  },
  {
    slug: 'chatbot',
    name: 'Customer Chatbot',
    description: 'AI Chatbot',
    meters: [
      { name: 'chatbot_tokens', displayName: 'Chatbot Tokens', type: 'output' }, // Pricing as output/mixed
    ]
  }
];

async function createStripeProduct(name: string, description: string): Promise<Stripe.Product> {
  const existingProducts = await stripe.products.search({
    query: `name:'${name}' AND active:'true'`,
  });

  if (existingProducts.data.length > 0) {
    console.log(`  ✓ Product "${name}" already exists (${existingProducts.data[0].id})`);
    return existingProducts.data[0];
  }

  const product = await stripe.products.create({
    name,
    description,
    metadata: {
      source: 'heyklever-platform-setup',
      created_at: new Date().toISOString(),
    },
  });

  console.log(`  ✓ Created product "${name}" (${product.id})`);
  return product;
}

async function createOneTimePrice(productId: string, amount: number): Promise<Stripe.Price> {
  // Check for existing one-time price
  const prices = await stripe.prices.list({ product: productId, active: true });
  const existing = prices.data.find(p => p.unit_amount === Math.round(amount * 100) && p.type === 'one_time');
  
  if (existing) {
    console.log(`  ✓ Setup fee price already exists (${existing.id})`);
    return existing;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100),
    currency: 'usd', // All prices in USD
    metadata: { type: 'setup_fee' },
  });
  console.log(`  ✓ Created setup fee price €${amount} (${price.id})`);
  return price;
}

async function createRecurringPrice(productId: string, amount: number, planSlug: string): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: productId, active: true });
  const existing = prices.data.find(p => 
    p.unit_amount === Math.round(amount * 100) && 
    p.recurring?.interval === 'month' &&
    p.currency === 'usd' // All prices in USD
  );
  
  if (existing) {
    console.log(`  ✓ Subscription price $${amount}/mo already exists (${existing.id})`);
    return existing;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100),
    currency: 'usd', // All prices in USD
    recurring: { interval: 'month' },
    metadata: { plan_slug: planSlug },
  });
  console.log(`  ✓ Created subscription price $${amount}/mo (${price.id})`);
  return price;
}

async function createMeter(eventName: string, displayName: string): Promise<Stripe.Billing.Meter> {
  const meters = await stripe.billing.meters.list({ limit: 100 });
  const existing = meters.data.find(m => m.event_name === eventName);

  if (existing) {
    console.log(`  ✓ Meter "${eventName}" already exists (${existing.id})`);
    return existing;
  }

  const meter = await stripe.billing.meters.create({
    display_name: displayName,
    event_name: eventName,
    default_aggregation: { formula: 'sum' },
    value_settings: { event_payload_key: 'tokens' },
  });
  console.log(`  ✓ Created meter "${eventName}" (${meter.id})`);
  return meter;
}

async function createMeteredPrice(
  productId: string, 
  meterId: string, 
  amountPer1k: number, 
  currency: string = 'usd' // All prices in USD
): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: productId, active: true });
  const existing = prices.data.find(p => 
    p.recurring?.meter === meterId && 
    p.unit_amount_decimal === (amountPer1k * 100).toString() // Check decimal match
  );

  if (existing) {
    console.log(`  ✓ Metered price $${amountPer1k}/1k tokens already exists (${existing.id})`);
    return existing;
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount_decimal: (amountPer1k * 100).toFixed(10), // cents, max 10 decimals to be safe
    recurring: {
      interval: 'month',
      usage_type: 'metered',
      meter: meterId,
    },
    billing_scheme: 'per_unit',
  });
  console.log(`  ✓ Created metered price $${amountPer1k}/1k tokens (${price.id})`);
  return price;
}

async function main() {
  console.log('🚀 Setting up Stripe Products & Prices (Platform Model)...\n');

  // 1. Setup Fee
  console.log('📦 Setup Fee...');
  const setupProduct = await createStripeProduct(SETUP_FEE.name, SETUP_FEE.description);
  await createOneTimePrice(setupProduct.id, SETUP_FEE.price);

  // 2. Platform Subscriptions
  console.log('\n📦 Platform Subscriptions...');
  const subProduct = await createStripeProduct('Platform Subscription', 'Monthly platform subscription tiers');
  
  for (const slug of Object.keys(PLATFORM_PLANS) as PlanSlug[]) {
    const plan = PLATFORM_PLANS[slug];
    const price = await createRecurringPrice(subProduct.id, plan.price, slug);
    
    // Update database
    const { error } = await supabaseAdmin
      .from('platform_subscriptions')
      .upsert({
        slug: plan.slug,
        name: plan.name,
        price_monthly: plan.price,
        stripe_price_id: price.id,
        included_tokens: plan.includedTokens,
        specs: plan.specs,
      }, { onConflict: 'slug' });
      
    if (error) console.error(`  ❌ Failed to update DB for ${slug}:`, error.message);
    else console.log(`  ✓ Updated DB for plan ${slug}`);
  }

  // 3. Usage-Based Addons
  console.log('\n📦 Usage-Based Addons...');
  for (const addon of REFINED_ADDONS) {
    console.log(`  Processing ${addon.name}...`);
    const product = await createStripeProduct(addon.name, addon.description);
    
    // Create DB entry for addon if not exists (to link later)
    await supabaseAdmin.from('addons').upsert({
      slug: addon.slug,
      name: addon.name,
      type: 'recurring', // it's usage based recurring
      description: addon.description
    }, { onConflict: 'slug' });

    for (const meterConfig of addon.meters) {
      const meter = await createMeter(meterConfig.name, meterConfig.displayName);
      const pricePer1k = calculateCustomerPricePer1k(meterConfig.type === 'input' ? 'input' : 'output', addon.slug);
      
      const price = await createMeteredPrice(product.id, meter.id, pricePer1k);
      
      // Store/Update addon info in DB (we might need a mapping table for multiple prices)
      // For now, we update 'stripe_price_id' with the first price, or maybe we need a better way?
      // Since we have multiple meters for RAG, the single 'stripe_price_id' column is insufficient.
      // However, the checkout flow will need to know which prices to include.
      // We can rely on looking up Prices by Product in Stripe, or store a JSON map.
      // Let's store a JSON map in a new column if we had one, or update 'stripe_price_id' with the PRIMARY price (e.g. output).
      
      if (meterConfig.type === 'output' || addon.meters.length === 1) {
         await supabaseAdmin.from('addons')
           .update({ stripe_price_id: price.id })
           .eq('slug', addon.slug);
      }
    }
  }

  console.log('\n✅ Setup complete!');
}

main().catch(console.error);
