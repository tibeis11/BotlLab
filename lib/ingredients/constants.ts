/**
 * Fixed UUIDs for the four "fallback" ingredient_master rows.
 * These are used when an ingredient cannot be matched to a real master entry.
 *
 * ⚠️  These UUIDs are referenced both in SQL migrations and TypeScript code.
 *     Do NOT change them without a coordinated migration that updates all
 *     recipe_ingredients rows pointing to the old IDs.
 */
export const FALLBACK_MASTER_IDS = {
  malt:  '00000000-0000-4000-a000-000000000001',
  hop:   '00000000-0000-4000-a000-000000000002',
  yeast: '00000000-0000-4000-a000-000000000003',
  misc:  '00000000-0000-4000-a000-000000000004',
} as const;

/** All fallback UUIDs as a Set for O(1) membership checks. */
export const FALLBACK_MASTER_ID_SET = new Set<string>(Object.values(FALLBACK_MASTER_IDS));
