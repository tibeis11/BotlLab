/**
 * Stripe Client Configuration
 * Phase 2.1: Payment Integration
 * 
 * This file initializes the Stripe client and provides helper functions
 * for subscription management.
 */

import Stripe from 'stripe';

// Fallback für Build/Dev ohne Stripe Keys (verhindert Absturz beim Start)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_not_set';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY missing. Stripe features will fail if used.');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  typescript: true,
});

/**
 * Stripe Price IDs for each tier
 * Get these from Stripe Dashboard after creating products
 */
export const STRIPE_PRICES = {
  brewer: process.env.STRIPE_PRICE_BREWER || 'price_brewer_placeholder',
  brewery: process.env.STRIPE_PRICE_BREWERY || 'price_brewery_placeholder',
} as const;

/**
 * Get Stripe Price ID for a given tier
 */
export function getPriceIdForTier(tier: 'brewer' | 'brewery'): string {
  const priceId = STRIPE_PRICES[tier];
  if (!priceId) {
    throw new Error(`No Stripe price configured for tier: ${tier}`);
  }
  return priceId;
}

/**
 * Get tier name for display
 */
export function getTierDisplayName(tier: 'brewer' | 'brewery'): string {
  return tier === 'brewer' ? 'Heimbrauer (Brewer)' : 'Brauerei (Brewery)';
}

/**
 * Get tier price for display
 */
export function getTierPrice(tier: 'brewer' | 'brewery'): string {
  return tier === 'brewer' ? '€4.99' : '€14.99';
}
