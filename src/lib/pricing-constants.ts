/**
 * Pricing Constants for HeyKlever AI
 * Based on Gemini 3 costs and required margins
 */

// Gemini 3 Base Costs (per 1M tokens)
export const GEMINI_INPUT_COST_PER_MILLION = 0.50;
export const GEMINI_OUTPUT_COST_PER_MILLION = 3.00;

// Base costs per 1k tokens (for internal calculations)
export const GEMINI_INPUT_COST_PER_1K = GEMINI_INPUT_COST_PER_MILLION / 1000;
export const GEMINI_OUTPUT_COST_PER_1K = GEMINI_OUTPUT_COST_PER_MILLION / 1000;

// Margins
export const MARGIN_AI = 1.30;   // 30% AI margin
export const MARGIN_SAAS = 2.00; // 50% SaaS margin

// Standard Multiplier (2.6x)
export const STANDARD_MULTIPLIER = MARGIN_AI * MARGIN_SAAS;

// RAG AI Multiplier (Higher margin for complexity/storage)
export const RAG_MULTIPLIER = 3.00; 

// Platform Subscription Plans
export const PLATFORM_PLANS = {
  starter: {
    name: 'Starter',
    slug: 'starter',
    price: 49,
    includedTokens: 1_000_000,
    specs: { storage: '50GB', documents: 'Unlimited', clientPages: 1 }
  },
  growth: {
    name: 'Growth',
    slug: 'growth',
    price: 99,
    includedTokens: 5_000_000,
    specs: { storage: '200GB', documents: 'Unlimited', clientPages: 3 }
  },
  pro: {
    name: 'Pro',
    slug: 'pro',
    price: 199,
    includedTokens: 20_000_000,
    specs: { storage: '500GB', documents: 'Unlimited', clientPages: 5 }
  }
} as const;

export type PlanSlug = keyof typeof PLATFORM_PLANS;

// Setup Fee
export const SETUP_FEE = {
  name: 'Platform Setup',
  price: 149,
  description: 'One-time provisioning and onboarding fee'
};

/**
 * Calculate customer price per 1k tokens
 */
export function calculateCustomerPricePer1k(
  type: 'input' | 'output', 
  addonSlug: string
): number {
  const baseCost = type === 'input' ? GEMINI_INPUT_COST_PER_1K : GEMINI_OUTPUT_COST_PER_1K;
  const multiplier = addonSlug === 'rag-ai' ? RAG_MULTIPLIER : STANDARD_MULTIPLIER;
  
  // Round to 5 decimal places to avoid floating point issues
  return Math.round(baseCost * multiplier * 100000) / 100000;
}

/**
 * Get included tokens for a plan
 */
export function getIncludedTokens(planSlug: string): number {
  const plan = PLATFORM_PLANS[planSlug as PlanSlug];
  return plan ? plan.includedTokens : 0;
}

/**
 * Calculate overage tokens to report to Stripe
 * @param used Total tokens used in current period
 * @param included Included tokens for the plan
 * @param reportedAlready Amount already reported to Stripe in this period (optional, if tracking incrementally)
 */
export function calculateOverageTokens(used: number, included: number): number {
  return Math.max(0, used - included);
}

