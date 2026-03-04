/**
 * BotlGuide – Shared TypeScript Interfaces
 *
 * Single source of truth for all type definitions used across:
 * - app/api/botlguide/route.ts  (Unified Gateway)
 * - app/components/BotlGuideSheet.tsx
 * - lib/botlguide/BotlGuideContext.tsx
 * - any future BotlGuide UI components
 */

// ─────────────────────────────────────────────────────────────────────────────
// Capability Taxonomy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every distinct AI action BotlGuide can perform.
 * Naming: <persona>.<action>
 *
 * Personas:
 *  coach       → contextual brewing advice (Side-Coach Pattern)
 *  architect   → recipe structure & optimization
 *  copywriter  → text generation (names, descriptions, social)
 *  sommelier   → sensory analysis & pairing
 *  artist      → image generation (Imagen 4.0)
 */
export type BotlGuideCapability =
  // Coach ─────────────────────────────────────────────────────────────────────
  | 'coach.guide'                // contextual step explanation (existing)
  | 'coach.analyze_fermentation' // reads brew_measurements → concrete advice  (Stage 2)
  | 'coach.predict_fg'           // gravity-trend analysis → estimated FG + ABV (Stage 2)

  // Architect ──────────────────────────────────────────────────────────────────
  | 'architect.optimize'         // 3–5 improvement suggestions for a recipe (existing)
  | 'architect.suggest_hops'     // hop substitution / addition suggestions    (Stage 2)
  | 'architect.check_bjcp'       // BJCP style conformity check via RAG        (Stage 3)

  // Copywriter ─────────────────────────────────────────────────────────────────
  | 'copywriter.name'            // creative brew name (existing)
  | 'copywriter.description'     // sensory description (existing)
  | 'copywriter.label_prompt'    // Imagen prompt text (existing)
  | 'copywriter.social'          // Instagram/Facebook post text               (Stage 2)

  // Sommelier ──────────────────────────────────────────────────────────────────
  | 'sommelier.flavor_profile'   // 5-dimension taste model (existing)
  | 'sommelier.pairing'          // food pairing suggestions                   (Stage 2)

  // Artist ─────────────────────────────────────────────────────────────────────
  | 'artist.generate_label'      // label image via Imagen 4.0 (existing)
  | 'artist.generate_cap';       // cap image via Imagen 4.0   (existing)


// ─────────────────────────────────────────────────────────────────────────────
// Request / Response Shapes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The unified request body sent to POST /api/botlguide
 */
export interface BotlGuideRequest {
  /** Which AI action to perform */
  capability: BotlGuideCapability;

  /**
   * Session/brew context. Everything BotlGuide knows about the current state.
   * Typed loosely here – capability handlers cast to more specific types.
   */
  context?: BotlGuideSessionContext;

  /**
   * Capability-specific payload (recipe data, guide key, etc.)
   * Each handler defines what it expects in data.
   */
  data?: Record<string, unknown>;
}

/**
 * Context captured from the user's current session and page.
 * Injected by BotlGuideProvider and forwarded with every request.
 */
export interface BotlGuideSessionContext {
  // Recipe / brew basics
  brewType?: 'beer' | 'wine' | 'cider' | 'mead';
  brewStyle?: string;        // e.g. "American IPA", "Hefeweizen"
  recipeName?: string;
  targetOG?: number;
  targetFG?: number;
  abv?: number;
  ibu?: number;
  colorEBC?: number;

  // Mash
  mashTempC?: number;
  mashDurationMin?: number;

  // Ingredients
  malts?: string;
  hops?: string;
  yeast?: string;
  adjuncts?: string;
  dryHop?: string | number;
  grapes?: string;
  apples?: string;
  honey?: string;

  // Active session
  sessionId?: string;
  currentGravity?: number;    // latest SG reading
  fermentationTempC?: number;

  // Misc
  boilMinutes?: number;
  batchLiters?: number;

  /** Raw JSON blob for capabilities that need full context */
  raw?: Record<string, unknown>;
}

/**
 * Standardised success response from POST /api/botlguide
 */
export interface BotlGuideResponse {
  /** Echo of the requested capability */
  capability: BotlGuideCapability;

  /** Primary text output (markdown supported) */
  text?: string;

  /** Structured data output for machine-readable capabilities */
  data?: Record<string, unknown>;

  /** Credits used by this request */
  creditsUsed: number;

  /** Credits remaining for the user this month after this request */
  creditsRemaining: number;
}

/**
 * Error response from POST /api/botlguide
 */
export interface BotlGuideErrorResponse {
  error: string;
  reason?: string;
  /** Present when the user hit their limit */
  upgrade_required?: boolean;
  /** If true, the request was not charged any credits */
  creditsUsed: 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Extension
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extended BotlGuideContext type – includes capability selection for
 * multi-modal sheets (Stage 1+).
 */
export interface BotlGuideContextExtended {
  isOpen: boolean;
  currentKey: string | null;
  activeCapability: BotlGuideCapability | null;
  openGuide: (key: string, capability?: BotlGuideCapability) => void;
  closeGuide: () => void;
  sessionContext?: BotlGuideSessionContext;
  userTier?: 'free' | 'brewer' | 'brewery' | 'enterprise';
}
