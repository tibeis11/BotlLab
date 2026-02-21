/**
 * BotlLab Recommendation Engine
 * ──────────────────────────────
 * Pure-TypeScript utility — no React deps, safe to import on server or client.
 *
 * Pipeline:
 *  1. buildUserProfile()  → aggregate user signals from own brews + likes
 *  2. scoreBrewForUser()  → 0–1 similarity score per candidate brew
 *  3. getPersonalizedBrews() → ranked, diversity-injected list (80 comfort / 10 explore / 10 fresh)
 *  4. getQualityFallback() → fallback when not enough user data
 */

// ────────────────────────────────────────────────────────────────────────────
// Types (mirrors the Brew type in DiscoverClient.tsx so no extra imports)
// ────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBrew = Record<string, any>;

export interface UserProfile {
  /** Styles from the user's own brews  (weight 3 each) */
  ownStyles:       Record<string, number>;
  /** Hop names from the user's own brews (weight 2 each) */
  ownHops:         Record<string, number>;
  /** Malt names from the user's own brews (weight 2 each) */
  ownMalts:        Record<string, number>;
  /** Weighted average ABV across own + liked + viewed brews */
  avgAbv:          number;
  /** Most-frequent complexity tier in own brews */
  complexityMode:  'simple' | 'intermediate' | 'complex' | null;
  /** Styles from liked brews (weight 2 each) */
  likedStyles:     Record<string, number>;
  /** Hop names from liked brews (weight 1 each) */
  likedHops:       Record<string, number>;
  /** Styles from viewed brews (weight 0.5 each — implicit curiosity signal) */
  viewedStyles:    Record<string, number>;
  /** IDs of brews the user has viewed (Stufe B signal) */
  viewedBrewIds:   Set<string>;
  /** IDs recommended by collaborative filtering (Stufe C signal) */
  collaborativeBrewIds: Set<string>;
  /** remix_parent_ids in user's own brews → already "copied" */
  copiedBrewIds:   Set<string>;
  /** The user's own brew IDs — never recommend back to owner */
  ownBrewIds:      Set<string>;
  /** Styles from brews rated ≥ 4★ by this user */
  highRatedStyles: Record<string, number>;
  /** How many own brews were used — drives fallback threshold */
  dataCount:       number;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Minimum number of own brews before full personalisation kicks in */
export const NEEDS_MORE_DATA_THRESHOLD = 3;

/** BJCP-inspired style family groupings for "close but different" recommendations */
const STYLE_FAMILIES: Record<string, string[]> = {
  ipa:     ['IPA', 'NEIPA', 'West Coast IPA', 'Hazy IPA', 'Session IPA', 'Double IPA', 'DIPA', 'Imperial IPA'],
  weizen:  ['Weizen', 'Weißbier', 'Hefeweizen', 'Dunkelweizen', 'Weizenbock'],
  stout:   ['Stout', 'Porter', 'Imperial Stout', 'Milk Stout', 'Oatmeal Stout'],
  lager:   ['Lager', 'Helles', 'Märzen', 'Pilsner', 'Pils', 'Bock', 'Doppelbock'],
  pale:    ['Pale Ale', 'American Pale Ale', 'APA', 'Blonde Ale'],
  belgian: ['Saison', 'Belgian Tripel', 'Belgian Dubbel', 'Witbier', 'Tripel', 'Dubbel'],
  sour:    ['Sour', 'Berliner Weisse', 'Gose', 'Lambic', 'Gueuze'],
  dark:    ['Altbier', 'Dunkel', 'Schwarzbier', 'Brown Ale', 'Scotch Ale'],
  koelsch: ['Kölsch', 'Kolsch'],
};

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

function styleFamily(style: string | null | undefined): string | null {
  if (!style) return null;
  const s = style.toLowerCase();
  for (const [family, styles] of Object.entries(STYLE_FAMILIES)) {
    if (styles.some(st => s.includes(st.toLowerCase()))) return family;
  }
  return null;
}

function incrementMap(map: Record<string, number>, key: string | undefined | null, by = 1) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + by;
}

