import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * Phase 2.3: Payment Event Processing
 * 
 * CRITICAL: This is the heart of the subscription system.
 * Handles all Stripe events to keep database in sync.
 */

// Use admin client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }
  
  console.log(`[Webhook] Received event: ${event.type}`);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout
 * User just completed payment - activate their subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  
  if (!userId || !tier) {
    throw new Error('Missing metadata in checkout session');
  }
  
  console.log(`[Webhook] Checkout completed for user ${userId}, tier: ${tier}`);
  
  // Fetch subscription to get period end
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      subscription_started_at: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscription_expires_at: new Date((subscription as any).current_period_end * 1000),
      stripe_subscription_id: subscription.id,
    })
    .eq('id', userId);
  
  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
  
  // Log to history
  await supabaseAdmin.from('subscription_history').insert({
    profile_id: userId,
    subscription_tier: tier,
    subscription_status: 'active',
    changed_reason: 'Stripe checkout completed',
    stripe_event_id: session.id,
    metadata: {
      session_id: session.id,
      subscription_id: subscription.id,
    }
  });
  
  console.log(`[Webhook] ✅ User ${userId} upgraded to ${tier}`);
}

/**
 * Handle successful invoice payment (renewal)
 * Subscription renewed - extend expiry date
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_expires_at: new Date(subscription.current_period_end * 1000),
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  if (error) {
    throw new Error(`Failed to update expiry date: ${error.message}`);
  }
  
  console.log(`[Webhook] ✅ Subscription renewed until ${new Date(subscription.current_period_end * 1000)}`);
}

/**
 * Handle failed payment
 * Payment failed - put subscription in "paused" state (grace period)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;
  
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'paused', // Grace period
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  if (error) {
    throw new Error(`Failed to pause subscription: ${error.message}`);
  }
  
  console.log(`[Webhook] ⚠️ Payment failed for subscription ${subscriptionId}`);
  
  // TODO: Send dunning email to user (Phase 3)
}

/**
 * Handle subscription update (tier change, cancellation scheduled)
 * User changed their subscription settings
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tier = subscription.metadata.tier;
  
  // Determine new status
  let status: string = 'active';
  if (subscription.cancel_at_period_end) {
    status = 'cancelled'; // Will expire at period end
  } else if (subscription.status === 'past_due') {
    status = 'paused';
  }
  
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: status,
      subscription_tier: tier || subscription.metadata.tier,
      subscription_expires_at: new Date(subscription.current_period_end * 1000),
    })
    .eq('stripe_subscription_id', subscription.id);
  
  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
  
  console.log(`[Webhook] ✅ Subscription updated: ${subscription.id} (status: ${status})`);
}

/**
 * Handle subscription deletion (immediate cancellation)
 * User or admin deleted the subscription - downgrade immediately
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      subscription_expires_at: new Date(), // Expire immediately
    })
    .eq('stripe_subscription_id', subscription.id);
  
  if (error) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
  
  // Log to history
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();
  
  if (profile) {
    await supabaseAdmin.from('subscription_history').insert({
      profile_id: profile.id,
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      changed_reason: 'Stripe subscription deleted',
      stripe_event_id: subscription.id,
    });
  }
  
  console.log(`[Webhook] ✅ Subscription cancelled: ${subscription.id}`);
}
