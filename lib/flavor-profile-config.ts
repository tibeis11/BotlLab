// ============================================================================
// Flavor Profile Configuration — Beat the Brewer (Phase 11)
//
// Defines the 5 flavor dimensions used for both:
// 1. Brewer Setup (BrewEditor → brews.flavor_profile)
// 2. Drinker Challenge (BeatTheBrewerGame → match_score)
//
// Values: 0.0 – 1.0 (normalized). Display as 0–100% or 0–10.
// ============================================================================

export interface FlavorDimension {
  id: FlavorDimensionId;
  label: string;
  labelShort: string; // For radar chart labels
  minLabel: string;
  maxLabel: string;
  icon: string; // Emoji (legacy, prefer lucide icons in UI)
  hexColor: string; // CSS hex color — use for inline styles/SVG
  description: string;
  color: string; // Tailwind color class for charts
}

export type FlavorDimensionId =
  | 'sweetness'
  | 'bitterness'
  | 'body'
  | 'roast'
  | 'fruitiness';

export interface FlavorProfile {
  sweetness: number;
  bitterness: number;
  body: number;
  roast: number;
  fruitiness: number;
  source: FlavorProfileSource;
}

export type FlavorProfileSource = 'manual' | 'data_suggestion' | 'botlguide';

export const FLAVOR_DIMENSIONS: FlavorDimension[] = [
  {
    id: 'sweetness',
    label: 'Süße',
    labelShort: 'Süße',
    minLabel: 'Trocken',
    maxLabel: 'Süß',
    icon: '🍯',
    description: 'Restsüße im Bier — von trocken/herb bis deutlich süß.',
    color: 'text-amber-400',
    hexColor: '#fbbf24',
  },
  {
    id: 'bitterness',
    label: 'Bitterkeit',
    labelShort: 'Bitter',
    minLabel: 'Mild',
    maxLabel: 'Sehr bitter',
    icon: '🌿',
    description: 'Hopfen-Bitterkeit — von sanft bis aggressiv bitter.',
    color: 'text-green-400',
    hexColor: '#4ade80',
  },
  {
    id: 'body',
    label: 'Körper',
    labelShort: 'Körper',
    minLabel: 'Leicht',
    maxLabel: 'Vollmundig',
    icon: '🏋️',
    description: 'Mundgefühl — von wässrig/leicht bis schwer/vollmundig.',
    color: 'text-blue-400',
    hexColor: '#60a5fa',
  },
  {
    id: 'roast',
    label: 'Röstmalz',
    labelShort: 'Röst',
    minLabel: 'Kein Röst',
    maxLabel: 'Stark geröstet',
    icon: '☕',
    description: 'Röstaromen — von keiner Röstung bis Kaffee/Schokolade.',
    color: 'text-orange-400',
    hexColor: '#fb923c',
  },
  {
    id: 'fruitiness',
    label: 'Fruchtigkeit',
    labelShort: 'Frucht',
    minLabel: 'Keine Frucht',
    maxLabel: 'Sehr fruchtig',
    icon: '🍑',
    description: 'Fruchtaromen — von neutral bis tropisch/beerig.',
    color: 'text-pink-400',
    hexColor: '#f472b6',
  },
];

/** Empty flavor profile (all zeros) — use as initial value */
export const EMPTY_FLAVOR_PROFILE: FlavorProfile = {
  sweetness: 0.5,
  bitterness: 0.5,
  body: 0.5,
  roast: 0.5,
  fruitiness: 0.5,
  source: 'manual',
};

/**
 * Calculate match score between two flavor profiles (0–1).
 * Uses normalized Euclidean distance inverted to similarity,
 * with a minimum-spread floor (Phase 5.2) so random 50/50/50/50/50
 * guesses land at ~30% instead of ~50%.
 */
export function calculateMatchScore(
  playerProfile: Omit<FlavorProfile, 'source'>,
  brewerProfile: Omit<FlavorProfile, 'source'>,
): number {
  const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
  let sumSquaredDiff = 0;

  for (const dim of dims) {
    const diff = (playerProfile[dim] ?? 0.5) - (brewerProfile[dim] ?? 0.5);
    sumSquaredDiff += diff * diff;
  }

  // Max possible distance = sqrt(5 * 1^2) = sqrt(5) ≈ 2.236
  const maxDistance = Math.sqrt(dims.length);
  const distance = Math.sqrt(sumSquaredDiff);
  const rawScore = Math.max(0, Math.min(1, 1 - distance / maxDistance));

  // Phase 5.2: Minimum-spread floor — subtract 0.2 and renormalize to 0–1.
  // Random guesses (~0.50 raw) → ~0.375, perfect match (1.0) stays 1.0.
  const FLOOR = 0.2;
  return Math.max(0, Math.min(1, (rawScore - FLOOR) / (1 - FLOOR)));
}

/**
 * Calculate tasting IQ points from a match score.
 * Points = ROUND(matchScore * 10) → 0–10 points per game.
 */
export function calculateTastingIQPoints(matchScore: number): number {
  return Math.round(matchScore * 10);
}

/**
 * Check if a flavor profile is valid (all 5 dimensions present, 0–1 range).
 */
export function isValidFlavorProfile(
  fp: unknown,
): fp is FlavorProfile {
  if (!fp || typeof fp !== 'object') return false;
  const obj = fp as Record<string, unknown>;
  const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
  return dims.every(
    (d) => typeof obj[d] === 'number' && obj[d] >= 0 && obj[d] <= 1,
  );
}
