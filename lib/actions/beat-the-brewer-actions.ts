// ============================================================================
// Beat the Brewer — Server Actions (Phase 11.1 + Phase 1 Anonymous Support)
//
// Handles:
// 1. submitBeatTheBrewer: Saves player's guess, calculates match score,
//    awards tasting IQ points (auth) or stores anonymous session (guest)
// 2. getTastingIQ: Returns user's current tasting IQ + rank
// 3. getLeaderboard: Top N users by tasting IQ
// 4. submitVibeCheck: Saves vibe selection (auth or anonymous)
// 5. claimAnonymousSession: Post-registration attribution
// ============================================================================
'use server';

import { createClient, createAdminClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';
import { createHash } from 'crypto';
import {
  calculateMatchScore,
  calculateTastingIQPoints,
  isValidFlavorProfile,
  type FlavorProfile,
  type FlavorDimensionId,
} from '@/lib/flavor-profile-config';

// ─────────────────────────────────────────────────────────────────────────────
// Late Reveal: Check if a brew has a valid flavor profile without sending
// the actual values to the client (anti-cheat for Beat the Brewer)
// ─────────────────────────────────────────────────────────────────────────────
export async function checkBrewHasFlavorProfile(brewId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('brews')
    .select('flavor_profile')
    .eq('id', brewId)
    .maybeSingle();
  return isValidFlavorProfile(data?.flavor_profile);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: IP-Hash für anonymen Spam-Schutz
// SHA256(IP + User-Agent) — nicht rückrechenbar, aber konsistent pro Gerät
// ─────────────────────────────────────────────────────────────────────────────

async function computeIpHash(): Promise<string> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headersList.get('x-real-ip')
    || 'unknown';
  const ua = headersList.get('user-agent') || 'unknown';
  return createHash('sha256').update(`${ip}:${ua}`).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BeatTheBrewerSubmission {
  brewId: string;
  /** Optional: Rating-ID um flavor_profile mit Bewertung zu verknüpfen */
  ratingId?: string | null;
  /** QR token (nonce) — prevents replay attacks. One token = one BTB play per brew. */
  qrToken?: string | null;
  /** Bottle UUID — required together with qrToken for nonce validation. */
  bottleId?: string | null;
  playerProfile: {
    sweetness: number;
    bitterness: number;
    body: number;
    roast: number;
    fruitiness: number;
  };
}

export interface BeatTheBrewerResult {
  matchScore: number;        // 0–1
  matchPercent: number;       // 0–100
  pointsAwarded: number;     // Theoretical points (0 if anonymous until claimed)
  newTastingIQ: number;      // 0 for anonymous users
  brewerProfile: {            // Revealed after submission
    sweetness: number;
    bitterness: number;
    body: number;
    roast: number;
    fruitiness: number;
  };
  dimensionScores: Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
  /** True if submitted as guest — no points awarded yet */
  isAnonymous?: boolean;
  /** Token to claim this session after registration */
  sessionToken?: string;
}

export interface TastingIQInfo {
  tastingIQ: number;
  rank: number | null;
  totalPlayers: number;
  gamesPlayed: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  logoUrl: string | null;
  tastingIQ: number;
  rank: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11.1 — Submit Beat the Brewer
// ─────────────────────────────────────────────────────────────────────────────

export async function submitBeatTheBrewer(
  submission: BeatTheBrewerSubmission,
): Promise<BeatTheBrewerResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch brew + flavor profile (public read, works for all users)
  const { data: brew, error: brewError } = await supabase
    .from('brews')
    .select('id, flavor_profile, style, name, brewery_id')
    .eq('id', submission.brewId)
    .single();

  if (brewError || !brew) {
    throw new Error('Brew nicht gefunden.');
  }

  if (!isValidFlavorProfile(brew.flavor_profile)) {
    throw new Error('Dieser Brew hat kein Geschmacksprofil — Beat the Brewer ist nicht verfügbar.');
  }

  // Phase 5.1: Brewer darf eigenes Bier nicht spielen
  if (user && brew.brewery_id) {
    const { data: membership } = await supabase
      .from('brewery_members')
      .select('id')
      .eq('brewery_id', brew.brewery_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (membership) {
      throw new Error('Als Brauer kannst du dein eigenes Bier nicht spielen.');
    }
  }

  const brewerProfile = brew.flavor_profile as FlavorProfile;

  // Phase 3.2: Nonce check — each QR token can only be used once per bottle+brew
  if (submission.qrToken && submission.bottleId) {
    const adminClient = createAdminClient();
    const { data: existingNonce } = await adminClient
      .from('btb_used_nonces')
      .select('nonce')
      .eq('nonce', submission.qrToken)
      .eq('bottle_id', submission.bottleId)
      .eq('brew_id', submission.brewId)
      .maybeSingle();

    if (existingNonce) {
      throw new Error('Dieser QR-Code wurde bereits für Beat the Brewer verwendet. Scanne die Flasche erneut.');
    }
  }

  // 2. Calculate match score (same for both paths)
  const matchScore = calculateMatchScore(submission.playerProfile, brewerProfile);
  const matchPercent = Math.round(matchScore * 100);
  const pointsAwarded = calculateTastingIQPoints(matchScore);

  // 3. Build per-dimension comparison
  const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
  const dimensionScores = {} as Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
  for (const dim of dims) {
    dimensionScores[dim] = {
      player: submission.playerProfile[dim],
      brewer: brewerProfile[dim],
      diff: Math.abs(submission.playerProfile[dim] - brewerProfile[dim]),
    };
  }

  const brewerProfileResult = {
    sweetness: brewerProfile.sweetness,
    bitterness: brewerProfile.bitterness,
    body: brewerProfile.body,
    roast: brewerProfile.roast,
    fruitiness: brewerProfile.fruitiness,
  };

  // ──── Authenticated Path ────
  if (user) {
    // Check if user already played this brew
    const { count: existingCount } = await supabase
      .from('tasting_score_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('brew_id', submission.brewId)
      .eq('event_type', 'beat_the_brewer');

    if (existingCount && existingCount > 0) {
      throw new Error('Du hast Beat the Brewer für dieses Bier bereits gespielt.');
    }

    // Insert tasting_score_event
    const { error: eventError } = await supabase
      .from('tasting_score_events')
      .insert({
        user_id: user.id,
        event_type: 'beat_the_brewer',
        brew_id: submission.brewId,
        points_delta: pointsAwarded,
        match_score: matchScore,
        metadata: {
          slider_values: submission.playerProfile,
          brewer_values: brewerProfileResult,
          brew_style: brew.style,
          brew_name: brew.name,
          qr_nonce: submission.qrToken ?? null,
        },
      });

    if (eventError) {
      console.error('Error inserting tasting_score_event:', eventError);
      throw new Error('Fehler beim Speichern des Ergebnisses.');
    }

    // Upsert flavor_profile für Analytics
    const { error: flavorError } = await supabase
      .from('flavor_profiles')
      .upsert(
        {
          brew_id: submission.brewId,
          user_id: user.id,
          rating_id: submission.ratingId ?? null,
          sweetness:  submission.playerProfile.sweetness,
          bitterness: submission.playerProfile.bitterness,
          body:       submission.playerProfile.body,
          roast:      submission.playerProfile.roast,
          fruitiness: submission.playerProfile.fruitiness,
        },
        { onConflict: 'user_id,brew_id', ignoreDuplicates: false },
      );

    if (flavorError) {
      console.error('[beat-the-brewer] flavor_profiles upsert error:', flavorError);
    }

    // Atomarer Tasting IQ Increment via DB-Funktion
    const adminClient = createAdminClient();
    const { data: iqResult } = await adminClient.rpc('increment_tasting_iq', {
      p_user_id: user.id,
      p_delta: pointsAwarded,
    });

    // Phase 3.2: Consume nonce after successful submit
    if (submission.qrToken && submission.bottleId) {
      await createAdminClient()
        .from('btb_used_nonces')
        .insert({ nonce: submission.qrToken, bottle_id: submission.bottleId, brew_id: submission.brewId })
        .then(({ error }) => { if (error) console.warn('[btb-nonce] insert error (non-fatal):', error); });
    }

    // Phase 0.4 — CIS Hard Proof: BTB completion = confirmed drinker → upgrade most recent scan
    if (submission.bottleId) {
      const { data: recentScan } = await supabase
        .from('bottle_scans')
        .select('id')
        .eq('viewer_user_id', user.id)
        .eq('bottle_id', submission.bottleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recentScan?.id) {
        await (supabase as any)
          .from('bottle_scans')
          .update({ scan_intent: 'confirmed', drinking_probability: 1.0 })
          .eq('id', recentScan.id);
      }
    }

    return {
      matchScore,
      matchPercent,
      pointsAwarded,
      newTastingIQ: iqResult ?? 0,
      brewerProfile: brewerProfileResult,
      dimensionScores,
    };
  }

  // ──── Anonymous Path ────
  const ipHash = await computeIpHash();
  const sessionToken = crypto.randomUUID();
  const adminClient = createAdminClient();

  // Step 1: Insert anonymous flavor_profile (feeds Community Radar natively)
  const { data: fp, error: fpError } = await adminClient
    .from('flavor_profiles')
    .insert({
      brew_id: submission.brewId,
      user_id: null,
      ip_hash: ipHash,
      sweetness:  submission.playerProfile.sweetness,
      bitterness: submission.playerProfile.bitterness,
      body:       submission.playerProfile.body,
      roast:      submission.playerProfile.roast,
      fruitiness: submission.playerProfile.fruitiness,
    })
    .select('id')
    .single();

  if (fpError) {
    // Unique constraint → anonymous user already played from this device
    // Load their stored session and return it instead of throwing
    if (fpError.code === '23505') {
      const { data: existingSession } = await adminClient
        .from('anonymous_game_sessions')
        .select('session_token, match_score, match_percent, payload')
        .eq('brew_id', submission.brewId)
        .eq('ip_hash', ipHash)
        .eq('event_type', 'beat_the_brewer')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        const meta = existingSession.payload as any;
        const storedSliders = meta?.slider_values ?? submission.playerProfile;
        const storedBrewer = meta?.brewer_values ?? brewerProfileResult;
        const storedMatchScore = existingSession.match_score ?? matchScore;
        const storedMatchPercent = existingSession.match_percent ?? matchPercent;

        const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
        const storedDimensionScores = {} as Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
        for (const dim of dims) {
          storedDimensionScores[dim] = {
            player: storedSliders[dim] ?? 0.5,
            brewer: storedBrewer[dim] ?? 0.5,
            diff: Math.abs((storedSliders[dim] ?? 0.5) - (storedBrewer[dim] ?? 0.5)),
          };
        }

        return {
          matchScore: storedMatchScore,
          matchPercent: storedMatchPercent,
          pointsAwarded: calculateTastingIQPoints(storedMatchScore),
          newTastingIQ: 0,
          brewerProfile: {
            sweetness: storedBrewer.sweetness ?? 0.5,
            bitterness: storedBrewer.bitterness ?? 0.5,
            body: storedBrewer.body ?? 0.5,
            roast: storedBrewer.roast ?? 0.5,
            fruitiness: storedBrewer.fruitiness ?? 0.5,
          },
          dimensionScores: storedDimensionScores,
          isAnonymous: true,
          sessionToken: existingSession.session_token,
        };
      }

      // Session not found (edge case) — soft error
      throw new Error('Du hast Beat the Brewer für dieses Bier bereits von diesem Gerät gespielt.');
    }
    console.error('[beat-the-brewer] anonymous flavor_profile insert error:', fpError);
    throw new Error('Fehler beim Speichern.');
  }

  // Step 2: Insert anonymous_game_session (state persistence + claiming)
  const { error: sessionError } = await adminClient
    .from('anonymous_game_sessions')
    .insert({
      session_token: sessionToken,
      event_type: 'beat_the_brewer',
      brew_id: submission.brewId,
      payload: {
        slider_values: submission.playerProfile,
        brewer_values: brewerProfileResult,
        brew_style: brew.style,
        brew_name: brew.name,
      },
      match_score: matchScore,
      match_percent: matchPercent,
      ip_hash: ipHash,
      flavor_profile_id: fp.id,
    });

  if (sessionError) {
    console.error('[beat-the-brewer] anonymous_game_sessions insert error:', sessionError);
    // Non-fatal: flavor_profile was already written, game data is preserved
  }

  // Phase 3.2: Consume nonce after successful submit (anonymous path)
  if (submission.qrToken && submission.bottleId) {
    await adminClient
      .from('btb_used_nonces')
      .insert({ nonce: submission.qrToken, bottle_id: submission.bottleId, brew_id: submission.brewId })
      .then(({ error }) => { if (error) console.warn('[btb-nonce] insert error (non-fatal):', error); });
  }

  return {
    matchScore,
    matchPercent,
    pointsAwarded,
    newTastingIQ: 0,
    brewerProfile: brewerProfileResult,
    dimensionScores,
    isAnonymous: true,
    sessionToken,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasting IQ Info — for the user's profile
// ─────────────────────────────────────────────────────────────────────────────

export async function getTastingIQ(): Promise<TastingIQInfo> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { tastingIQ: 0, rank: null, totalPlayers: 0, gamesPlayed: 0 };
  }

  // Get user's IQ
  const { data: profile } = await supabase
    .from('profiles')
    .select('tasting_iq')
    .eq('id', user.id)
    .single();

  const tastingIQ = profile?.tasting_iq ?? 0;

  // Get rank (count how many people have higher IQ)
  const { count: higherCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('tasting_iq', tastingIQ);

  const rank = (higherCount ?? 0) + 1;

  // Total players (anyone with IQ > 0)
  const { count: totalPlayers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('tasting_iq', 0);

  // Games played
  const { count: gamesPlayed } = await supabase
    .from('tasting_score_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'beat_the_brewer');

  return {
    tastingIQ,
    rank,
    totalPlayers: totalPlayers ?? 0,
    gamesPlayed: gamesPlayed ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 11.4 — Leaderboard
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, logo_url, tasting_iq')
    .gt('tasting_iq', 0)
    .order('tasting_iq', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((p, i) => ({
    userId: p.id,
    displayName: p.display_name || 'Anonym',
    logoUrl: p.logo_url ?? null,
    tastingIQ: p.tasting_iq,
    rank: i + 1,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 11.3 — Vibe Check Submission
// ─────────────────────────────────────────────────────────────────────────────

export interface VibeCheckSubmission {
  brewId: string;
  vibes: string[]; // e.g. ['bbq', 'outdoor', 'friends']
}

export interface VibeCheckResult {
  pointsAwarded: number;
  newTastingIQ: number;
  communityVibes: { vibe: string; percentage: number }[];
  /** True if submitted as guest */
  isAnonymous?: boolean;
  /** Token to claim this session after registration */
  sessionToken?: string;
}

export async function submitVibeCheck(
  submission: VibeCheckSubmission,
): Promise<VibeCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const pointsAwarded = 3; // Fixed points for vibe check

  // ──── Authenticated Path ────
  if (user) {
    // Check if already submitted vibe for this brew
    const { count: existingCount } = await supabase
      .from('tasting_score_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('brew_id', submission.brewId)
      .eq('event_type', 'vibe_check');

    if (existingCount && existingCount > 0) {
      throw new Error('Du hast für dieses Bier bereits einen Vibe Check gemacht.');
    }

    // Insert event
    await supabase
      .from('tasting_score_events')
      .insert({
        user_id: user.id,
        event_type: 'vibe_check',
        brew_id: submission.brewId,
        points_delta: pointsAwarded,
        match_score: null,
        metadata: {
          vibes: submission.vibes,
        },
      });

    // Phase 0.4 — CIS Soft Proof: VibeCheck boosts drinking_probability of most recent scan
    {
      const { data: recentVibeScan } = await supabase
        .from('bottle_scans')
        .select('id, drinking_probability')
        .eq('viewer_user_id', user.id)
        .eq('brew_id', submission.brewId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recentVibeScan?.id) {
        const currentProb = (recentVibeScan as any).drinking_probability ?? 0.3;
        const boostedProb = Math.min(1.0, currentProb + 0.5);
        await (supabase as any)
          .from('bottle_scans')
          .update({ drinking_probability: boostedProb })
          .eq('id', recentVibeScan.id);
      }
    }

    // Atomarer Tasting IQ Increment
    const adminClient = createAdminClient();
    const { data: iqResult } = await adminClient.rpc('increment_tasting_iq', {
      p_user_id: user.id,
      p_delta: pointsAwarded,
    });

    const communityVibes = await getCommunityVibes(submission.brewId);

    return {
      pointsAwarded,
      newTastingIQ: iqResult ?? 0,
      communityVibes,
    };
  }

  // ──── Anonymous Path ────
  const ipHash = await computeIpHash();
  const sessionToken = crypto.randomUUID();
  const adminClient = createAdminClient();

  // Insert anonymous_game_session
  const { error: sessionError } = await adminClient
    .from('anonymous_game_sessions')
    .insert({
      session_token: sessionToken,
      event_type: 'vibe_check',
      brew_id: submission.brewId,
      payload: { vibes: submission.vibes },
      ip_hash: ipHash,
    });

  if (sessionError) {
    if (sessionError.code === '23505') {
      throw new Error('Du hast den Vibe Check für dieses Bier bereits von diesem Gerät gemacht.');
    }
    console.error('[vibe-check] anonymous session insert error:', sessionError);
    throw new Error('Fehler beim Speichern.');
  }

  const communityVibes = await getCommunityVibes(submission.brewId);

  return {
    pointsAwarded,
    newTastingIQ: 0,
    communityVibes,
    isAnonymous: true,
    sessionToken,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get community vibes for display (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCommunityVibes(
  brewId: string,
): Promise<{ vibe: string; percentage: number }[]> {
  const supabase = await createClient();

  // Authenticated vibe events
  const { data: events } = await supabase
    .from('tasting_score_events')
    .select('metadata')
    .eq('brew_id', brewId)
    .eq('event_type', 'vibe_check');

  // Anonymous vibe events (via service role)
  const adminClient = createAdminClient();
  const { data: anonEvents } = await adminClient
    .from('anonymous_game_sessions')
    .select('payload')
    .eq('brew_id', brewId)
    .eq('event_type', 'vibe_check');

  const vibeCounts: Record<string, number> = {};
  let total = 0;

  // Count authenticated vibes
  for (const ev of events || []) {
    const vibes = (ev.metadata as any)?.vibes;
    if (Array.isArray(vibes)) {
      total++;
      for (const v of vibes) {
        vibeCounts[v] = (vibeCounts[v] || 0) + 1;
      }
    }
  }

  // Count anonymous vibes
  for (const ev of anonEvents || []) {
    const vibes = (ev.payload as any)?.vibes;
    if (Array.isArray(vibes)) {
      total++;
      for (const v of vibes) {
        vibeCounts[v] = (vibeCounts[v] || 0) + 1;
      }
    }
  }

  return Object.entries(vibeCounts)
    .map(([vibe, count]) => ({
      vibe,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

// ─────────────────────────────────────────────────────────────────────────────
// Check if user already played this brew (for conditional button)
// ─────────────────────────────────────────────────────────────────────────────

export async function hasPlayedBeatTheBrewer(brewId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from('tasting_score_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('brew_id', brewId)
    .eq('event_type', 'beat_the_brewer');

  return (count ?? 0) > 0;
}

export async function hasSubmittedVibeCheck(brewId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from('tasting_score_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('brew_id', brewId)
    .eq('event_type', 'vibe_check');

  return (count ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.2 — Post-Registration Attribution (Claiming)
// Calls the atomic DB function claim_anonymous_session which:
//   a) Claims the anonymous_game_session
//   b) Patches flavor_profiles.user_id
//   c) Inserts tasting_score_event
//   d) Increments tasting_iq
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaimResult {
  success: boolean;
  eventType?: string;
  brewId?: string;
  matchPercent?: number;
  pointsAwarded?: number;
  newTastingIQ?: number;
  reason?: string;
}

export async function claimAnonymousSession(
  sessionToken: string,
): Promise<ClaimResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, reason: 'not_authenticated' };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('claim_anonymous_session', {
    p_session_token: sessionToken,
    p_user_id: user.id,
  });

  if (error) {
    console.error('[claim] RPC error:', error);
    return { success: false, reason: 'rpc_error' };
  }

  const result = data as any;
  if (!result?.success) {
    return { success: false, reason: result?.reason ?? 'unknown' };
  }

  return {
    success: true,
    eventType: result.event_type,
    brewId: result.brew_id,
    matchPercent: result.match_percent,
    pointsAwarded: result.points_awarded,
    newTastingIQ: result.new_tasting_iq,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3.1 — Load historical BTB result for already-played state
// ─────────────────────────────────────────────────────────────────────────────

export interface HistoricalBTBResult extends BeatTheBrewerResult {
  playedAt: string; // ISO date string
}

export async function getBrewBTBResult(
  brewId: string,
): Promise<HistoricalBTBResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('tasting_score_events')
    .select('match_score, points_delta, metadata, created_at')
    .eq('user_id', user.id)
    .eq('brew_id', brewId)
    .eq('event_type', 'beat_the_brewer')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const meta = data.metadata as any;
  const sliderValues = meta?.slider_values;
  const brewerValues = meta?.brewer_values;

  if (!sliderValues || !brewerValues) return null;

  const matchScore = data.match_score ?? 0;
  const matchPercent = Math.round(matchScore * 100);

  const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
  const dimensionScores = {} as Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
  for (const dim of dims) {
    dimensionScores[dim] = {
      player: sliderValues[dim] ?? 0.5,
      brewer: brewerValues[dim] ?? 0.5,
      diff: Math.abs((sliderValues[dim] ?? 0.5) - (brewerValues[dim] ?? 0.5)),
    };
  }

  return {
    matchScore,
    matchPercent,
    pointsAwarded: data.points_delta ?? 0,
    newTastingIQ: 0, // historical — current IQ is looked up separately
    brewerProfile: {
      sweetness: brewerValues.sweetness ?? 0.5,
      bitterness: brewerValues.bitterness ?? 0.5,
      body: brewerValues.body ?? 0.5,
      roast: brewerValues.roast ?? 0.5,
      fruitiness: brewerValues.fruitiness ?? 0.5,
    },
    dimensionScores,
    playedAt: data.created_at,
  };
}
