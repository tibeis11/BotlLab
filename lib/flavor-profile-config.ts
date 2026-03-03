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
  icon: string; // Emoji
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
 * Uses normalized Euclidean distance inverted to similarity.
 * 1.0 = perfect match, 0.0 = maximum difference.
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

  return Math.max(0, Math.min(1, 1 - distance / maxDistance));
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
