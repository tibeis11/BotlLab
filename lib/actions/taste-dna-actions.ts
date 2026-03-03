'use server';

// ============================================================================
// Taste DNA — Server Actions (Phase 11.2)
//
// Aggregates user's Beat-the-Brewer data into a personal flavor profile.
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import type { FlavorDimensionId } from '@/lib/flavor-profile-config';

export interface TasteDNAProfile {
  /** Average values from all the user's slider submissions (0–1) */
  averageProfile: Record<FlavorDimensionId, number>;
  /** Number of Beat the Brewer games played */
  gamesPlayed: number;
  /** User's current tasting IQ */
  tastingIQ: number;
  /** Average match score across all games */
  averageMatchScore: number;
  /** Best match score */
  bestMatchScore: number;
  /** Strongest dimension (highest avg value) */
  strongestDimension: FlavorDimensionId | null;
  /** Style preferences (from brew styles played) */
  styleBreakdown: { style: string; count: number }[];
  /** Recent games for the timeline */
  recentGames: {
    brewName: string;
    brewStyle: string;
    matchPercent: number;
    pointsEarned: number;
    playedAt: string;
  }[];
}

const DIMS: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];

export async function getTasteDNA(): Promise<TasteDNAProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get profile tasting IQ
  const { data: profile } = await supabase
    .from('profiles')
    .select('tasting_iq')
    .eq('id', user.id)
    .single();

  // Fetch all beat_the_brewer events for this user
  const { data: events, error } = await supabase
    .from('tasting_score_events')
    .select('metadata, match_score, points_delta, created_at')
    .eq('user_id', user.id)
    .eq('event_type', 'beat_the_brewer')
    .order('created_at', { ascending: false });

  if (error || !events || events.length === 0) {
    return {
      averageProfile: { sweetness: 0, bitterness: 0, body: 0, roast: 0, fruitiness: 0 },
      gamesPlayed: 0,
      tastingIQ: profile?.tasting_iq ?? 0,
      averageMatchScore: 0,
      bestMatchScore: 0,
      strongestDimension: null,
      styleBreakdown: [],
      recentGames: [],
    };
  }

  // Aggregate profiles
  const sums: Record<FlavorDimensionId, number> = { sweetness: 0, bitterness: 0, body: 0, roast: 0, fruitiness: 0 };
  let totalMatchScore = 0;
  let bestMatch = 0;
  const styleCounts: Record<string, number> = {};

  for (const ev of events) {
    const meta = ev.metadata as any;
    const sliders = meta?.slider_values;
    if (sliders) {
      for (const dim of DIMS) {
        sums[dim] += (typeof sliders[dim] === 'number' ? sliders[dim] : 0);
      }
    }
    const ms = ev.match_score ?? 0;
    totalMatchScore += ms;
    if (ms > bestMatch) bestMatch = ms;

    const style = meta?.brew_style;
    if (style) {
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    }
  }

  const count = events.length;
  const averageProfile = {} as Record<FlavorDimensionId, number>;
  let maxDim: FlavorDimensionId | null = null;
  let maxVal = -1;

  for (const dim of DIMS) {
    const avg = count > 0 ? sums[dim] / count : 0;
    averageProfile[dim] = Math.round(avg * 100) / 100;
    if (avg > maxVal) {
      maxVal = avg;
      maxDim = dim;
    }
  }

  const styleBreakdown = Object.entries(styleCounts)
    .map(([style, cnt]) => ({ style, count: cnt }))
    .sort((a, b) => b.count - a.count);

  const recentGames = events.slice(0, 10).map((ev) => {
    const meta = ev.metadata as any;
    return {
      brewName: meta?.brew_name || 'Unbekannt',
      brewStyle: meta?.brew_style || '',
      matchPercent: Math.round((ev.match_score ?? 0) * 100),
      pointsEarned: ev.points_delta ?? 0,
      playedAt: ev.created_at,
    };
  });

  return {
    averageProfile,
    gamesPlayed: count,
    tastingIQ: profile?.tasting_iq ?? 0,
    averageMatchScore: count > 0 ? Math.round((totalMatchScore / count) * 100) : 0,
    bestMatchScore: Math.round(bestMatch * 100),
    strongestDimension: maxDim,
    styleBreakdown,
    recentGames,
  };
}