/** Jaccard similarity between two string sets: |A ∩ B| / |A ∪ B| */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Derive complexity tier from ingredient / step counts (same logic as DiscoverBrewCard) */
function getComplexity(brew: AnyBrew): 'simple' | 'intermediate' | 'complex' {
  const maltCount  = Array.isArray(brew.data?.malts)      ? brew.data.malts.length      : 0;
  const hopCount   = Array.isArray(brew.data?.hops)       ? brew.data.hops.length       : 0;
  const stepCount  = Array.isArray(brew.data?.mash_steps) ? brew.data.mash_steps.length : 0;
  const total      = maltCount + hopCount + stepCount;
  if (total <= 4) return 'simple';
  if (total <= 9) return 'intermediate';
  return 'complex';
}

function extractAbv(brew: AnyBrew): number | null {
  const raw = brew.abv ?? brew.data?.abv;
  if (raw == null) return null;
  const n = parseFloat(String(raw));
  return isNaN(n) ? null : n;
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build a user preference profile from:
 *  - `ownBrews`             the user's own public brews (strongest signal, weight 3)
 *  - `likedBrews`           brews the user has liked (moderate signal, weight 2)
 *  - `highRatedBrews`       brews the user rated ≥ 4★ (optional, weight 1.5)
 *  - `viewedBrews`          brews viewed ≥ 3s in the Discover feed (Stufe B, weight 0.5)
 *  - `collaborativeBrewIds` brew IDs recommended by similar users (Stufe C, score bonus)
 */
export function buildUserProfile(
  ownBrews:             AnyBrew[],
  likedBrews:           AnyBrew[],
  highRatedBrews:       AnyBrew[]    = [],
  viewedBrews:          AnyBrew[]    = [],
  collaborativeBrewIds: Set<string>  = new Set(),
): UserProfile {
  const profile: UserProfile = {
    ownStyles:            {},
    ownHops:              {},
    ownMalts:             {},
    avgAbv:               0,
    complexityMode:       null,
    likedStyles:          {},
    likedHops:            {},
    viewedStyles:         {},
    viewedBrewIds:        new Set(),
    collaborativeBrewIds,
    copiedBrewIds:        new Set(),
    ownBrewIds:           new Set(),
    highRatedStyles:      {},
    dataCount:            ownBrews.length,
  };

  const complexityCounts: Record<string, number> = {};
  let abvWeightedSum = 0;
  let abvWeightTotal = 0;

  // ── Own brews (weight 3) ────────────────────────────────────────
  for (const brew of ownBrews) {
    profile.ownBrewIds.add(brew.id);
    if (brew.remix_parent_id) profile.copiedBrewIds.add(brew.remix_parent_id);

    incrementMap(profile.ownStyles, brew.style, 3);

    const abv = extractAbv(brew);
    if (abv != null) { abvWeightedSum += abv * 3; abvWeightTotal += 3; }

    const complexity = getComplexity(brew);
    complexityCounts[complexity] = (complexityCounts[complexity] ?? 0) + 1;

    const hops  = Array.isArray(brew.data?.hops)  ? brew.data.hops  : [];
    const malts = Array.isArray(brew.data?.malts) ? brew.data.malts : [];
    for (const h of hops)  incrementMap(profile.ownHops,  h.name, 2);
    for (const m of malts) incrementMap(profile.ownMalts, m.name, 2);
  }

  // ── Liked brews (weight 2 style, 1 hops, 0.5 abv) ──────────────
  for (const brew of likedBrews) {
    incrementMap(profile.likedStyles, brew.style, 2);

    const abv = extractAbv(brew);
    if (abv != null) { abvWeightedSum += abv * 1; abvWeightTotal += 1; }

    const hops = Array.isArray(brew.data?.hops) ? brew.data.hops : [];
    for (const h of hops) incrementMap(profile.likedHops, h.name, 1);
  }

  // ── High-rated brews (weight 1.5) ───────────────────────────────
  for (const brew of highRatedBrews) {
    incrementMap(profile.highRatedStyles, brew.style, 1.5);
  }

  // ── Viewed brews — Stufe B (weight 0.5 — implicit curiosity signal) ──
  // These are brews the user dwelt on for ≥ 3s in the Discover feed,
  // indicating interest even without an explicit like/copy action.
  for (const brew of viewedBrews) {
    incrementMap(profile.viewedStyles, brew.style, 0.5);
    profile.viewedBrewIds.add(brew.id);

    const abv = extractAbv(brew);
    if (abv != null) { abvWeightedSum += abv * 0.5; abvWeightTotal += 0.5; }
  }

  // ── Aggregate ───────────────────────────────────────────────────
  profile.avgAbv = abvWeightTotal > 0 ? abvWeightedSum / abvWeightTotal : 5.0;

  const topComplexity = Object.entries(complexityCounts).sort((a, b) => b[1] - a[1])[0];
  profile.complexityMode = (topComplexity?.[0] as UserProfile['complexityMode']) ?? null;

  return profile;
}

/**
 * Compute a 0–1 similarity score for a single brew vs. the given user profile.
 *
 * Score weights:
 *  0.35  style exact match
 *  0.20  style family match (BJCP grouping)
 *  0.20  hop overlap (Jaccard)
 *  0.10  malt overlap (Jaccard)
 *  0.10  ABV proximity  (1 - |userAvgAbv - brewAbv| / 5, clamped)
 *  0.05  quality normalised (quality_score / 100)
 *  +0.05 liked-style bonus
 *  +0.03 complexity comfort bonus
 */
export function scoreBrewForUser(brew: AnyBrew, profile: UserProfile): number {
  let score = 0;

  // 1. Style exact match (0.35)
  if (brew.style && profile.ownStyles[brew.style]) {
    score += 0.35 * Math.min(profile.ownStyles[brew.style] / 3, 1);
  }

  // 2. Style family match (0.20)
  const brewFam = styleFamily(brew.style);
  if (brewFam) {
    let famScore = 0;
    for (const [style, weight] of Object.entries(profile.ownStyles)) {
      if (styleFamily(style) === brewFam) famScore += weight;
    }
    score += 0.20 * Math.min(famScore / 5, 1);
  }

  // 3. Hop overlap – Jaccard (0.20)
  const userHops = new Set(Object.keys(profile.ownHops));
  const brewHops = new Set<string>(
    (Array.isArray(brew.data?.hops) ? brew.data.hops : [])
      .map((h: AnyBrew) => h.name as string)
      .filter(Boolean),
  );
  score += 0.20 * jaccard(userHops, brewHops);

  // 4. Malt overlap – Jaccard (0.10)
  const userMalts = new Set(Object.keys(profile.ownMalts));
  const brewMalts = new Set<string>(
    (Array.isArray(brew.data?.malts) ? brew.data.malts : [])
      .map((m: AnyBrew) => m.name as string)
      .filter(Boolean),
  );
  score += 0.10 * jaccard(userMalts, brewMalts);

  // 5. ABV proximity (0.10)
  const brewAbv = extractAbv(brew);
  if (brewAbv != null && profile.avgAbv > 0) {
    const diff = Math.abs(profile.avgAbv - brewAbv);
    score += 0.10 * Math.max(0, 1 - diff / 5);
  }

  // 6. Quality normalised (0.05)
  if (brew.quality_score != null) {
    score += 0.05 * Math.min(brew.quality_score / 100, 1);
  }

  // Liked-style bonus (+0.05)
  if (brew.style && profile.likedStyles[brew.style]) {
    score += 0.05 * Math.min(profile.likedStyles[brew.style] / 4, 1);
  }

  // Complexity comfort bonus (+0.03)
  if (profile.complexityMode && getComplexity(brew) === profile.complexityMode) {
    score += 0.03;
  }

  // Viewed-style curiosity bonus (+0.02) — Stufe B
  // User dwelt on similar brews → soft interest signal
  if (brew.style && profile.viewedStyles[brew.style]) {
    score += 0.02 * Math.min(profile.viewedStyles[brew.style] / 3, 1);
  }

  // Collaborative filtering bonus (+0.15) — Stufe C
  // Similar users liked/brewed this → strong cross-user signal
  if (profile.collaborativeBrewIds.has(brew.id)) {
    score += 0.15;
  }

  return score;
}

/**
 * Returns the single strongest reason why a brew was recommended to the user.
 * Used for the "Warum empfohlen?"-tooltip on portrait cards.
 */
export function getRecommendationReason(brew: AnyBrew, profile: UserProfile): string | null {
  // 1. Exact style match in own brews
  if (brew.style && profile.ownStyles[brew.style]) {
    return `Weil du ${brew.style} braust`;
  }
  // 2. Liked style match
  if (brew.style && profile.likedStyles[brew.style]) {
    return `Weil du ${brew.style} likest`;
  }
  // 3. Style family match in own brews
  const brewFam = styleFamily(brew.style);
  if (brewFam) {
    for (const [style] of Object.entries(profile.ownStyles)) {
      if (styleFamily(style) === brewFam) {
        return `Ähnlich wie dein ${style}`;
      }
    }
  }
  // 4. Hop overlap with own brews
  const userHops = new Set(Object.keys(profile.ownHops));
  const brewHops = (Array.isArray(brew.data?.hops) ? brew.data.hops : [])
    .map((h: AnyBrew) => h.name as string)
    .filter(Boolean);
  const overlappingHops = brewHops.filter((h: string) => userHops.has(h));
  if (overlappingHops.length > 0) {
    return `Enthält ${overlappingHops[0]}`;
  }
  // 5. Collaborative signal
  if (profile.collaborativeBrewIds.has(brew.id)) {
    return 'Beliebt bei ähnlichen Brauern';
  }
  // 6. High-rated style
  if (brew.style && profile.highRatedStyles[brew.style]) {
    return `Du bewertest ${brew.style} hoch`;
  }
  return null;
}

/**
 * Build the final personalised list using an 80/10/10 diversity strategy:
 *  - 80% comfort  — highest similarity-score candidates
 *  - 10% explore  — best brew from a *new* style family the user hasn't tried
 *  - 10% fresh    — highest trending_score candidate not already included
 *
 * Falls back gracefully if there are too few candidates.
 */
export function getPersonalizedBrews(
  pool:       AnyBrew[],
  profile:    UserProfile,
  trending:   AnyBrew[],
  maxResults = 10,
): AnyBrew[] {
  // Exclude the user's own brews and brews they already copied
  const candidates = pool.filter(
    b => !profile.ownBrewIds.has(b.id) && !profile.copiedBrewIds.has(b.id),
  );

  if (candidates.length === 0) return [];

  // Score + rank
  const scored = candidates
    .map(b => ({ brew: b, score: scoreBrewForUser(b, profile) }))
    .sort((a, b) => b.score - a.score);

  // Comfort slice (80%)
  const comfortCount = Math.max(1, Math.floor(maxResults * 0.8));
  const comfort      = scored.slice(0, comfortCount).map(s => s.brew);
  const resultIds    = new Set(comfort.map(b => b.id));

  // Exploration slot (10%) — style family the user has *never* brewed
  const seenFamilies = new Set<string | null>(comfort.map(b => styleFamily(b.style)));
  const userFamilies = new Set<string | null>(
    Object.keys(profile.ownStyles).map(s => styleFamily(s)),
  );
  let exploration: AnyBrew | null = null;
  for (const s of scored) {
    if (resultIds.has(s.brew.id)) continue;
    const f = styleFamily(s.brew.style);
    if (f && !seenFamilies.has(f) && !userFamilies.has(f)) {
      exploration = s.brew;
      break;
    }
  }
  // Fallback: next best not already in comfort
  if (!exploration) {
    exploration = scored.find(s => !resultIds.has(s.brew.id))?.brew ?? null;
  }

  const result = [...comfort];
  if (exploration && !resultIds.has(exploration.id) && result.length < maxResults) {
    result.push(exploration);
    resultIds.add(exploration.id);
  }

  // Freshness slot (10%) — highest trending_score not already in result
  const freshnessCandidate = trending.find(
    b => !resultIds.has(b.id) && !profile.ownBrewIds.has(b.id),
  );
  if (freshnessCandidate && result.length < maxResults) {
    result.push(freshnessCandidate);
  }

  return result.slice(0, maxResults);
}

/**
 * Quality-based fallback used when the user has fewer than NEEDS_MORE_DATA_THRESHOLD
 * own brews. Returns the highest-quality public brews from the pool, excluding any
 * brews already owned by `excludeIds`.
 */
export function getQualityFallback(
  pool:        AnyBrew[],
  excludeIds?: Set<string>,
  maxResults = 10,
): AnyBrew[] {
  return [...pool]
    .filter(b => !excludeIds?.has(b.id))
    .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
    .slice(0, maxResults);
}
