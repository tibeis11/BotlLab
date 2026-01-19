import { createClient } from "@/lib/supabase-server";
import { SubscriptionTier, SUBSCRIPTION_TIERS, type PremiumStatus } from "./premium-config";

/**
 * Enforce subscription expiry check
 * Returns true if profile was updated (downgraded)
 * 
 * PHASE 1.1: Real-time expiry enforcement
 * This function is called by getUserPremiumStatus() before returning status
 * to ensure expired subscriptions are immediately downgraded.
 */
async function enforceSubscriptionExpiry(
  profile: any,
  userId: string,
  supabase: any
): Promise<boolean> {
  // Null expires_at = lifetime subscription (enterprise beta users)
  if (!profile.subscription_expires_at) {
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(profile.subscription_expires_at);

  // Check if expired and still marked as active
  if (now > expiresAt && profile.subscription_status === 'active') {
    console.log(
      `[Expiry] Auto-downgrading user ${userId} from ${profile.subscription_tier} to free`
    );

    // Atomic update
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'expired',
        subscription_tier: 'free',
        ai_credits_used_this_month: 0,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Expiry] Failed to downgrade user:', updateError);
      return false;
    }

    // Log to audit trail
    await supabase.from('subscription_history').insert({
      profile_id: userId,
      subscription_tier: 'free',
      subscription_status: 'expired',
      previous_tier: profile.subscription_tier,
      changed_reason: 'Automatic expiry - real-time check detected expired subscription',
      metadata: {
        expired_at: profile.subscription_expires_at,
        detected_at: now.toISOString(),
      },
    });

    return true; // Profile was updated
  }

  return false; // No changes needed
}

/**
 * Get full premium status for a user
 */
export async function getUserPremiumStatus(
  userId: string
): Promise<PremiumStatus | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_status, subscription_expires_at, ai_credits_used_this_month, ai_credits_reset_at"
    )
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error("Failed to fetch premium status:", error);
    return null;
  }

  // ✅ PHASE 1.1: Enforce expiry check BEFORE returning status
  const wasExpired = await enforceSubscriptionExpiry(profile, userId, supabase);
  if (wasExpired) {
    // Profile was downgraded - refetch to get updated values
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select(
        "subscription_tier, subscription_status, subscription_expires_at, ai_credits_used_this_month, ai_credits_reset_at"
      )
      .eq("id", userId)
      .single();
    
    if (updatedProfile) {
      Object.assign(profile, updatedProfile);
    }
  }

  // Check if credits need reset (new month)
  const now = new Date();
  const resetDate = new Date(profile.ai_credits_reset_at);
  if (now >= resetDate) {
    // Reset credits for new month
    await supabase
      .from("profiles")
      .update({
        ai_credits_used_this_month: 0,
        ai_credits_reset_at: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      })
      .eq("id", userId);

    profile.ai_credits_used_this_month = 0;
  }

  const tier = profile.subscription_tier as SubscriptionTier;
  const config = SUBSCRIPTION_TIERS[tier];

  // Default to safety if config is missing for some reason
  if (!config) {
     console.error(`Unknown subscription tier: ${tier}`);
     return null;
  }
  
  const limits = config.features;

  const remaining =
    limits.ai_generations_per_month === -1
      ? Infinity
      : Math.max(
          0,
          limits.ai_generations_per_month - profile.ai_credits_used_this_month
        );

  return {
    tier,
    status: profile.subscription_status,
    features: {
      aiGenerationsRemaining: remaining,
      canUseCustomSlogan: limits.custom_brewery_slogan,
      canUseBreweryLogo: limits.brewery_logo_on_labels,
      bypassBrewLimits: limits.bypass_brew_limits,
      bypassBottleLimits: limits.bypass_bottle_limits,
    },
    expiresAt: profile.subscription_expires_at
      ? new Date(profile.subscription_expires_at)
      : null,
  };
}

/**
 * Check if user can generate AI content (uses atomic DB function)
 * ⚠️ IMPORTANT: This atomically checks AND increments the counter to prevent race conditions
 */
export async function canUseAI(
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();

  // Use atomic function to check and increment in single transaction
  const { data, error } = await supabase.rpc("check_and_increment_ai_credits", {
    user_id: userId,
  });

  if (error) {
    console.error("Failed to check AI credits:", error);
    return { allowed: false, reason: "Database error" };
  }

  return {
    allowed: data.can_use,
    reason: data.reason,
  };
}

/**
 * Increment AI usage counter (DEPRECATED - use check_and_increment_ai_credits instead)
 * This function is kept for logging purposes only.
 */
export async function trackAIUsage(
  userId: string,
  type: "image" | "text"
): Promise<void> {
  const supabase = await createClient();

  // Note: Actual increment is done by check_and_increment_ai_credits in canUseAI
  // This function now only logs usage

  // Log usage (optional, for analytics)
  await supabase.from("ai_usage_logs").insert({
    user_id: userId,
    generation_type: type,
    model_used: type === "image" ? "imagen-4.0" : "gemini-2.0-flash",
    success: true,
  });
}

/**
 * Check if user can use custom brewery slogan
 */
export async function canUseCustomSlogan(userId: string): Promise<boolean> {
  const status = await getUserPremiumStatus(userId);
  return status?.features.canUseCustomSlogan ?? false;
}

/**
 * Check if brewery can use logo on labels
 * ⚠️ WICHTIG: Nur der OWNER der Brauerei zählt, nicht alle Admins!
 * Dies verhindert Revenue Leaks (Ein Premium-User → 50 Brauereien).
 */
export async function canUseBreweryLogo(breweryId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get brewery owner (role = 'owner', nicht 'admin')
  // ⚠️ brewery_members.role: Valid values are 'owner', 'admin', 'member'
  // Schema: brewery_members(brewery_id UUID, user_id UUID, role TEXT, joined_at TIMESTAMPTZ)
  const { data: members } = await supabase
    .from("brewery_members")
    .select("user_id")
    .eq("brewery_id", breweryId)
    .eq("role", "owner") // NUR Owner, nicht Admin!
    .limit(1);

  if (!members || members.length === 0) return false;

  // Check if owner has premium
  const ownerId = members[0].user_id;
  const status = await getUserPremiumStatus(ownerId);

  return status?.features.canUseBreweryLogo ?? false;
}

/**
 * Get custom slogan for brewery (if premium)
 * ⚠️ Nur der OWNER kann den Custom Slogan setzen
 */
export async function getBrewerySlogan(
  breweryId: string
): Promise<string | null> {
  const supabase = await createClient();

  // Get brewery owner's custom slogan
  const { data: members } = await supabase
    .from("brewery_members")
    .select(
      "user_id, profiles(custom_brewery_slogan, subscription_tier)"
    )
    .eq("brewery_id", breweryId)
    .eq("role", "owner") // NUR Owner!
    .limit(1);

  if (!members || members.length === 0) return null;

  const owner = members[0] as any;
  const canUse = await canUseCustomSlogan(owner.user_id);

  // Check if owner wants to use custom slogan (flexible toggle)
  if (canUse && owner.profiles?.custom_brewery_slogan) {
    return owner.profiles.custom_brewery_slogan;
  }

  return null;
}
