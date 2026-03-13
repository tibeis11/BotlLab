import { createAdminClient } from '@/lib/supabase-server';

export interface PlausibilityResult {
  score: number;
  is_shadowbanned: boolean;
  reason?: string;
}

/**
 * Checks if a tasting action is plausible or spam/trolling.
 * Implements the "Velocity" heuristic: If an IP or User has submitted
 * evaluations for more than MAX_BOTTLES_PER_WINDOW distinct bottles in WINDOW_HOURS, it's flagged.
 *
 * @param ipHash The hashed IP address of the user
 * @param userId The UUID of the user (if logged in), or null
 * @param currentBottleId The UUID of the bottle currently being evaluated
 */
export async function evaluatePlausibility(
  ipHash: string,
  userId: string | null = null,
  currentBottleId: string | null = null
): Promise<PlausibilityResult> {
  const MAX_BOTTLES_PER_WINDOW = 3;
  const WINDOW_HOURS = 2;

  try {
    const adminClient = createAdminClient();
    
    // Calculate the cutoff time
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - WINDOW_HOURS);
    const timeWindowIso = timeWindow.toISOString();

    // Query tasting_score_events for this user or IP in the time window
    let query = adminClient
      .from('tasting_score_events')
      .select('bottle_id')
      .gte('created_at', timeWindowIso)
      .not('bottle_id', 'is', null);

    if (userId) {
      // If user is logged in, we check their specific history
      query = query.eq('user_id', userId);
    } else {
      // Otherwise we check the IP hash group
      query = query.eq('ip_hash', ipHash);
    }

    const { data: recentEvents, error } = await query;

    if (error) {
      console.error('[plausibility-service] DB error:', error);
      // Fallback: don't ban if we have an DB error
      return { score: 1.0, is_shadowbanned: false };
    }

    // Count distinct bottles
    const distinctBottles = new Set<string>();
    recentEvents?.forEach(event => {
      if (event.bottle_id) {
        distinctBottles.add(event.bottle_id);
      }
    });

    // Add the current bottle if the user scan hasn't been written to tasting_score_events yet
    if (currentBottleId) {
      distinctBottles.add(currentBottleId);
    }

    // Check against threshold
    if (distinctBottles.size > MAX_BOTTLES_PER_WINDOW) {
      console.warn(`[plausibility-service] SHADOWBAN TRIGGERED. Distinct bottles: ${distinctBottles.size} in ${WINDOW_HOURS}h. User: ${userId || 'Anon'}`);
      return { 
        score: 0.0, 
        is_shadowbanned: true, 
        reason: 'velocity_threshold_exceeded' 
      };
    }

    // All good
    return { score: 1.0, is_shadowbanned: false };

  } catch (err) {
    console.error('[plausibility-service] Exception:', err);
    // Safe default to not interrupt user flow
    return { score: 1.0, is_shadowbanned: false };
  }
}
