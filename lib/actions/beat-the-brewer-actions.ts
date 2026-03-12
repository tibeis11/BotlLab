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
import { verifyQrToken } from '@/lib/actions/qr-token-actions';
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
  /** Brewing session UUID — scopes BTB per batch (different batches can taste differently). */
  sessionId?: string | null;
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
  /** True when the user already played and the stored result is returned */
  alreadyPlayed?: boolean;
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
// Helper: Look up existing BTB result for already-played recovery
// ─────────────────────────────────────────────────────────────────────────────

async function lookupExistingBTBResult(
  client: { from: (...args: any[]) => any },
  user: { id: string } | null,
  submission: BeatTheBrewerSubmission,
  brewerProfile: FlavorProfile,
): Promise<BeatTheBrewerResult | null> {
  let query = client
    .from('tasting_score_events')
    .select('match_score, metadata, session_token, ip_hash')
    .eq('event_type', 'beat_the_brewer')
    .eq('brew_id', submission.brewId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
    const ipHash = await computeIpHash();
    query = query.eq('ip_hash', ipHash);
  }

  if (submission.sessionId) {
    query = query.eq('session_id', submission.sessionId);
  }

  const { data } = await query.maybeSingle();
  if (!data) return null;

  const meta = data.metadata as any;
  const sliderValues = meta?.slider_values;
  const brewerValues = meta?.brewer_values;
  if (!sliderValues || !brewerValues) return null;

  const storedScore = data.match_score ?? 0;
  const storedPercent = Math.round(storedScore * 100);

  const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
  const storedDimScores = {} as Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
  for (const dim of dims) {
    storedDimScores[dim] = {
      player: sliderValues[dim] ?? 0.5,
      brewer: brewerValues[dim] ?? 0.5,
      diff: Math.abs((sliderValues[dim] ?? 0.5) - (brewerValues[dim] ?? 0.5)),
    };
  }

  return {
    matchScore: storedScore,
    matchPercent: storedPercent,
    pointsAwarded: 0,
    newTastingIQ: 0,
    brewerProfile: {
      sweetness: brewerValues.sweetness ?? 0.5,
      bitterness: brewerValues.bitterness ?? 0.5,
      body: brewerValues.body ?? 0.5,
      roast: brewerValues.roast ?? 0.5,
      fruitiness: brewerValues.fruitiness ?? 0.5,
    },
    dimensionScores: storedDimScores,
    isAnonymous: !user,
    sessionToken: data.session_token ?? undefined,
  };
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
      // Friendly info — not a system error, so don't log as error
      throw new Error('Als Brauer kannst du dein eigenes Bier nicht spielen. Du kennst das Rezept ja bereits 😄');
    }
  }

  const brewerProfile = brew.flavor_profile as FlavorProfile;

  // Phase 6.3: HMAC validation + atomic nonce burn (INSERT ON CONFLICT)
  if (submission.qrToken && submission.bottleId) {
    // Step 1: Verify HMAC signature
    const hmacValid = await verifyQrToken(submission.bottleId, submission.qrToken);
    if (!hmacValid) {
      throw new Error('QR_INVALID: Ungültiger QR-Code — Manipulation erkannt.');
    }

    // Step 2: Atomic nonce burn — INSERT ON CONFLICT prevents TOCTOU
    const adminClient = createAdminClient();
    const { error: nonceError } = await adminClient
      .from('btb_used_nonces')
      .insert({
        nonce: submission.qrToken,
        bottle_id: submission.bottleId,
        brew_id: submission.brewId,
      });

    if (nonceError) {
      if (nonceError.code === '23505') {
        // Nonce already used — look up existing result and return it gracefully
        const storedResult = await lookupExistingBTBResult(
          adminClient, user, submission, brew.flavor_profile as FlavorProfile,
        );
        if (storedResult) return { ...storedResult, alreadyPlayed: true };
        // Fallback: compute fresh result from submitted sliders (no double-write)
        const fbMatchScore = calculateMatchScore(submission.playerProfile, brew.flavor_profile as FlavorProfile);
        const fbMatchPercent = Math.round(fbMatchScore * 100);
        const fbDims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
        const fbDimScores = {} as Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
        const bp = brew.flavor_profile as FlavorProfile;
        for (const d of fbDims) {
          fbDimScores[d] = { player: submission.playerProfile[d], brewer: bp[d], diff: Math.abs(submission.playerProfile[d] - bp[d]) };
        }
        return {
          matchScore: fbMatchScore, matchPercent: fbMatchPercent,
          pointsAwarded: 0, newTastingIQ: 0,
          brewerProfile: { sweetness: bp.sweetness, bitterness: bp.bitterness, body: bp.body, roast: bp.roast, fruitiness: bp.fruitiness },
          dimensionScores: fbDimScores,
          isAnonymous: !user, alreadyPlayed: true,
        };
      }
      console.error('[btb-nonce] unexpected insert error:', nonceError);
      throw new Error('Fehler bei der QR-Validierung.');
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
    // Check if user already played this session/brew
    // Scoped per session (batch) when sessionId is available, else per brew (fallback)
    let dupeQuery = supabase
      .from('tasting_score_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('event_type', 'beat_the_brewer');

    if (submission.sessionId) {
      dupeQuery = dupeQuery.eq('session_id', submission.sessionId);
    } else {
      dupeQuery = dupeQuery.eq('brew_id', submission.brewId);
    }

    const { count: existingCount } = await dupeQuery;

    if (existingCount && existingCount > 0) {
      // Return stored result gracefully instead of throwing
      const storedResult = await lookupExistingBTBResult(
        supabase, user, submission, brewerProfile,
      );
      if (storedResult) return { ...storedResult, alreadyPlayed: true };
      // Fallback: compute from submitted sliders (no double-write)
      return {
        matchScore, matchPercent, pointsAwarded: 0, newTastingIQ: 0,
        brewerProfile: brewerProfileResult, dimensionScores, alreadyPlayed: true,
      };
    }

    // Look up the most recent scan to link the event
    let btbScanId: string | null = null;
    if (submission.bottleId) {
      const { data: recentScan } = await supabase
        .from('bottle_scans')
        .select('id')
        .eq('viewer_user_id', user.id)
        .eq('bottle_id', submission.bottleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      btbScanId = recentScan?.id ?? null;
    }

    // Insert tasting_score_event
    const { error: eventError } = await supabase
      .from('tasting_score_events')
      .insert({
        user_id: user.id,
        event_type: 'beat_the_brewer',
        brew_id: submission.brewId,
        session_id: submission.sessionId ?? null,
        bottle_scan_id: btbScanId,
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
    // Scoped per session when available, else per brew (fallback)
    const flavorPayload: Record<string, unknown> = {
      brew_id: submission.brewId,
      user_id: user.id,
      rating_id: submission.ratingId ?? null,
      sweetness:  submission.playerProfile.sweetness,
      bitterness: submission.playerProfile.bitterness,
      body:       submission.playerProfile.body,
      roast:      submission.playerProfile.roast,
      fruitiness: submission.playerProfile.fruitiness,
    };
    if (submission.sessionId) flavorPayload.session_id = submission.sessionId;
    const flavorConflict = submission.sessionId ? 'user_id,session_id' : 'user_id,brew_id';

    const { error: flavorError } = await supabase
      .from('flavor_profiles')
      .upsert(flavorPayload as any, { onConflict: flavorConflict, ignoreDuplicates: false });

    if (flavorError) {
      console.error('[beat-the-brewer] flavor_profiles upsert error:', flavorError);
    }

    // Atomarer Tasting IQ Increment via DB-Funktion
    const adminClient = createAdminClient();
    const { data: iqResult } = await adminClient.rpc('increment_tasting_iq', {
      p_user_id: user.id,
      p_delta: pointsAwarded,
    });

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
  const anonFlavorPayload: Record<string, unknown> = {
    brew_id: submission.brewId,
    user_id: null,
    ip_hash: ipHash,
    sweetness:  submission.playerProfile.sweetness,
    bitterness: submission.playerProfile.bitterness,
    body:       submission.playerProfile.body,
    roast:      submission.playerProfile.roast,
    fruitiness: submission.playerProfile.fruitiness,
  };
  if (submission.sessionId) anonFlavorPayload.session_id = submission.sessionId;

  const { data: fp, error: fpError } = await adminClient
    .from('flavor_profiles')
    .insert(anonFlavorPayload as any)
    .select('id')
    .single();

  if (fpError) {
    // Unique constraint → anonymous user already played from this device
    // Load their stored result and return it instead of throwing
    if (fpError.code === '23505') {
      // Phase 8: Recovery from tasting_score_events (consolidated table)
      let recoveryQuery = adminClient
        .from('tasting_score_events')
        .select('session_token, match_score, metadata')
        .eq('ip_hash', ipHash)
        .eq('event_type', 'beat_the_brewer')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (submission.sessionId) {
        recoveryQuery = recoveryQuery.eq('session_id', submission.sessionId);
      } else {
        recoveryQuery = recoveryQuery.eq('brew_id', submission.brewId);
      }

      const { data: existingEvent } = await recoveryQuery.maybeSingle();

      if (existingEvent) {
        const meta = existingEvent.metadata as any;
        const storedSliders = meta?.slider_values ?? submission.playerProfile;
        const storedBrewer = meta?.brewer_values ?? brewerProfileResult;
        const storedMatchScore = existingEvent.match_score ?? matchScore;
        const storedMatchPercent = Math.round((storedMatchScore) * 100);

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
          sessionToken: existingEvent.session_token ?? undefined,
        };
      }

      // No recovery possible — return the freshly calculated result as fallback
      // (flavor_profile duplicate doesn't mean no result — just means device already played)
      return {
        matchScore,
        matchPercent,
        pointsAwarded: 0,
        newTastingIQ: 0,
        brewerProfile: brewerProfileResult,
        dimensionScores,
        isAnonymous: true,
        sessionToken: '',
      };
    }
    console.error('[beat-the-brewer] anonymous flavor_profile insert error:', fpError);
    throw new Error('Fehler beim Speichern.');
  }

  // Step 2: Insert into tasting_score_events (consolidated — Phase 8)
  const anonEventPayload: Record<string, unknown> = {
    user_id: null,
    event_type: 'beat_the_brewer',
    brew_id: submission.brewId,
    session_id: submission.sessionId ?? null,
    points_delta: pointsAwarded,
    match_score: matchScore,
    session_token: sessionToken,
    ip_hash: ipHash,
    metadata: {
      slider_values: submission.playerProfile,
      brewer_values: brewerProfileResult,
      brew_style: brew.style,
      brew_name: brew.name,
      qr_nonce: submission.qrToken ?? null,
      flavor_profile_id: fp.id,
    },
  };

  const { error: eventError } = await adminClient
    .from('tasting_score_events')
    .insert(anonEventPayload as any);

  if (eventError) {
    console.error('[beat-the-brewer] anonymous tasting_score_events insert error:', eventError);
    // Non-fatal: flavor_profile was already written, game data is preserved
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
  bottleId: string;
  vibes: string[];
  /** QR token (nonce) — required for HMAC validation + anti-replay */
  qrToken: string;
  /** Brewing session UUID — scopes nonce per batch (refill-safe) */
  sessionId?: string | null;
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

  const pointsAwarded = 3;

  // ── Step 1: HMAC-Validierung — QR-Token MUSS vorhanden und gültig sein ──
  if (!submission.qrToken || !submission.bottleId) {
    throw new Error('QR-Code erforderlich. Bitte scanne den QR-Code auf der Flasche.');
  }

  const { valid } = await verifyQrToken(submission.qrToken, submission.bottleId);
  if (!valid) {
    throw new Error('QR-Code konnte nicht verifiziert werden.');
  }

  // ── Step 2: Nonce verbrauchen — INSERT ON CONFLICT (TOCTOU-safe) ──
  const adminClient = createAdminClient();
  const ipHash = await computeIpHash();

  const { error: nonceError } = await adminClient
    .from('vibe_check_used_nonces')
    .insert({
      nonce: submission.qrToken,
      bottle_id: submission.bottleId,
      brew_id: submission.brewId,
      session_id: submission.sessionId ?? null,
      user_id: user?.id ?? null,
      ip_hash: ipHash,
    });

  if (nonceError) {
    if (nonceError.code === '23505') {
      throw new Error('Du hast für diese Flasche bereits einen Vibe Check gemacht.');
    }
    console.error('[vibe-check] nonce insert error:', nonceError);
    throw new Error('Datenbankfehler beim Prüfen des QR-Codes.');
  }

  // ── Step 3: Event persistieren ──

  // ──── Authenticated Path ────
  if (user) {
    // Look up the most recent scan BEFORE inserting the event — we need the scan ID
    let vibeScanId: string | null = null;
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
        vibeScanId = recentVibeScan.id;
        const currentProb = (recentVibeScan as any).drinking_probability ?? 0.3;
        const boostedProb = Math.min(1.0, currentProb + 0.5);
        await (supabase as any)
          .from('bottle_scans')
          .update({ drinking_probability: boostedProb })
          .eq('id', recentVibeScan.id);
      }
    }

    await supabase
      .from('tasting_score_events')
      .insert({
        user_id: user.id,
        event_type: 'vibe_check',
        brew_id: submission.brewId,
        bottle_id: submission.bottleId,
        bottle_scan_id: vibeScanId,
        session_id: submission.sessionId ?? null,
        points_delta: pointsAwarded,
        match_score: null,
        metadata: { vibes: submission.vibes },
      });

    // Atomarer Tasting IQ Increment
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
  const sessionToken = crypto.randomUUID();

  const { error: sessionError } = await adminClient
    .from('tasting_score_events')
    .insert({
      user_id: null,
      event_type: 'vibe_check',
      brew_id: submission.brewId,
      session_id: submission.sessionId ?? null,
      session_token: sessionToken,
      ip_hash: ipHash,
      points_delta: pointsAwarded,
      metadata: {
        vibes: submission.vibes,
        bottle_id: submission.bottleId,
      },
    });

  if (sessionError) {
    if (sessionError.code === '23505') {
      throw new Error('Du hast für diese Flasche bereits einen Vibe Check gemacht.');
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
  // Phase 8.x: Single-table query — all vibe events (auth + anon) in tasting_score_events
  const adminClient = createAdminClient();
  const { data: events } = await adminClient
    .from('tasting_score_events')
    .select('metadata')
    .eq('brew_id', brewId)
    .eq('event_type', 'vibe_check');

  const vibeCounts: Record<string, number> = {};
  let total = 0;

  for (const ev of events || []) {
    const vibes = (ev.metadata as any)?.vibes;
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
  sessionId?: string | null,
): Promise<HistoricalBTBResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let query = supabase
    .from('tasting_score_events')
    .select('match_score, points_delta, metadata, created_at')
    .eq('user_id', user.id)
    .eq('brew_id', brewId)
    .eq('event_type', 'beat_the_brewer')
    .order('created_at', { ascending: false })
    .limit(1);

  // When a sessionId is provided, only return a result for this exact session.
  // A play on a different batch should not block playing again.
  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error } = await query.maybeSingle();

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
