/**
 * BotlGuide – Central Capability Constants
 *
 * All credit costs, display metadata, system-prompt building blocks, and
 * capability availability rules live here. Nothing is duplicated across routes.
 *
 * Importing:
 *   import { CAPABILITY_META, CREDIT_COST } from '@/lib/botlguide/constants';
 */

import type { BotlGuideCapability } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Credit Costs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How many credits each capability consumes per call.
 *
 * Rationale:
 *  - Text generation (LLM)  → 1 credit  (cheap, fast)
 *  - Rich analysis (LLM)    → 2 credits (more context, longer output)
 *  - Image generation       → 3 credits (Imagen 4.0 API is expensive)
 */
export const CREDIT_COST: Record<BotlGuideCapability, number> = {
  // Coach
  'coach.guide':                1,
  'coach.analyze_fermentation': 2,
  'coach.predict_fg':           2,

  // Architect
  'architect.optimize':         1,
  'architect.suggest_hops':     1,
  'architect.check_bjcp':       2,

  // Copywriter
  'copywriter.name':            1,
  'copywriter.description':     1,
  'copywriter.label_prompt':    1,
  'copywriter.social':          1,

  // Sommelier
  'sommelier.flavor_profile':   2,
  'sommelier.pairing':          2,

  // Artist
  'artist.generate_label':      3,
  'artist.generate_cap':        3,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Capability Metadata (UI Labels, Icons, Tier Gates)
// ─────────────────────────────────────────────────────────────────────────────

export type CapabilityTier = 'free' | 'brewer' | 'brewery' | 'enterprise';

export interface CapabilityMeta {
  /** Short display name shown in UI */
  label: string;
  /** Persona brand name */
  persona: 'BotlGuide Coach' | 'BotlGuide Architect' | 'BotlGuide Copywriter' | 'BotlGuide Sommelier' | 'BotlGuide Artist';
  /** Lucide icon name */
  icon: string;
  /** Minimum tier required to use this capability */
  minTier: CapabilityTier;
  /** Credits consumed (mirrors CREDIT_COST for convenience) */
  credits: number;
  /** Whether this is already implemented (Stage 0 = existing, Stage 2+ = future) */
  implemented: boolean;
}

export const CAPABILITY_META: Record<BotlGuideCapability, CapabilityMeta> = {
  // ── Coach ──────────────────────────────────────────────────────────────────
  'coach.guide': {
    label: 'Schritt erklären',
    persona: 'BotlGuide Coach',
    icon: 'BookOpen',
    minTier: 'free',
    credits: CREDIT_COST['coach.guide'],
    implemented: true,
  },
  'coach.analyze_fermentation': {
    label: 'Gärung analysieren',
    persona: 'BotlGuide Coach',
    icon: 'Activity',
    minTier: 'brewer',
    credits: CREDIT_COST['coach.analyze_fermentation'],
    implemented: true,
  },
  'coach.predict_fg': {
    label: 'Endvergärung vorhersagen',
    persona: 'BotlGuide Coach',
    icon: 'TrendingDown',
    minTier: 'brewer',
    credits: CREDIT_COST['coach.predict_fg'],
    implemented: true,
  },

  // ── Architect ──────────────────────────────────────────────────────────────
  'architect.optimize': {
    label: 'Rezept optimieren',
    persona: 'BotlGuide Architect',
    icon: 'Wrench',
    minTier: 'free',
    credits: CREDIT_COST['architect.optimize'],
    implemented: true,
  },
  'architect.suggest_hops': {
    label: 'Hopfen vorschlagen',
    persona: 'BotlGuide Architect',
    icon: 'Leaf',
    minTier: 'brewer',
    credits: CREDIT_COST['architect.suggest_hops'],
    implemented: true,
  },
  'architect.check_bjcp': {
    label: 'BJCP-Konformität prüfen',
    persona: 'BotlGuide Architect',
    icon: 'ShieldCheck',
    minTier: 'brewery',
    credits: CREDIT_COST['architect.check_bjcp'],
    implemented: true,
  },

  // ── Copywriter ─────────────────────────────────────────────────────────────
  'copywriter.name': {
    label: 'Namen generieren',
    persona: 'BotlGuide Copywriter',
    icon: 'Pen',
    minTier: 'free',
    credits: CREDIT_COST['copywriter.name'],
    implemented: true,
  },
  'copywriter.description': {
    label: 'Beschreibung schreiben',
    persona: 'BotlGuide Copywriter',
    icon: 'FileText',
    minTier: 'free',
    credits: CREDIT_COST['copywriter.description'],
    implemented: true,
  },
  'copywriter.label_prompt': {
    label: 'Etiketten-Prompt',
    persona: 'BotlGuide Copywriter',
    icon: 'Tag',
    minTier: 'free',
    credits: CREDIT_COST['copywriter.label_prompt'],
    implemented: true,
  },
  'copywriter.social': {
    label: 'Social-Media-Post',
    persona: 'BotlGuide Copywriter',
    icon: 'Share2',
    minTier: 'brewer',
    credits: CREDIT_COST['copywriter.social'],
    implemented: true,
  },

  // ── Sommelier ──────────────────────────────────────────────────────────────
  'sommelier.flavor_profile': {
    label: 'Geschmacksprofil',
    persona: 'BotlGuide Sommelier',
    icon: 'Radar',
    minTier: 'free',
    credits: CREDIT_COST['sommelier.flavor_profile'],
    implemented: true,
  },
  'sommelier.pairing': {
    label: 'Food Pairing',
    persona: 'BotlGuide Sommelier',
    icon: 'UtensilsCrossed',
    minTier: 'brewer',
    credits: CREDIT_COST['sommelier.pairing'],
    implemented: true,
  },

  // ── Artist ─────────────────────────────────────────────────────────────────
  'artist.generate_label': {
    label: 'Etikett generieren',
    persona: 'BotlGuide Artist',
    icon: 'Image',
    minTier: 'brewer',
    credits: CREDIT_COST['artist.generate_label'],
    implemented: true,
  },
  'artist.generate_cap': {
    label: 'Kronkorken generieren',
    persona: 'BotlGuide Artist',
    icon: 'Circle',
    minTier: 'brewer',
    credits: CREDIT_COST['artist.generate_cap'],
    implemented: true,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tier Order (for gate checks)
// ─────────────────────────────────────────────────────────────────────────────

const TIER_RANK: Record<CapabilityTier, number> = {
  free: 0,
  brewer: 1,
  brewery: 2,
  enterprise: 3,
};

/**
 * Returns true if `userTier` meets the minimum requirement for `capability`.
 */
export function canAccessCapability(
  capability: BotlGuideCapability,
  userTier: CapabilityTier,
): boolean {
  const meta = CAPABILITY_META[capability];
  if (!meta) return false;
  return TIER_RANK[userTier] >= TIER_RANK[meta.minTier];
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona Brand Display Strings
// ─────────────────────────────────────────────────────────────────────────────

/** Maps a BotlGuide persona to its short display label and colour class */
export const PERSONA_DISPLAY = {
  'BotlGuide Coach':      { short: 'Coach',      colour: 'text-emerald-400' },
  'BotlGuide Architect':  { short: 'Architect',  colour: 'text-blue-400'    },
  'BotlGuide Copywriter': { short: 'Copywriter', colour: 'text-amber-400'   },
  'BotlGuide Sommelier':  { short: 'Sommelier',  colour: 'text-rose-400'    },
  'BotlGuide Artist':     { short: 'Artist',     colour: 'text-purple-400'  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Backward-Compatibility Mapping
// Maps legacy `type` strings (used in /api/generate-text) to new capabilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Allows the old generate-text/route.ts `type` field to resolve to a
 * BotlGuideCapability. Used in the unified gateway for backward compat.
 */
export const LEGACY_TYPE_MAP: Record<string, BotlGuideCapability> = {
  guide:          'coach.guide',
  optimization:   'architect.optimize',
  name:           'copywriter.name',
  description:    'copywriter.description',
  label_prompt:   'copywriter.label_prompt',
  flavor_profile: 'sommelier.flavor_profile',
} as const;
