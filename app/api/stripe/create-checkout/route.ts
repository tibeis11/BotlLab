import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPriceIdForTier } from '@/lib/stripe';
import { createClient } from '@/lib/supabase-server';

/**
 * Create Stripe Checkout Session
 * Phase 2.2: Checkout API Route
 * 
 * ⚠️ Protected by Commercial Barrier (NEXT_PUBLIC_ENABLE_PAYMENTS flag)
 */
export async function POST(req: NextRequest) {
  try {
    // Check if payments are enabled
    if (process.env.NEXT_PUBLIC_ENABLE_PAYMENTS !== 'true') {
      return NextResponse.json(
        { error: 'Payments are not yet available. Stay tuned!' },
        { status: 503 }
      );
    }

    const { tier } = await req.json();
    
    // Validate tier
    if (!['brewer', 'brewery'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "brewer" or "brewery".' },
        { status: 400 }
      );
    }
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }
    
    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    let customerId = profile?.stripe_customer_id;
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_uid: user.id,
        },
      });
      
      customerId = customer.id;
      
      // Save customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }
    
    // Get price ID for tier
    const priceId = getPriceIdForTier(tier as 'brewer' | 'brewery');
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/account?cancelled=true`,
      metadata: {
        user_id: user.id,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: tier,
        },
      },
      // Tax collection (B2C - everyone pays VAT)
      automatic_tax: {
        enabled: true,
      },
    });
    
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
    
  } catch (error: any) {
    console.error('[Stripe] Checkout creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
