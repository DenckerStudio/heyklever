#!/usr/bin/env tsx
/**
 * Simulate Stripe Purchase Script
 * 
 * This script simulates a complete Stripe purchase flow for testing:
 * 1. Creates a test team in the database
 * 2. Creates a Stripe checkout session
 * 3. Uses Stripe CLI to trigger webhook events
 * 
 * Usage:
 *   cd heyklever
 *   npx tsx scripts/simulate-stripe-purchase.ts [options]
 * 
 * Options:
 *   --plan <slug>        VPS plan slug (kvm-1, kvm-2, kvm-4, kvm-8) [default: kvm-1]
 *   --location <loc>     Location (us, eu, asia) [default: us]
 *   --addons <ids>       Comma-separated addon IDs (optional)
 *   --team-id <id>       Use existing team ID instead of creating new one
 *   --webhook-only       Only trigger webhook events, don't create checkout session
 *   --help               Show this help message
 * 
 * Prerequisites:
 *   - Stripe CLI installed and logged in: `stripe login`
 *   - Environment variables set in .env.local
 *   - Stripe webhook forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Load environment variables
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
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    plan?: string;
    location?: string;
    addons?: string[];
    teamId?: string;
    webhookOnly?: boolean;
    help?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--plan':
        options.plan = args[++i];
        break;
      case '--location':
        options.location = args[++i];
        break;
      case '--addons':
        options.addons = args[++i].split(',').filter(Boolean);
        break;
      case '--team-id':
        options.teamId = args[++i];
        break;
      case '--webhook-only':
        options.webhookOnly = true;
        break;
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

async function getOrCreateTeam(teamId?: string): Promise<string> {
  if (teamId) {
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();
    
    if (team) {
      console.log(`✓ Using existing team: ${teamId}`);
      return teamId;
    } else {
      console.warn(`⚠ Team ${teamId} not found, creating new team`);
    }
  }

  // Create a test team
  const testTeamName = `Test Team ${Date.now()}`;
  const testTeamSlug = `test-team-${Date.now()}`;
  
  const { data: team, error } = await supabaseAdmin
    .from('teams')
    .insert({
      name: testTeamName,
      slug: testTeamSlug,
    })
    .select('id')
    .single();

  if (error || !team) {
    throw new Error(`Failed to create team: ${error?.message}`);
  }

  console.log(`✓ Created test team: ${team.id} (${testTeamName})`);
  return team.id;
}

async function getPlanId(planSlug: string): Promise<string> {
  const { data: plan, error } = await supabaseAdmin
    .from('vps_plans')
    .select('id')
    .eq('slug', planSlug)
    .single();

  if (error || !plan) {
    throw new Error(`Plan ${planSlug} not found. Available plans: kvm-1, kvm-2, kvm-4, kvm-8`);
  }

  return plan.id;
}

async function getAddonIds(addonSlugs: string[]): Promise<string[]> {
  if (!addonSlugs || addonSlugs.length === 0) {
    return [];
  }

  const { data: addons, error } = await supabaseAdmin
    .from('addons')
    .select('id, slug')
    .in('slug', addonSlugs);

  if (error || !addons) {
    throw new Error(`Failed to fetch addons: ${error?.message}`);
  }

  return addons.map(a => a.id);
}

async function createCheckoutSession(
  teamId: string,
  planId: string,
  location: string,
  addonIds: string[]
): Promise<Stripe.Checkout.Session> {
  // Get plan details
  const { data: plan } = await supabaseAdmin
    .from('vps_plans')
    .select('stripe_price_id')
    .eq('id', planId)
    .single();

  if (!plan?.stripe_price_id) {
    throw new Error('Plan does not have a Stripe price ID. Run setup-stripe-products.ts first.');
  }

  // Get addon details (including RAG AI which is required)
  const { data: ragAiAddon } = await supabaseAdmin
    .from('addons')
    .select('id, stripe_price_id')
    .eq('slug', 'rag-ai')
    .single();

  const finalAddonIds = new Set(addonIds);
  if (ragAiAddon) {
    finalAddonIds.add(ragAiAddon.id);
  }

  const { data: addons } = await supabaseAdmin
    .from('addons')
    .select('id, stripe_price_id')
    .in('id', Array.from(finalAddonIds));

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: plan.stripe_price_id,
      quantity: 1,
    },
  ];

  // Add addon prices
  for (const addon of addons || []) {
    if (addon.stripe_price_id && !addon.stripe_price_id.includes('placeholder')) {
      // Check if metered
      try {
        const price = await stripe.prices.retrieve(addon.stripe_price_id);
        const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
          price: addon.stripe_price_id,
        };
        if (price.recurring?.usage_type !== 'metered') {
          lineItem.quantity = 1;
        }
        lineItems.push(lineItem);
      } catch (err) {
        console.warn(`⚠ Failed to retrieve price for addon ${addon.id}`);
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: lineItems,
    metadata: {
      teamId,
      planId,
      addonIds: Array.from(finalAddonIds).join(','),
      location,
      type: 'vps_provisioning',
      test: 'true',
    },
    subscription_data: {
      metadata: {
        teamId,
        planId,
        location,
      },
    },
    success_url: `${siteUrl}/dashboard?success=true&test=true`,
    cancel_url: `${siteUrl}/dashboard/onboarding?canceled=true`,
    client_reference_id: teamId,
  });

  return session;
}

async function triggerWebhookWithStripeCLI(
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // Use Stripe CLI to trigger webhook event
    const payload = JSON.stringify(data);
    const command = `stripe trigger ${eventType} --override ${Object.entries(data)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ')}`;

    console.log(`\n📡 Triggering ${eventType} via Stripe CLI...`);
    console.log(`   Command: ${command}`);
    
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ Successfully triggered ${eventType}`);
  } catch (error) {
    console.error(`❌ Failed to trigger ${eventType}:`, error);
    throw error;
  }
}

async function simulateCheckoutCompleted(
  session: Stripe.Checkout.Session,
  teamId: string,
  planId: string,
  location: string,
  addonIds: string[]
): Promise<void> {
  // Get the subscription
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    throw new Error('No subscription ID in session');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product'],
  });

  // Trigger checkout.session.completed event
  await triggerWebhookWithStripeCLI('checkout.session.completed', {
    id: session.id,
    object: 'checkout.session',
    customer: subscription.customer,
    subscription: subscriptionId,
    metadata: {
      teamId,
      planId,
      addonIds: addonIds.join(','),
      location,
      type: 'vps_provisioning',
    },
    payment_status: 'paid',
    mode: 'subscription',
  });
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Usage: npx tsx scripts/simulate-stripe-purchase.ts [options]

Options:
  --plan <slug>        VPS plan slug (kvm-1, kvm-2, kvm-4, kvm-8) [default: kvm-1]
  --location <loc>     Location (us, eu, asia) [default: us]
  --addons <slugs>     Comma-separated addon slugs (e.g., content-gen,chatbot) [optional]
  --team-id <id>       Use existing team ID instead of creating new one
  --webhook-only       Only trigger webhook events (requires existing subscription)
  --help               Show this help message

Examples:
  # Basic test purchase
  npx tsx scripts/simulate-stripe-purchase.ts

  # Test with specific plan and addons
  npx tsx scripts/simulate-stripe-purchase.ts --plan kvm-2 --location eu --addons content-gen,chatbot

  # Use existing team
  npx tsx scripts/simulate-stripe-purchase.ts --team-id <team-uuid>

Prerequisites:
  1. Stripe CLI installed: https://stripe.com/docs/stripe-cli
  2. Stripe CLI logged in: stripe login
  3. Webhook forwarding running: stripe listen --forward-to localhost:3000/api/stripe/webhook
    `);
    return;
  }

  console.log('🚀 Simulating Stripe Purchase...\n');

  try {
    const planSlug = options.plan || 'kvm-1';
    const location = options.location || 'us';
    const addonSlugs = options.addons || [];

    // Get or create team
    const teamId = await getOrCreateTeam(options.teamId);
    
    // Get plan ID
    const planId = await getPlanId(planSlug);
    console.log(`✓ Using plan: ${planSlug} (${planId})`);

    // Get addon IDs
    const addonIds = await getAddonIds(addonSlugs);
    if (addonIds.length > 0) {
      console.log(`✓ Using addons: ${addonSlugs.join(', ')}`);
    }

    if (options.webhookOnly) {
      console.log('\n⚠ Webhook-only mode: You need to provide an existing subscription ID');
      console.log('   This mode is for testing webhooks with existing subscriptions');
      return;
    }

    // Create checkout session
    console.log('\n📝 Creating checkout session...');
    const session = await createCheckoutSession(teamId, planId, location, addonIds);
    console.log(`✓ Checkout session created: ${session.id}`);
    console.log(`  URL: ${session.url}`);

    // Wait a moment for subscription to be created
    console.log('\n⏳ Waiting for subscription to be created...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Trigger webhook events
    console.log('\n📡 Triggering webhook events...');
    await simulateCheckoutCompleted(session, teamId, planId, location, addonIds);

    console.log('\n✅ Simulation complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Team ID: ${teamId}`);
    console.log(`   - Plan: ${planSlug}`);
    console.log(`   - Location: ${location}`);
    console.log(`   - Addons: ${addonSlugs.length > 0 ? addonSlugs.join(', ') : 'RAG AI (required)'}`);
    console.log(`   - Checkout Session: ${session.id}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Check your webhook logs to see if events were received`);
    console.log(`   2. Check database for subscription and VPS instance`);
    console.log(`   3. Verify VPS provisioning was triggered`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('\n❌ Error:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

