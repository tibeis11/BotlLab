'use server';

// ============================================================================
// Flavor Profile Generation — Dreistufiger Fallback (Phase 11.0)
//
// Stufe A: Daten-Vorschlag — Aggregation aus Brews gleichen Stils
// Stufe B: BotlGuide-Analyse — LLM analysiert Rezeptdaten
// Stufe C: Manuell (kein Server-Code nötig)
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import type { FlavorProfile, FlavorDimensionId } from '@/lib/flavor-profile-config';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type FlavorSuggestionSource = 'data_suggestion' | 'botlguide';

export type FlavorSuggestionResult = {
  success: true;
  profile: FlavorProfile;
  source: FlavorSuggestionSource;
  /** Human-readable explanation of how the profile was generated */
  explanation: string;
  /** Number of brews used for data_suggestion (null for botlguide) */
  sampleSize?: number;
};

export type FlavorSuggestionError = {
  success: false;
  error: string;
};

export type FlavorSuggestionResponse = FlavorSuggestionResult | FlavorSuggestionError;

// ────────────────────────────────────────────────────────────────────────────
// Recipe data type (matches BrewEditor's data JSONB)
// ────────────────────────────────────────────────────────────────────────────

export type RecipeDataForAnalysis = {
  brewType?: string;
  style?: string;
  name?: string;
  abv?: number;
  ibu?: number;
  og?: number;
  fg?: number;
  colorEBC?: number;
  malts?: string;
  hops?: string;
  yeast?: string;
  adjuncts?: string;
  dryHop?: string;
  mashTemp?: string;
  boilMinutes?: number;
  // For non-beer
  grapes?: string;
  apples?: string;
  honey?: string;
};

// ────────────────────────────────────────────────────────────────────────────
// Stufe A: Data Suggestion — Aggregate from existing brews of same style
// ────────────────────────────────────────────────────────────────────────────

const DIMS: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
const MIN_BREWS_FOR_SUGGESTION = 3;

