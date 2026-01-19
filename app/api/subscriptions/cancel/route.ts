import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Cancel Subscription API
 * 
 * Implements § 312k BGB "Kündigungsbutton" requirement:
 * - User clicks "Cancel Subscription" button
 * - Confirmation modal shown
 * - This endpoint processes the cancellation
 * - Email confirmation sent (Durable Medium)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get current subscription status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_expires_at, email, display_name')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Check if user has a cancellable subscription
    if (profile.subscription_tier === 'free') {
      return NextResponse.json(
        { success: false, error: 'No active subscription to cancel' },
        { status: 400 }
      );
    }
    
    if (profile.subscription_status === 'cancelled' || profile.subscription_status === 'expired') {
      return NextResponse.json(
        { success: false, error: 'Subscription already cancelled' },
        { status: 400 }
      );
    }
    
    // Update subscription status to 'cancelled'
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        // Keep tier and expires_at - they will stay active until expiry
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('[Cancel] Database update failed:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }
    
    // Log to subscription_history (audit trail)
    await supabase.from('subscription_history').insert({
      profile_id: user.id,
      subscription_tier: profile.subscription_tier,
      subscription_status: 'cancelled',
      previous_tier: profile.subscription_tier,
      changed_reason: 'User initiated cancellation via Kündigungsbutton',
      metadata: {
        cancelled_at: new Date().toISOString(),
        expires_at: profile.subscription_expires_at,
      }
    });
    
    // TODO: Send cancellation confirmation email (Durable Medium requirement)
    // This will be implemented with Resend/SendGrid in Phase 3
    console.log(`[Cancel] User ${user.id} cancelled subscription. Expires: ${profile.subscription_expires_at}`);
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      expires_at: profile.subscription_expires_at,
    });
    
  } catch (error: any) {
    console.error('[Cancel] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
