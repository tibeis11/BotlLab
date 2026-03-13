import { createAdminClient } from '@/lib/supabase-server';
import { getAlgorithmSettings } from '@/lib/algorithm-settings';

export interface PlausibilityResult {
  score: number;
  is_shadowbanned: boolean;
  reason?: string;
}

export interface PlausibilityOptions {
  currentBottleId?: string | null;
  timeToSubmitMs?: number | null;
  isComplexForm?: boolean;
}

/**
 * Evaluates the plausibility of a user action (e.g. Rating, VibeCheck) 
 * and applies soft penalties or hard shadowbans based on dynamic settings.
 */
export async function evaluatePlausibility(
  ipHash: string,
  userId: string | null = null,
  options: PlausibilityOptions = {}
): Promise<PlausibilityResult> {
  const { currentBottleId = null, timeToSubmitMs = null, isComplexForm = true } = options;

  let finalScore = 1.0;
  const reasons: string[] = [];

  try {
    const adminClient = createAdminClient();
    const settings = await getAlgorithmSettings();
    
    // --- SIGNAL 1: Supermarkt-Troll (Velocity) ---
    const MAX_BOTTLES = settings.plausibility_max_bottles_window;
    const WINDOW_HOURS = settings.plausibility_window_hours;

    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - WINDOW_HOURS);
    const timeWindowIso = timeWindow.toISOString();

    let query = adminClient
      .from('tasting_score_events')
      .select('bottle_id')
      .gte('created_at', timeWindowIso)
      .not('bottle_id', 'is', null);

    if (userId) query = query.eq('user_id', userId);
    else query = query.eq('ip_hash', ipHash);

    const { data: recentEvents, error } = await query;

    if (!error) {
      const distinctBottles = new Set<string>();
      recentEvents?.forEach((event: any) => {
        if (event.bottle_id) distinctBottles.add(event.bottle_id);
      });
      if (currentBottleId) distinctBottles.add(currentBottleId);

      if (distinctBottles.size > MAX_BOTTLES) {
        console.warn(`[plausibility] SHADOWBAN. Distinct: ${distinctBottles.size} in ${WINDOW_HOURS}h. User: ${userId || 'Anon'}`);
        return { 
          score: 0.0, 
          is_shadowbanned: true, 
          reason: 'velocity_threshold_exceeded' 
        };
      }
    }

    // --- SIGNAL 3: Ausfüllgeschwindigkeit (Bots / Spam) ---
    if (timeToSubmitMs !== null) {
      const minMs = isComplexForm 
        ? settings.plausibility_fast_submit_min_ms_complex
        : settings.plausibility_fast_submit_min_ms_simple;
        
      if (timeToSubmitMs < minMs) {
        // Here plausibility_fast_submit_penalty is expected to be a NEGATIVE value (e.g. -0.30)
        finalScore += settings.plausibility_fast_submit_penalty;
        reasons.push('fast_submit');
      }
    }

    // --- SIGNAL 4: Tageszeit-Anomalien ---
    const currentCET = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    const currentHour = currentCET.getHours();
    const currentDay = currentCET.getDay(); // 0 = Sunday, 1 = Monday, ..., 4 = Thursday

    // Unplausible time: Mon-Thu between 05:00 and 11:00 CET
    const isMonToThu = currentDay >= 1 && currentDay <= 4;
    if (isMonToThu && currentHour >= 5 && currentHour < 11) {
      // Here plausibility_unplausible_time_penalty is expected to be a NEGATIVE value (e.g. -0.10)
      finalScore += settings.plausibility_unplausible_time_penalty;
      reasons.push('unplausible_time');
    }

    // --- FINAL CHECK ---
    // Ensure boundaries
    finalScore = Math.max(0, Math.min(1, finalScore));
    
    // Use positive shadowban threshold for comparison 
    const isShadowbanned = finalScore <= settings.plausibility_shadowban_threshold;
    if (isShadowbanned) reasons.push('score_below_threshold');

    return { 
      score: Number(finalScore.toFixed(3)), 
      is_shadowbanned: isShadowbanned, 
      reason: reasons.length > 0 ? reasons.join(', ') : undefined
    };

  } catch (err) {
    console.error('[plausibility-service] Exception:', err);
    return { score: 1.0, is_shadowbanned: false };
  }
}
