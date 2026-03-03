// ============================================================================
// Beat the Brewer — Server Actions (Phase 11.1)
//
// Handles:
// 1. submitBeatTheBrewer: Saves player's guess, calculates match score,
//    awards tasting IQ points, inserts tasting_score_event
// 2. getTastingIQ: Returns user's current tasting IQ + rank
// 3. getLeaderboard: Top N users by tasting IQ
// ============================================================================
'use server';

import { createClient } from '@/lib/supabase-server';
import {
  calculateMatchScore,
  calculateTastingIQPoints,
  isValidFlavorProfile,
  type FlavorProfile,
  type FlavorDimensionId,
} from '@/lib/flavor-profile-config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BeatTheBrewerSubmission {
  brewId: string;
  /** Optional: Rating-ID um flavor_profile mit Bewertung zu verknüpfen */
  ratingId?: string | null;
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
  pointsAwarded: number;
  newTastingIQ: number;
  brewerProfile: {            // Revealed after submission
    sweetness: number;
    bitterness: number;
    body: number;
    roast: number;
    fruitiness: number;
  };
  dimensionScores: Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
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
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Nicht eingeloggt — bitte zuerst anmelden.');
  }

  // 1. Fetch brew + flavor profile
  const { data: brew, error: brewError } = await supabase
    .from('brews')
    .select('id, flavor_profile, style, name')
    .eq('id', submission.brewId)
    .single();

  if (brewError || !brew) {
    throw new Error('Brew nicht gefunden.');
  }

  if (!isValidFlavorProfile(brew.flavor_profile)) {
    throw new Error('Dieser Brew hat kein Geschmacksprofil — Beat the Brewer ist nicht verfügbar.');
  }

  const brewerProfile = brew.flavor_profile as FlavorProfile;

  // 2. Check if user already played this brew
  const { count: existingCount } = await supabase
    .from('tasting_score_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('brew_id', submission.brewId)
    .eq('event_type', 'beat_the_brewer');

  if (existingCount && existingCount > 0) {
    throw new Error('Du hast Beat the Brewer für dieses Bier bereits gespielt.');
  }

  // 3. Calculate match score
  const matchScore = calculateMatchScore(submission.playerProfile, brewerProfile);
  const matchPercent = Math.round(matchScore * 100);
  const pointsAwarded = calculateTastingIQPoints(matchScore);

  // 4. Build per-dimension comparison
  const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
  const dimensionScores = {} as Record<FlavorDimensionId, { player: number; brewer: number; diff: number }>;
  for (const dim of dims) {
    dimensionScores[dim] = {
      player: submission.playerProfile[dim],
      brewer: brewerProfile[dim],
      diff: Math.abs(submission.playerProfile[dim] - brewerProfile[dim]),
    };
  }

  // 5. Insert tasting_score_event
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
        brewer_values: {
          sweetness: brewerProfile.sweetness,
          bitterness: brewerProfile.bitterness,
          body: brewerProfile.body,
          roast: brewerProfile.roast,
          fruitiness: brewerProfile.fruitiness,
        },
        brew_style: brew.style,
        brew_name: brew.name,
      },
    });

  if (eventError) {
    console.error('Error inserting tasting_score_event:', eventError);
    throw new Error('Fehler beim Speichern des Ergebnisses.');
  }

  // 5b. Upsert flavor_profile für Analytics (Phase 11.6)
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
    // Non-fatal: Analytics-Fehler soll Gameplay nicht blockieren
    console.error('[beat-the-brewer] flavor_profiles upsert error:', flavorError);
  }

  // 6. Update profiles.tasting_iq
  const { data: profile } = await supabase
    .from('profiles')
    .select('tasting_iq')
    .eq('id', user.id)
    .single();

  const currentIQ = profile?.tasting_iq ?? 0;
  const newTastingIQ = currentIQ + pointsAwarded;

  await supabase
    .from('profiles')
    .update({ tasting_iq: newTastingIQ })
    .eq('id', user.id);

  return {
    matchScore,
    matchPercent,
    pointsAwarded,
    newTastingIQ,
    brewerProfile: {
      sweetness: brewerProfile.sweetness,
      bitterness: brewerProfile.bitterness,
      body: brewerProfile.body,
      roast: brewerProfile.roast,
      fruitiness: brewerProfile.fruitiness,
    },
    dimensionScores,
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
}

export async function submitVibeCheck(
  submission: VibeCheckSubmission,
): Promise<VibeCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Nicht eingeloggt.');
  }

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

  const pointsAwarded = 3; // Fixed points for vibe check

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

  // Update tasting IQ
  const { data: profile } = await supabase
    .from('profiles')
    .select('tasting_iq')
    .eq('id', user.id)
    .single();

  const newIQ = (profile?.tasting_iq ?? 0) + pointsAwarded;
  await supabase
    .from('profiles')
    .update({ tasting_iq: newIQ })
    .eq('id', user.id);

  // Get community vibes for this brew
  const { data: allVibeEvents } = await supabase
    .from('tasting_score_events')
    .select('metadata')
    .eq('brew_id', submission.brewId)
    .eq('event_type', 'vibe_check');

  const vibeCounts: Record<string, number> = {};
  let totalVibeEntries = 0;
  for (const ev of allVibeEvents || []) {
    const vibes = (ev.metadata as any)?.vibes;
    if (Array.isArray(vibes)) {
      totalVibeEntries++;
      for (const v of vibes) {
        vibeCounts[v] = (vibeCounts[v] || 0) + 1;
      }
    }
  }

  const communityVibes = Object.entries(vibeCounts)
    .map(([vibe, count]) => ({
      vibe,
      percentage: totalVibeEntries > 0 ? Math.round((count / totalVibeEntries) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return {
    pointsAwarded,
    newTastingIQ: newIQ,
    communityVibes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get community vibes for display (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCommunityVibes(
  brewId: string,
): Promise<{ vibe: string; percentage: number }[]> {
  const supabase = await createClient();

  const { data: events } = await supabase
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
