/**
 * Cap Tier Roll
 *
 * Determines the rarity tier of a collected crown cap.
 * Probabilities:
 *   gold   — 0.5%   (legendary)
 *   silver — 4.5%   (rare)
 *   bronze — 15%    (uncommon)
 *   zinc   — 80%    (common)
 *
 * This function is intentionally simple and side-effect-free so it
 * can be called from both API routes (server) and client-side fallback paths.
 */
export type CapTier = 'gold' | 'silver' | 'bronze' | 'zinc';

export function rollCapTier(): CapTier {
  const roll = Math.random() * 100; // 0 – 99.999…
  if (roll < 0.5)  return 'gold';
  if (roll < 5)    return 'silver';
  if (roll < 20)   return 'bronze';
  return 'zinc';
}