export async function getStyleBasedSuggestion(
  style: string,
  excludeBrewId?: string,
): Promise<FlavorSuggestionResponse> {
  if (!style || style.trim() === '' || style.toLowerCase() === 'unbekannt') {
    return { success: false, error: 'Kein Bierstil angegeben.' };
  }

  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht eingeloggt.' };

  // Query public brews of same style that have a flavor_profile set
  const styleNormalized = style.trim().toLowerCase();

  let query = supabase
    .from('brews')
    .select('id, flavor_profile, style')
    .eq('is_public', true)
    .not('flavor_profile', 'is', null);

  if (excludeBrewId) {
    query = query.neq('id', excludeBrewId);
  }

  const { data: brews, error } = await query;

  if (error) {
    console.error('[flavor-profile] Style query error:', error);
    return { success: false, error: 'Datenbankfehler.' };
  }

  // Filter by normalized style (case-insensitive match)
  const matchingBrews = (brews ?? []).filter(
    (b: any) => b.style && b.style.trim().toLowerCase() === styleNormalized && isValidProfile(b.flavor_profile),
  );

  if (matchingBrews.length < MIN_BREWS_FOR_SUGGESTION) {
    return {
      success: false,
      error: `Zu wenig Daten: Nur ${matchingBrews.length} von ${MIN_BREWS_FOR_SUGGESTION} benötigten ${style}-Brews mit Geschmacksprofil gefunden.`,
    };
  }

  // Aggregate: Average each dimension
  const sums: Record<FlavorDimensionId, number> = { sweetness: 0, bitterness: 0, body: 0, roast: 0, fruitiness: 0 };
  let count = 0;

  for (const brew of matchingBrews) {
    const fp = brew.flavor_profile as Record<string, number>;
    let valid = true;
    for (const dim of DIMS) {
      if (typeof fp[dim] !== 'number') { valid = false; break; }
    }
    if (!valid) continue;

    for (const dim of DIMS) {
      sums[dim] += fp[dim];
    }
    count++;
  }

  if (count < MIN_BREWS_FOR_SUGGESTION) {
    return {
      success: false,
      error: `Zu wenig valide Profile (${count}/${MIN_BREWS_FOR_SUGGESTION}).`,
    };
  }

  const profile: FlavorProfile = {
    sweetness: round2(sums.sweetness / count),
    bitterness: round2(sums.bitterness / count),
    body: round2(sums.body / count),
    roast: round2(sums.roast / count),
    fruitiness: round2(sums.fruitiness / count),
    source: 'data_suggestion',
  };

  return {
    success: true,
    profile,
    source: 'data_suggestion',
    explanation: `Basierend auf ${count} ${style}-Brews in BotlLab.`,
    sampleSize: count,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Stufe B: BotlGuide Analysis — LLM generates profile from recipe data
// ────────────────────────────────────────────────────────────────────────────

export async function generateFlavorProfileFromRecipe(
  recipeData: RecipeDataForAnalysis,
): Promise<FlavorSuggestionResponse> {
  const supabase = await createClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht eingeloggt.' };

  // Validate: at least some recipe data present
  const hasData = recipeData.style || recipeData.malts || recipeData.hops ||
    recipeData.abv || recipeData.ibu || recipeData.yeast;

  if (!hasData) {
    return {
      success: false,
      error: 'Nicht genug Rezeptdaten vorhanden. Hinterlege mindestens Stil, Zutaten oder Kennwerte.',
    };
  }

  // Call the generate-text API with type "flavor_profile"
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/generate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the auth cookie so the API route can authenticate
        cookie: (await import('next/headers')).cookies().toString(),
      },
      body: JSON.stringify({
        type: 'flavor_profile',
        recipeData,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 402) {
        return { success: false, error: 'AI-Credit-Limit erreicht. Upgrade für mehr BotlGuide-Analysen.' };
      }
      return { success: false, error: err.error || 'BotlGuide-Analyse fehlgeschlagen.' };
    }

    const result = await response.json();

    if (!result.profile) {
      return { success: false, error: 'BotlGuide konnte kein Profil generieren.' };
    }

    // Validate and clamp values
    const profile: FlavorProfile = {
      sweetness: clamp01(result.profile.sweetness),
      bitterness: clamp01(result.profile.bitterness),
      body: clamp01(result.profile.body),
      roast: clamp01(result.profile.roast),
      fruitiness: clamp01(result.profile.fruitiness),
      source: 'botlguide',
    };

    return {
      success: true,
      profile,
      source: 'botlguide',
      explanation: result.explanation || 'BotlGuide hat dein Rezept analysiert.',
    };
  } catch (err: any) {
    console.error('[flavor-profile] BotlGuide API error:', err);
    return { success: false, error: 'BotlGuide-Analyse fehlgeschlagen.' };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Combined: Try Stufe A, fallback to Stufe B
// ────────────────────────────────────────────────────────────────────────────

export async function suggestFlavorProfile(
  style: string | null | undefined,
  recipeData: RecipeDataForAnalysis,
  excludeBrewId?: string,
): Promise<FlavorSuggestionResponse> {
  // Stufe A: Data suggestion
  if (style) {
    const dataSuggestion = await getStyleBasedSuggestion(style, excludeBrewId);
    if (dataSuggestion.success) return dataSuggestion;
  }

  // Stufe B: BotlGuide analysis
  const botlguideSuggestion = await generateFlavorProfileFromRecipe({
    ...recipeData,
    style: style || recipeData.style,
  });

  return botlguideSuggestion;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp01(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function isValidProfile(fp: unknown): fp is Record<string, number> {
  if (!fp || typeof fp !== 'object') return false;
  const p = fp as Record<string, unknown>;
  return DIMS.every((d) => typeof p[d] === 'number');
}
