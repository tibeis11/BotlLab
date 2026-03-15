/**
 * BotlGuide Unified Gateway
 * POST /api/botlguide
 *
 * Single entry-point for all BotlGuide text-based capabilities.
 * Artist capabilities (image generation) are handled by /api/generate-image
 * and will be migrated here in Stage 1.
 *
 * Request body:
 *   { capability: BotlGuideCapability, context?: BotlGuideSessionContext, data?: Record<string, unknown> }
 *   OR legacy format: { type: string, context?, details?, recipeData?, ... }
 *
 * Response: BotlGuideResponse | BotlGuideErrorResponse
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, createAdminClient } from '@/lib/supabase-server';
import { canUseAI, getUserPremiumStatus, trackAIUsage } from '@/lib/premium-checks';
import { trackEvent } from '@/lib/actions/analytics-actions';
import { mergeRecipeIngredientsIntoData } from '@/lib/ingredients/ingredient-adapter';
import {
  CAPABILITY_META,
  CREDIT_COST,
  LEGACY_TYPE_MAP,
  canAccessCapability,
  type CapabilityTier,
} from '@/lib/botlguide/constants';
import type {
  BotlGuideCapability,
  BotlGuideRequest,
  BotlGuideResponse,
  BotlGuideSessionContext,
} from '@/lib/botlguide/types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// ══ RAG Helpers ══════════════════════════════════════════════════════════════

const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

async function generateRecipeEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: 768,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.embedding?.values as number[]) ?? null;
  } catch {
    return null;
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function fetchBjcpRagContext(
  supabaseClient: SupabaseClient,
  recipeText: string,
  matchCount = 3,
): Promise<string> {
  const embedding = await generateRecipeEmbedding(recipeText);
  if (!embedding) return '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc('search_botlguide_embeddings', {
    p_query_embedding: `[${embedding.join(',')}]`,
    p_source_type: 'bjcp_style',
    p_match_count: matchCount,
    p_min_similarity: 0.4,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (error || !Array.isArray(data) || !(data as any[]).length) return '';

  type RagRow = { content: string; similarity: number; metadata: Record<string, unknown> };
  return `\n\n== BJCP Referenzstile (semantisch ähnlich zum Rezept) ==\n${(data as RagRow[])
    .map((r, i) => `${i + 1}. ${r.content} (Ähnlichkeit: ${(r.similarity * 100).toFixed(0)}%)`)
    .join('\n\n')}`;
}

function buildRecipeQueryText(ctx: BotlGuideSessionContext, data: Record<string, unknown>): string {
  const parts: string[] = [
    ctx.brewStyle ? `Stil: ${ctx.brewStyle}` : '',
    ctx.brewType  ? `Typ: ${ctx.brewType}` : '',
    ctx.targetOG  ? `OG: ${ctx.targetOG}` : '',
    ctx.ibu       ? `IBU: ${ctx.ibu}` : '',
    ctx.colorEBC  ? `EBC: ${ctx.colorEBC}` : '',
    data.abv      ? `ABV: ${data.abv}%` : '',
    data.og       ? `OG: ${data.og}` : '',
    data.ibu      ? `IBU: ${data.ibu}` : '',
    data.malts    ? `Malze: ${data.malts}` : '',
    data.hops     ? `Hopfen: ${data.hops}` : '',
  ].filter(Boolean);
  return parts.join('. ') || ctx.brewStyle || 'Unbekanntes Rezept';
}

// ── Team Knowledge RAG Helper ───────────────────────────────────────────────

async function fetchTeamRagContext(
  supabaseClient: SupabaseClient,
  queryText: string,
  breweryId: string,
  matchCount = 3,
): Promise<string> {
  const embedding = await generateRecipeEmbedding(queryText);
  if (!embedding) return '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc('search_team_knowledge', {
    p_query_embedding: `[${embedding.join(',')}]`,
    p_brewery_id: breweryId,
    p_match_count: matchCount,
    p_min_similarity: 0.45,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (error || !Array.isArray(data) || !(data as any[]).length) return '';

  type TeamRagRow = { content: string; similarity: number; filename: string; metadata: Record<string, unknown> };
  return `\n\n== Internes Brauerei-Wissen (SOPs/Handbücher) ==\n${(data as TeamRagRow[])
    .map((r, i) => `${i + 1}. [${r.filename}] ${r.content} (Relevanz: ${(r.similarity * 100).toFixed(0)}%)`)
    .join('\n\n')}`;
}

// ── Audit Logging Helper ────────────────────────────────────────────────────

interface AuditLogEntry {
  userId: string;
  breweryId: string | null;
  capability: string;
  creditsUsed: number;
  responseTimeMs: number;
  ragSourcesUsed: string[] | null;
  status: 'success' | 'error' | 'rate_limited';
  inputSummary?: string;
  outputSummary?: string;
  errorMessage?: string;
}

async function logBotlGuideAudit(
  _supabaseClient: SupabaseClient,
  entry: AuditLogEntry,
) {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('botlguide_audit_log').insert({
      user_id: entry.userId,
      brewery_id: entry.breweryId,
      capability: entry.capability,
      credits_used: entry.creditsUsed,
      response_time_ms: entry.responseTimeMs,
      rag_sources_used: entry.ragSourcesUsed,
      status: entry.status,
      input_summary: entry.inputSummary?.slice(0, 200),
      output_summary: entry.outputSummary?.slice(0, 200),
      error_message: entry.errorMessage?.slice(0, 500),
    });
  } catch {
    // Audit logging is non-critical — never block the response
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', creditsUsed: 0 }, { status: 401 });
  }

  // ── Parse Body ────────────────────────────────────────────────────────────
  let body: BotlGuideRequest & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', creditsUsed: 0 }, { status: 400 });
  }

  // Resolve capability: prefer new `capability` field, fall back to legacy `type`
  let capability: BotlGuideCapability | undefined = body.capability;
  if (!capability && body.type) {
    capability = LEGACY_TYPE_MAP[body.type as string];
  }

  if (!capability) {
    return NextResponse.json(
      { error: 'Missing required field: capability (or legacy: type)', creditsUsed: 0 },
      { status: 400 },
    );
  }

  // ── Tier Gate ─────────────────────────────────────────────────────────────
  const premiumStatus = await getUserPremiumStatus(user.id);
  const userTier = (premiumStatus?.tier ?? 'free') as CapabilityTier;
  const meta = CAPABILITY_META[capability];

  // ── Experience level (for prompt-depth adaptation) ─────────────────────────────
  let experience = mapExperienceTier('hobby'); // safe default
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileTierData } = await (supabase as any)
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();
    if (profileTierData?.tier) {
      experience = mapExperienceTier(profileTierData.tier as string);
    }
  } catch { /* non-critical */ }

  // ── Brewery ID (equipment profile + flavor DNA) ──────────────────────────
  // Prefer client-sent id; fall back to first membership in DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resolvedBreweryId: string | null = (body as any).breweryId ?? null;
  if (!resolvedBreweryId) {
    try {
      const { data: member } = await supabase
        .from('brewery_members')
        .select('brewery_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      resolvedBreweryId = member?.brewery_id ?? null;
    } catch { /* non-critical */ }
  }

  if (!meta) {
    return NextResponse.json({ error: `Unknown capability: ${capability}`, creditsUsed: 0 }, { status: 400 });
  }

  if (!meta.implemented) {
    return NextResponse.json(
      { error: `${meta.label} ist noch in Entwicklung (Stage 2+).`, creditsUsed: 0 },
      { status: 501 },
    );
  }

  if (!canAccessCapability(capability, userTier)) {
    return NextResponse.json(
      {
        error: `${meta.persona} – ${meta.label} benötigt mindestens den ${meta.minTier}-Plan.`,
        upgrade_required: true,
        creditsUsed: 0,
      },
      { status: 403 },
    );
  }

  // ── Artist capabilities: delegate to generate-image ───────────────────────
  if (capability === 'artist.generate_label' || capability === 'artist.generate_cap') {
    return NextResponse.json(
      {
        error: 'Artist capabilities werden über /api/generate-image bereitgestellt (Stage 1 Migration ausstehend).',
        creditsUsed: 0,
      },
      { status: 307 },
    );
  }

  // ── Credit Check (atomic – prevents race conditions via DB RPC) ───────────
  const aiCheck = await canUseAI(user.id);
  if (!aiCheck.allowed) {
    return NextResponse.json(
      { error: 'AI-Limit erreicht', reason: aiCheck.reason, upgrade_required: true, creditsUsed: 0 },
      { status: 402 },
    );
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY fehlt', creditsUsed: 0 }, { status: 500 });
  }

  // ── Resolve context (new format OR legacy fields) ─────────────────────────
  const context: BotlGuideSessionContext = body.context ?? {
    brewStyle:  body.style as string | undefined,
    brewType:   body.brewType as BotlGuideSessionContext['brewType'],
    recipeName: body.name as string | undefined,
  };

  const data: Record<string, unknown> = body.data ?? (body.recipeData ?? {}) as Record<string, unknown>;
  // legacyDetails: support both top-level `details` (old routes) and `data.details` (new hook)
  const legacyDetails = (body.details ?? (data as Record<string, unknown>)?.details) as string | undefined;

  // ── Build Prompt (+ optional RAG context) ────────────────────────────────
  let ragContext = '';
  const needsRag =
    capability === 'architect.check_bjcp' ||
    (capability === 'architect.optimize' &&
      (userTier === 'brewery' || userTier === 'enterprise'));

  if (needsRag) {
    try {
      const queryText = buildRecipeQueryText(context, data);
      ragContext = await fetchBjcpRagContext(supabase, queryText);
    } catch {
      // RAG failure is non-fatal — continue without context
    }
  }

  // ── Full brew context (history + equipment + flavor DNA) ──────────────────
  // Fetched for all architect.*, sommelier.*, coach.analyze_fermentation, coach.predict_fg
  let brewHistoryContext  = '';
  let equipmentContext   = '';
  let flavorDnaContext   = '';
  let inspirationContext = '';
  let sessionContext     = '';
  let feedbackContext    = '';
  let brandVoiceContext  = '';
  let teamRagContext     = '';
  const ragSourcesUsed: string[] = [];
  const needsFullContext =
    capability.startsWith('architect.') ||
    capability.startsWith('sommelier.')  ||
    capability.startsWith('copywriter.') ||
    capability === 'coach.analyze_fermentation' ||
    capability === 'coach.predict_fg';

  if (needsFullContext) {
    try {
      const sessionId = (context.sessionId ?? (data.sessionId as string | undefined)) ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: brewCtx } = await (supabase as any).rpc('get_user_brew_context', {
        p_user_id:    user.id,
        p_session_id: sessionId,
        p_brewery_id: resolvedBreweryId,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentBrews: any[] = brewCtx?.recentBrews ?? [];
      for (let i = 0; i < recentBrews.length; i++) {
        recentBrews[i] = await mergeRecipeIngredientsIntoData(recentBrews[i], recentBrews[i].id, supabase);
      }
      // Experience tier from RPC avoids an extra round-trip (overrides the profile select above)
      if (brewCtx?.experienceTier) {
        experience = mapExperienceTier(brewCtx.experienceTier as string);
      }
      if (recentBrews.length > 0) {
        const lines = recentBrews.map((b: any, i: number) => {
          const parts = [
            `${i + 1}. ${b.name || 'Unbenannt'} (${b.style || 'Unbekannt'}, ${b.brewType || 'Bier'})`,
            b.og   ? `OG: ${b.og}`   : '',
            b.fg   ? `→ FG: ${b.fg}` : '',
            b.abv  ? `ABV: ${b.abv}%` : '',
            b.ibu  ? `IBU: ${b.ibu}` : '',
            // Stage 5: Recipe DNA from brews.data JSONB
            formatIngredient(b.malts)  ? `Malze: ${formatIngredient(b.malts)}`  : '',
            formatIngredient(b.hops)   ? `Hopfen: ${formatIngredient(b.hops)}`  : '',
            formatIngredient(b.yeast)  ? `Hefe: ${formatIngredient(b.yeast)}`   : '',
            // Stage 5: Community rating signal
            b.avgRating && Number(b.ratingCount) >= 1
              ? `⭐ ${Number(b.avgRating).toFixed(1)}${Number(b.ratingCount) >= 2 ? ` (${b.ratingCount} Bew.)` : ''}`
              : '',
          ].filter(Boolean);
          return '  ' + parts.join(' | ');
        });
        brewHistoryContext = `\nHistorischer Kontext – letzte ${recentBrews.length} Sude des Brauers:\n${lines.join('\n')}`;
      }
      // Stage 5: Top-rated brew summary (best community-validated recipe)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (brewCtx?.topRatedBrew) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const top = brewCtx.topRatedBrew as any;
        const specs = [
          top.og  ? `OG: ${top.og}`   : '',
          top.ibu ? `IBU: ${top.ibu}` : '',
        ].filter(Boolean).join(' | ');
        brewHistoryContext +=
          `\nBest-bewertetes Rezept: ${top.name || 'Unbenannt'} – ${top.style || 'Unbekannt'}` +
          ` ⭐ ${Number(top.avgRating).toFixed(1)} (${top.ratingCount} Bewertungen)` +
          (specs ? ` → ${specs}` : '');
      }
      // Stage 5: Equipment profile + Flavor DNA
      if (brewCtx?.equipmentProfile) {
        equipmentContext = buildEquipmentContext(brewCtx.equipmentProfile as Record<string, unknown>);
      }
      if (brewCtx?.flavorDna) {
        flavorDnaContext = buildFlavorDnaContext(brewCtx.flavorDna as Record<string, unknown>);
      }
      if (brewCtx?.inspirationSignal) {
        inspirationContext = buildInspirationContext(brewCtx.inspirationSignal as Record<string, unknown>);
      }
      if (brewCtx?.sessionContext) {
        sessionContext = buildSessionContext(brewCtx.sessionContext as Record<string, unknown>);
      }
      if (brewCtx?.feedbackProfile) {
        feedbackContext = buildFeedbackContext(
          brewCtx.feedbackProfile as Record<string, unknown>,
          capability,
        );
      }
      if (brewCtx?.equipmentProfile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const desc = (brewCtx.equipmentProfile as any)?.description;
        if (desc) brandVoiceContext = buildBrandVoiceContext(desc as string);
      }
    } catch {
      // Context enrichment is non-fatal — continue without it
    }
  }

  // ── Custom Brand Voice from brewery_settings (Enterprise override) ────────
  if (resolvedBreweryId && (userTier === 'brewery' || userTier === 'enterprise')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bSettings } = await (supabase as any)
        .from('brewery_settings')
        .select('botlguide_voice_config')
        .eq('brewery_id', resolvedBreweryId)
        .maybeSingle();
      if (bSettings?.botlguide_voice_config) {
        const vc = bSettings.botlguide_voice_config as Record<string, string>;
        const customVoice = [vc.tone, vc.style, vc.custom_instructions].filter(Boolean).join('. ');
        if (customVoice) brandVoiceContext = buildBrandVoiceContext(customVoice);
      }
    } catch { /* non-critical */ }
  }

  // ── Team Knowledge RAG (Enterprise only) ──────────────────────────────────
  if (userTier === 'enterprise' && resolvedBreweryId && needsFullContext) {
    try {
      const queryText = buildRecipeQueryText(context, data)
        + (legacyDetails ? ` ${legacyDetails}` : '');
      teamRagContext = await fetchTeamRagContext(supabase, queryText, resolvedBreweryId);
      if (teamRagContext) ragSourcesUsed.push('team_knowledge');
    } catch { /* non-fatal */ }
  }
  if (ragContext) ragSourcesUsed.push('bjcp_styles');

  let prompt: string;
  try {
    prompt = buildPrompt(capability, context, data, legacyDetails, ragContext, brewHistoryContext, experience, equipmentContext, flavorDnaContext, inspirationContext, sessionContext, feedbackContext, brandVoiceContext, teamRagContext);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Prompt-Fehler', creditsUsed: 0 },
      { status: 400 },
    );
  }

  // ── Call Gemini ───────────────────────────────────────────────────────────
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // ── Parse structured responses ─────────────────────────────────────────
    let responseText: string | undefined;
    let responseData: Record<string, unknown> | undefined;

    if (capability === 'architect.optimize') {
      const json = extractJson(rawText, 'array');
      if (!Array.isArray(json)) throw new Error('Ungültiges Optimierungs-Format');
      responseData = { suggestions: json };
    } else if (capability === 'sommelier.flavor_profile') {
      const json = extractJson(rawText, 'object') as Record<string, unknown>;
      if (!json?.profile) throw new Error('Ungültiges Geschmacksprofil-Format');
      responseData = json;
    } else if (capability === 'sommelier.pairing') {
      const json = extractJson(rawText, 'object') as Record<string, unknown>;
      if (!json?.pairings) throw new Error('Ungültiges Pairing-Format');
      responseData = json;
    } else if (capability === 'copywriter.social') {
      const json = extractJson(rawText, 'object') as Record<string, unknown>;
      if (!json?.instagram && !json?.facebook) throw new Error('Ungültiges Social-Format');
      responseData = json;
    } else if (capability === 'architect.check_bjcp') {
      const json = extractJson(rawText, 'object') as Record<string, unknown>;
      if (!json?.conformityScore && json?.conformityScore !== 0) throw new Error('Ungültiges BJCP-Prüf-Format');
      responseData = json;
    } else if (capability === 'coach.analyze_fermentation' || capability === 'coach.predict_fg') {
      // Full markdown text — preserve formatting (lists, bold, etc.)
      responseText = rawText;
    } else {
      // All text-only capabilities — strip markdown decoration for name/description/label_prompt
      responseText =
        capability === 'coach.guide'
          ? rawText
          : rawText.replace(/^["']|["']$/g, '').replace(/^\*\*|\*\*$/g, '').replace(/^#+\s*/g, '').trim();
    }

    // ── Analytics & Billing ───────────────────────────────────────────────
    await trackEvent({
      event_type: 'botlguide_generation_success',
      category: 'ai',
      payload: {
        capability,
        persona: meta.persona,
        credits: CREDIT_COST[capability],
        user_id: user.id,
        duration_ms: Date.now() - startTime,
      },
      response_time_ms: Date.now() - startTime,
    });
    await trackAIUsage(user.id, 'text');

    // Fetch remaining credits for response
    const updatedStatus = await getUserPremiumStatus(user.id);
    const remaining = updatedStatus?.features.aiGenerationsRemaining ?? 0;

    // ── Audit Log (non-blocking) ────────────────────────────────────────
    logBotlGuideAudit(supabase, {
      userId: user.id,
      breweryId: resolvedBreweryId,
      capability,
      creditsUsed: CREDIT_COST[capability],
      responseTimeMs: Date.now() - startTime,
      ragSourcesUsed: ragSourcesUsed.length > 0 ? ragSourcesUsed : null,
      status: 'success',
      inputSummary: prompt.slice(0, 200),
      outputSummary: rawText.slice(0, 200),
    }).catch(() => {});

    const response: BotlGuideResponse = {
      capability,
      text: responseText,
      data: responseData,
      creditsUsed: CREDIT_COST[capability],
      creditsRemaining: remaining,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Generierung fehlgeschlagen';
    console.error(`[BotlGuide] ${capability} error:`, error);

    await trackEvent({
      event_type: 'botlguide_generation_error',
      category: 'ai',
      payload: { capability, error: message, user_id: user.id },
    }).catch(() => {});

    // Audit log error
    logBotlGuideAudit(supabase, {
      userId: user.id,
      breweryId: resolvedBreweryId,
      capability,
      creditsUsed: 0,
      responseTimeMs: Date.now() - startTime,
      ragSourcesUsed: null,
      status: 'error',
      errorMessage: message,
    }).catch(() => {});

    return NextResponse.json({ error: message, creditsUsed: 0 }, { status: 500 });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Prompt Builders
// Each implemented capability has its own function. Stage 1 will move these
// to lib/botlguide/prompts/ as the library grows.
// ═════════════════════════════════════════════════════════════════════════════

function buildPrompt(
  capability: BotlGuideCapability,
  ctx: BotlGuideSessionContext,
  data: Record<string, unknown>,
  legacyDetails?: string,
  ragContext?: string,
  brewHistoryContext?: string,
  experience?: { label: string; hint: string },
  equipmentContext?: string,
  flavorDnaContext?: string,
  inspirationContext?: string,
  sessionContext?: string,
  feedbackContext?: string,
  brandVoiceContext?: string,
  teamRagContext?: string,
): string {
  const p = [
    experience ? `[Erfahrungslevel des Brauers: ${experience.label} — ${experience.hint}]` : '',
    feedbackContext ? feedbackContext.trim() : '',
    teamRagContext ? teamRagContext.trim() : '',
  ].filter(Boolean).join('\n') + (experience || feedbackContext || teamRagContext ? '\n\n' : '');
  switch (capability) {
    case 'coach.guide':
      return p + buildCoachGuidePrompt(ctx, legacyDetails);
    case 'coach.analyze_fermentation':
      return p + buildCoachAnalyzeFermentationPrompt(ctx, data, brewHistoryContext, flavorDnaContext, sessionContext);
    case 'coach.predict_fg':
      return p + buildCoachPredictFGPrompt(ctx, data, brewHistoryContext, sessionContext);
    case 'architect.optimize':
      return p + buildArchitectOptimizePrompt(ctx, data, ragContext, equipmentContext, flavorDnaContext, inspirationContext);
    case 'copywriter.name':
      return p + buildCopywriterNamePrompt(ctx, data, brandVoiceContext);
    case 'copywriter.description':
      return p + buildCopywriterDescriptionPrompt(ctx, data, brandVoiceContext);
    case 'copywriter.label_prompt':
      return p + buildCopywriterLabelPromptPrompt(ctx, data, brandVoiceContext);
    case 'sommelier.flavor_profile':
      return p + buildSommelierFlavorProfilePrompt(ctx, data, flavorDnaContext, inspirationContext);
    case 'sommelier.pairing':
      return p + buildSommelierPairingPrompt(ctx, data);
    case 'architect.suggest_hops':
      return p + buildArchitectSuggestHopsPrompt(ctx, data, brewHistoryContext, equipmentContext, inspirationContext);
    case 'architect.check_bjcp':
      return p + buildArchitectCheckBjcpPrompt(ctx, data, ragContext ?? '', equipmentContext);
    case 'copywriter.social':
      return p + buildCopywriterSocialPrompt(ctx, data, brandVoiceContext);
    default:
      throw new Error(`Kein Prompt-Builder für ${capability}`);
  }
}

// ── Coach.AnalyzeFermentation ─────────────────────────────────────────────────

function buildCoachAnalyzeFermentationPrompt(
  ctx: BotlGuideSessionContext,
  data: Record<string, unknown>,
  brewHistoryContext?: string,
  flavorDnaContext?: string,
  sessionContext?: string,
): string {
  type Measurement = { gravity?: number | null; temperature?: number | null; measured_at?: string; note?: string | null };
  const rawMeasurements = (data.measurements ?? []) as Measurement[];
  const sorted = [...rawMeasurements].sort(
    (a, b) => new Date(a.measured_at ?? 0).getTime() - new Date(b.measured_at ?? 0).getTime(),
  );

  const measurementLines = sorted
    .map((m, i) => {
      const date = m.measured_at
        ? new Date(m.measured_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : `Messwert ${i + 1}`;
      const grav =
        m.gravity != null
          ? m.gravity > 2
            ? `${m.gravity.toFixed(1)}°P / SG ${(1 + m.gravity / (258.6 - 0.4 * m.gravity)).toFixed(3)}`
            : `SG ${m.gravity.toFixed(3)}`
          : 'N/A';
      const temp = m.temperature != null ? ` | ${m.temperature}°C` : '';
      const note = m.note ? ` | Notiz: ${m.note}` : '';
      return `  ${i + 1}. [${date}] ${grav}${temp}${note}`;
    })
    .join('\n');

  const og = data.ogSG as number | undefined;
  const abv = data.currentABV as number | undefined;
  const last = sorted[sorted.length - 1];
  const secondLast = sorted[sorted.length - 2];

  let stuckWarning = '';
  if (last && secondLast && last.gravity != null && secondLast.gravity != null) {
    const sgDiff = Math.abs(last.gravity - secondLast.gravity);
    const hoursDiff =
      (new Date(last.measured_at ?? 0).getTime() - new Date(secondLast.measured_at ?? 0).getTime()) / 3600000;
    if (sgDiff < 0.002 && hoursDiff >= 24) {
      stuckWarning = `\n⚠️ HINWEIS: Die letzten zwei Messungen zeigen kaum Veränderung (ΔISG ${sgDiff.toFixed(4)} in ${hoursDiff.toFixed(0)}h). Möglicherweise stockende Gärung.`;
    }
  }

  return `Du bist BotlGuide Coach, ein erfahrener Braumeister (Weihenstephan-Diplom). Analysiere diesen Gärverlauf und gib dem Brauer eine klare Einschätzung.

Rezept-Kontext:
- Bierstil: ${ctx.brewStyle ?? 'Unbekannt'}
- Brautyp: ${ctx.brewType ?? 'Bier'}
- Hefe: ${ctx.yeast ?? 'Unbekannt'}
- Ziel-OG: ${ctx.targetOG ?? (og ? og.toFixed(3) : 'N/A')}
- Ziel-FG: ${ctx.targetFG ?? 'N/A'}
${abv ? `- Aktuell geschätzter ABV: ${abv.toFixed(1)}%` : ''}
${stuckWarning}
${brewHistoryContext ?? ''}
${flavorDnaContext ? `\nGeschmacks-DNA dieser Brauerei (für Einschätzung):\n${flavorDnaContext}` : ''}
${sessionContext ? `\nSessions-Prozess-Kontext:\n${sessionContext}` : ''}
Messprotokoll (${sorted.length} Messungen, chronologisch):
${measurementLines || '  Keine Messwerte vorhanden'}

Aufgabe — Analysiere in diesen 3 Punkten (Deutsch, Markdown, max. 250 Wörter):
1. **Status** — Wo steht die Gärung gerade? Aktiv, nachlassend, beendet oder stockend?
2. **Beobachtungen** — Auffälligkeiten: Temperaturabweichungen, unerwartete Dichtesprünge, Anomalien
3. **Handlungsempfehlung** — Was soll der Brauer jetzt konkret tun?

Tone: Professionell, lehrreich, direkt. Keine Einleitung, direkt in die Analyse.

Analyse:`;
}

// ── Coach.PredictFG ───────────────────────────────────────────────────────────

function buildCoachPredictFGPrompt(
  ctx: BotlGuideSessionContext,
  data: Record<string, unknown>,
  brewHistoryContext?: string,
  sessionContext?: string,
): string {
  type Measurement = { gravity?: number | null; measured_at?: string };
  const rawMeasurements = (data.measurements ?? []) as Measurement[];
  const sorted = [...rawMeasurements]
    .filter(m => m.gravity != null)
    .sort((a, b) => new Date(a.measured_at ?? 0).getTime() - new Date(b.measured_at ?? 0).getTime());

  const og = data.ogSG as number | undefined;
  const measurementLines = sorted
    .map((m, i) => {
      const date = m.measured_at
        ? new Date(m.measured_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : `Messwert ${i + 1}`;
      const sgNorm = m.gravity! > 2 ? (1 + m.gravity! / (258.6 - 0.4 * m.gravity!)) : m.gravity!;
      return `  ${i + 1}. [${date}] SG ${sgNorm.toFixed(3)}`;
    })
    .join('\n');

  return `Du bist BotlGuide Coach. Prognostiziere die Endvergärung (FG) und den finalen Alkoholgehalt.

Rezept-Kontext:
- Bierstil: ${ctx.brewStyle ?? 'Unbekannt'}
- Hefe: ${ctx.yeast ?? 'Unbekannt'}
- OG (gemessen oder Ziel): ${og ? og.toFixed(3) : (ctx.targetOG ?? 'Unbekannt')}
- Ziel-FG: ${ctx.targetFG ?? 'N/A'}
${brewHistoryContext ?? ''}
${sessionContext ? `Sessions-Kontext:\n${sessionContext}` : ''}
Messverlauf (${sorted.length} Messungen):
${measurementLines || '  Keine Messwerte vorhanden'}

Aufgabe (Deutsch, Markdown, max. 150 Wörter):
1. **Prognostizierte FG** — Gib einen realistischen FG-Bereich an (als SG, z.B. 1.010–1.014) basierend auf dem Trend und dem Bierstil.
2. **Geschätzter ABV** — Berechne den voraussichtlichen Alkoholgehalt.
3. **Zeitschätzung** — Wann wird die Gärung voraussichtlich beendet sein (Tage)?
4. **Konfidenz** — Wie sicher ist die Prognose (hoch/mittel/niedrig) und warum?

Direkte Antwort ohne Einleitung.

Prognose:`;
}

// ── Coach.Guide ───────────────────────────────────────────────────────────────

function buildCoachGuidePrompt(ctx: BotlGuideSessionContext, guideKey?: string): string {
  const topic = guideKey?.split('.').slice(1).join('.') ?? guideKey ?? 'Brauprozess';
  return `Du bist ein erfahrener Braumeister (Weihenstephan-Diplom) und begleitest einen Heimbrauer live.

Kontext:
- Thema: ${guideKey ?? topic}
- Bierstil: ${ctx.brewStyle ?? 'Unbekannter Stil'}
- Ziel-OG: ${ctx.targetOG ?? 'N/A'}
${ctx.currentGravity ? `- Aktuelle Dichte: ${ctx.currentGravity}` : ''}
${ctx.mashTempC ? `- Maischtemperatur: ${ctx.mashTempC}°C` : ''}
${ctx.yeast ? `- Hefe: ${ctx.yeast}` : ''}

Aufgabe:
Erkläre kurz und prägnant (max. 60 Wörter) auf Deutsch, warum dieser Schritt für GENAU DIESEN Bierstil wichtig ist oder was physikalisch/biologisch gerade passiert.
Gehe konkret auf die Werte ein.

Tone of Voice: Professionell, lehrreich, auf Augenhöhe ("Du"). Kein "Hallo", direkt zur Sache. Markdown für Fettung erlaubt.

Antwort:`;
}

// ── Architect.Optimize ────────────────────────────────────────────────────────

function buildArchitectOptimizePrompt(
  ctx: BotlGuideSessionContext,
  data: Record<string, unknown>,
  ragContext?: string,
  equipmentContext?: string,
  flavorDnaContext?: string,
  inspirationContext?: string,
): string {
  const brewTypeGerman = brewTypeToGerman((data.brewType ?? ctx.brewType) as string);
  const ragSection  = ragContext        ? `\n${ragContext}\n` : '';
  const eqSection   = equipmentContext  ? `\nAnlagenparameter:\n${equipmentContext}\n` : '';
  const dnaSection  = flavorDnaContext  ? `\nGeschmacks-DNA der Brauerei (Einbeziehen für stil-passende Optimierungen):\n${flavorDnaContext}\n` : '';
  const inspSection = inspirationContext ? `\nInspirationsreferenz (gelikte Fremd-Rezepte des Brauers):\n${inspirationContext}\n` : '';
  return `Du bist ein erfahrener Braumeister/Sommelier. Analysiere dieses ${brewTypeGerman}-Rezept und gib konkrete Verbesserungsvorschläge:${ragSection}${eqSection}${dnaSection}${inspSection}

Rezept-Details:
- Name: ${(data.name ?? ctx.recipeName) ?? 'Nicht angegeben'}
- Stil: ${(data.style ?? ctx.brewStyle) ?? 'Nicht angegeben'}
- Typ: ${brewTypeGerman}
${ctx.abv ?? data.abv ? `- ABV: ${(data.abv ?? ctx.abv)}%` : ''}
${ctx.ibu ?? data.ibu ? `- IBU: ${data.ibu ?? ctx.ibu}` : ''}
${ctx.colorEBC ?? data.srm ? `- SRM/EBC: ${data.srm ?? ctx.colorEBC}` : ''}
${ctx.targetOG ?? data.og ? `- OG: ${data.og ?? ctx.targetOG}` : ''}
${ctx.targetFG ?? data.fg ? `- FG: ${data.fg ?? ctx.targetFG}` : ''}
${ctx.malts ?? data.malts ? `- Malze: ${data.malts ?? ctx.malts}` : ''}
${ctx.hops ?? data.hops ? `- Hopfen: ${data.hops ?? ctx.hops}` : ''}
${ctx.yeast ?? data.yeast ? `- Hefe: ${data.yeast ?? ctx.yeast}` : ''}
${ctx.dryHop ?? data.dryHop ? `- Dry Hop: ${data.dryHop ?? ctx.dryHop}g` : ''}
${ctx.boilMinutes ?? data.boilMinutes ? `- Kochzeit: ${data.boilMinutes ?? ctx.boilMinutes} min` : ''}
${ctx.mashTempC ?? data.mashTemp ? `- Maischetemperatur: ${data.mashTemp ?? ctx.mashTempC}°C` : ''}
${data.mashProcess ? `- Maischverfahren: ${data.mashProcess === 'decoction' ? 'Dekoktion' : data.mashProcess === 'step_mash' ? 'Stufeninfusion' : 'Infusion'}` : ''}
${data.mashSchedule ? `- Maischplan: ${data.mashSchedule}` : ''}

Anforderungen:
- 3–5 konkrete, umsetzbare Verbesserungsvorschläge auf Deutsch
- Fokus: Stil-Konformität, Balance, Harmon, Prozess
- Formatiere als JSON-Array von Strings: ["Vorschlag 1", "Vorschlag 2"]
WICHTIG: Antworte NUR mit dem JSON-Array.`;
}

// ── Copywriter.Name ───────────────────────────────────────────────────────────

function buildCopywriterNamePrompt(ctx: BotlGuideSessionContext, data: Record<string, unknown>, brandVoiceContext?: string): string {
  const brewType = (data.brewType ?? ctx.brewType ?? 'craft beverage') as string;
  const details  = (data.details ?? data.context ?? ctx.brewStyle ?? 'craft') as string;
  const voiceSection = brandVoiceContext ? `\nBrewery Brand Voice (passe Stil und Ton an):\n"${brandVoiceContext}"\n` : '';
  return `Generate a creative, catchy name for a ${brewType} with the following characteristics: ${details}.${voiceSection}

Requirements:
- Keep it short (1–4 words). Memorable and unique. Consider style and ingredients.
- Avoid generic names. No quotes or special formatting.
- Return ONLY the name, nothing else.

Examples: "Cosmic Haze Navigator", "Velvet Thunder IPA", "Midnight Berry Fusion"

Now generate ONE creative name:`;
}

// ── Copywriter.Description ────────────────────────────────────────────────────

function buildCopywriterDescriptionPrompt(ctx: BotlGuideSessionContext, data: Record<string, unknown>, brandVoiceContext?: string): string {
  const brewType = (data.brewType ?? ctx.brewType ?? 'craft beverage') as string;
  const details  = (data.details ?? ctx.brewStyle ?? 'craft') as string;
  const voiceSection = brandVoiceContext
    ? `\nBrewery Brand Voice (schreibe im Stil und Ton dieser Brauerei):\n"${brandVoiceContext}"\n`
    : '';
  return `Write a compelling, professional description for a ${brewType} with these characteristics: ${details}.${voiceSection}

Requirements:
- 2–4 sentences. Focus on flavors, aromas, appearance, mouthfeel.
- Descriptive, sensory language in German. Professional but approachable.
- No quotes or special formatting. Return ONLY the description text.

Example: "Ein vollmundiges IPA mit intensiven Zitrus- und tropischen Fruchtaromen. Die Kombination aus Citra und Mosaic Hopfen sorgt für eine ausgewogene Bittere bei 45 IBU. Goldgelbe Farbe mit cremiger Schaumkrone."

Now write a description:`;
}

// ── Copywriter.LabelPrompt ────────────────────────────────────────────────────

function buildCopywriterLabelPromptPrompt(ctx: BotlGuideSessionContext, data: Record<string, unknown>, brandVoiceContext?: string): string {
  const brewType        = (data.brewType ?? ctx.brewType ?? 'craft beverage') as string;
  const name            = (data.name ?? ctx.recipeName ?? data.context ?? 'Beer') as string;
  const style           = (data.style ?? ctx.brewStyle ?? 'Craft') as string;
  const labelStyle      = data.labelStyle as string | undefined;
  const labelColorPalette = data.labelColorPalette as string | undefined;
  const voiceSection = brandVoiceContext
    ? `\nBrewery Brand Voice (let this inform the visual mood and aesthetic):\n"${brandVoiceContext}"\n`
    : '';
  const styleConstraint = labelStyle
    ? `\nMANDATORY ART STYLE: "${labelStyle}". The entire prompt MUST be written in this style. Do NOT suggest any other art style.\n`
    : '';
  const paletteConstraint = labelColorPalette
    ? `\nMANDATORY COLOR PALETTE: "${labelColorPalette}". Stay strictly within these colors. Do NOT introduce other dominant colors.\n`
    : '';
  return `Create a creative, detailed image generation prompt for a label of a ${brewType} named "${name}" with style "${style}".${voiceSection}${styleConstraint}${paletteConstraint}

Requirements:
- Describe specific imagery, colors, and mood.${labelStyle ? `\n- Art style is fixed: "${labelStyle}" — stay strictly within it.` : '\n- Include a fitting art style description.'}${labelColorPalette ? `\n- Color palette is fixed: "${labelColorPalette}" — do not deviate from it.` : ''}
- Artistic and evocative. Under 50 words.
- Return ONLY the prompt text in English (optimized for Google Imagen).

Example: "A vintage art deco label for a stout featuring a golden lighthouse in a stormy sea, dark navy and gold color palette, intricate geometric borders, matte finish texture."

Now write a prompt:`;
}

// ── Sommelier.FlavorProfile ───────────────────────────────────────────────────

function buildSommelierFlavorProfilePrompt(
  ctx: BotlGuideSessionContext,
  data: Record<string, unknown>,
  flavorDnaContext?: string,
  inspirationContext?: string,
): string {
  const brewTypeGerman = brewTypeToGerman((data.brewType ?? ctx.brewType) as string);
  const dnaSection  = flavorDnaContext
    ? `\nReferenz — Bisherige Geschmacks-DNA dieser Brauerei (Kalibrierungshilfe, nicht kopieren):\n${flavorDnaContext}\n`
    : '';
  const inspSection = inspirationContext ? `\nInspirationsreferenz (gelikte Fremd-Rezepte des Brauers):\n${inspirationContext}\n` : '';
  return `Du bist ein erfahrener Braumeister und Sensorik-Experte. Analysiere dieses ${brewTypeGerman}-Rezept und erstelle ein realistisches Geschmacksprofil.
${dnaSection}${inspSection}
Rezept:
- Name: ${(data.name ?? ctx.recipeName) ?? 'Nicht angegeben'}
- Stil: ${(data.style ?? ctx.brewStyle) ?? 'Nicht angegeben'}
- Typ: ${brewTypeGerman}
${ctx.abv ?? data.abv ? `- ABV: ${data.abv ?? ctx.abv}%` : ''}
${ctx.ibu ?? data.ibu ? `- IBU: ${data.ibu ?? ctx.ibu}` : ''}
${ctx.colorEBC ?? data.colorEBC ? `- Farbe: ${data.colorEBC ?? ctx.colorEBC} EBC` : ''}
${ctx.targetOG ?? data.og ? `- OG: ${data.og ?? ctx.targetOG}` : ''}
${ctx.targetFG ?? data.fg ? `- FG: ${data.fg ?? ctx.targetFG}` : ''}
${ctx.malts ?? data.malts ? `- Malze: ${data.malts ?? ctx.malts}` : ''}
${ctx.hops ?? data.hops ? `- Hopfen: ${data.hops ?? ctx.hops}` : ''}
${ctx.yeast ?? data.yeast ? `- Hefe: ${data.yeast ?? ctx.yeast}` : ''}
${ctx.dryHop ?? data.dryHop ? `- Dry Hop: ${data.dryHop ?? ctx.dryHop}` : ''}
${ctx.mashTempC ?? data.mashTemp ? `- Maischetemperatur: ${data.mashTemp ?? ctx.mashTempC}°C` : ''}
${data.mashProcess ? `- Maischverfahren: ${data.mashProcess === 'decoction' ? 'Dekoktion' : data.mashProcess === 'step_mash' ? 'Stufeninfusion' : 'Infusion'}` : ''}
${data.mashSchedule ? `- Maischplan: ${data.mashSchedule}` : ''}

5 Dimensionen (0.0–1.0):
- sweetness: Süße (Restextrakt, Caramalz, FG)
- bitterness: Bitterkeit (IBU, Hopfensorte)
- body: Körper (OG, Maischtemp, Malzmenge)
- roast: Röstaromen (dunkle Malze)
- fruitiness: Fruchtigkeit (Hopfensorte, Hefe, Dry Hop)

Antworte NUR mit:
{"profile":{"sweetness":0.4,"bitterness":0.7,"body":0.5,"roast":0.1,"fruitiness":0.6},"explanation":"Kurze Begründung (1-2 Sätze)"}`;
}

// ── Sommelier.Pairing ──────────────────────────────────────────────────────────────────────────

// ── Sommelier.Pairing ──────────────────────────────────────────────────────────────────────────

function buildSommelierPairingPrompt(ctx: BotlGuideSessionContext, data: Record<string, unknown>): string {
  const brewTypeGerman = brewTypeToGerman((data.brewType ?? ctx.brewType) as string);
  return `Du bist BotlGuide Sommelier, Experte für Getränke-Speisen-Kombinationen.

Getränk:
- Name: ${(data.name ?? ctx.recipeName) ?? 'Unbekannt'}
- Stil: ${(data.style ?? ctx.brewStyle) ?? 'Unbekannt'}
- Typ: ${brewTypeGerman}
${ctx.abv ?? data.abv ? `- ABV: ${data.abv ?? ctx.abv}%` : ''}
${ctx.ibu ?? data.ibu ? `- IBU: ${data.ibu ?? ctx.ibu}` : ''}
${ctx.malts ?? data.malts ? `- Malze/Basis: ${data.malts ?? ctx.malts}` : ''}
${ctx.hops ?? data.hops ? `- Hopfen/Aromen: ${data.hops ?? ctx.hops}` : ''}

Erstelle 4 konkrete Food-Pairing-Empfehlungen auf Deutsch.

Gib das Ergebnis AUSSCHLIEßLICH als JSON zurück:
{
  "pairings": [
    { "food": "Gerichtname", "why": "Kurze Begründung (1 Satz)", "emoji": "🍖" },
    ...
  ],
  "intro": "Ein Satz der den Charakter des Getränks und seine Eignung zum Essen beschreibt."
}
Nur JSON, kein Markdown.`;
}

// ── Architect.SuggestHops ───────────────────────────────────────────────────────────────────

function buildArchitectSuggestHopsPrompt(
  ctx: BotlGuideSessionContext,
  data: Record<string, unknown>,
  brewHistoryContext?: string,
  equipmentContext?: string,
  inspirationContext?: string,
): string {
  const historySection = brewHistoryContext
    ? `\nErfahrungsprofil des Brauers (aus früheren Suden):\n${brewHistoryContext}\nBerücksichtige diese Erfahrung — empfehle bevorzugt bekannte Hopfen oder passende Ergänzungen.\n`
    : '';
  const eqSection = equipmentContext
    ? `\nAnlagenparameter:\n${equipmentContext}Dosierungsempfehlungen bitte als absolute Mengen (g) auf die Anlagen-Batch-Größe bezogen.\n`
    : '';
  const inspSection = inspirationContext
    ? `\nInspirationsreferenz (Hopfen-Präferenzen aus gelikten Fremd-Suden):\n${inspirationContext}Nutze diese Präferenzen als Hinweis auf den persönlichen Geschmack des Brauers.\n`
    : '';
  return `Du bist BotlGuide Architect, Experte für Braurezepte und Hopfenprofile. Empfehle Hopfensorten für dieses Rezept.

Rezept:
- Stil: ${(data.style ?? ctx.brewStyle) ?? 'Unbekannt'}
- Ziel-IBU: ${(data.ibu ?? ctx.ibu) ?? 'Nicht angegeben'}
- Vorhandene Hopfen: ${(data.existingHops ?? '') || 'Noch keine eingetragen'}
- Malzprofil: ${(data.malts ?? ctx.malts) ?? 'Nicht angegeben'}
- OG: ${(data.og ?? ctx.targetOG) ?? 'Nicht angegeben'}
${eqSection}${historySection}${inspSection}
Aufgabe (Deutsch, Markdown, max. 200 Wörter):
Empfehle 3–5 konkrete Hopfensorten mit:
- **Name** (und Herkunft)
- **Einsatzzweck** (Bitterung, Aroma, Dry Hop)
- **Warum** dieser Hopfen zu Stil und vorhandenen Hopfen passt
- **Dosierungshinweis** (g konkret zur Anlagengröße, oder IBU-Beitrag)

Sortiere von wichtigsten zu optionalen Ergänzungen. Keine Einleitung, direkt mit der ersten Empfehlung beginnen.`;
}

// ── Copywriter.Social ───────────────────────────────────────────────────────────────────────

function buildCopywriterSocialPrompt(ctx: BotlGuideSessionContext, data: Record<string, unknown>, brandVoiceContext?: string): string {
  const brewTypeGerman  = brewTypeToGerman((data.brewType ?? ctx.brewType) as string);
  const voiceSection = brandVoiceContext
    ? `\nBrewery Brand Voice (schreibe im Stil und Ton dieser Brauerei):\n"${brandVoiceContext}"\n`
    : '';
  return `Du bist BotlGuide Copywriter, kreiver Texter für Craft-Getränke-Brands.${voiceSection}

Getränk:
- Name: ${(data.name ?? ctx.recipeName) ?? 'Unbekannt'}
- Stil: ${(data.style ?? ctx.brewStyle) ?? 'Unbekannt'}
- Typ: ${brewTypeGerman}
- Beschreibung: ${(data.description ?? '') || 'Keine Beschreibung vorhanden'}
${ctx.abv ?? data.abv ? `- ABV: ${data.abv ?? ctx.abv}%` : ''}
${ctx.ibu ?? data.ibu ? `- IBU: ${data.ibu ?? ctx.ibu}` : ''}

Erstelle einen Instagram-Post und einen Facebook-Post auf Deutsch.

- Instagram: Kurz, emotional, mit 5–8 relevanten Hashtags. Max. 220 Zeichen + Hashtags.
- Facebook: Etwas länger, storytelling-orientiert, authentisch. 1–3 Sätze.

Gib AUSSCHLIEßLICH JSON zurück:
{
  "instagram": "Post-Text mit Emojis und #Hashtags",
  "facebook": "Längerer Facebook-Text ohne übermäßige Hashtags"
}
Nur JSON, kein Markdown drumherum.`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

// ─── Helpers ───────────────────────────────────────────────────────────────────

// ── Architect.CheckBJCP ───────────────────────────────────────────────────────

function buildArchitectCheckBjcpPrompt(
  ctx: BotlGuideSessionContext,
  data: Record<string, unknown>,
  ragContext: string,
  equipmentContext?: string,
): string {
  const brewTypeGerman = brewTypeToGerman((data.brewType ?? ctx.brewType) as string);
  const eqSection = equipmentContext ? `\nAnlagenparameter:\n${equipmentContext}\n` : '';
  return `Du bist BotlGuide Architect, ein Experte für BJCP Bierstil-Richtlinien. Prüfe dieses Rezept auf Konformität mit dem angegebenen Bierstil.${ragContext}${eqSection}

Zu prüfendes Rezept:
- Name: ${(data.name ?? ctx.recipeName) ?? 'N/A'}
- Bierstil: ${(data.style ?? ctx.brewStyle) ?? 'Nicht angegeben'} 
- Typ: ${brewTypeGerman}
- OG: ${data.og ?? ctx.targetOG ?? 'N/A'}
- FG: ${data.fg ?? ctx.targetFG ?? 'N/A'}
- ABV: ${data.abv ?? ctx.abv ?? 'N/A'}%
- IBU: ${data.ibu ?? ctx.ibu ?? 'N/A'}
- EBC: ${data.ebc ?? ctx.colorEBC ?? 'N/A'}
- Malze: ${data.malts ?? ctx.malts ?? 'N/A'}
- Hopfen: ${data.hops ?? ctx.hops ?? 'N/A'}
- Hefe: ${data.yeast ?? ctx.yeast ?? 'N/A'}

Aufgabe:
1. Identifiziere den passendsten BJCP 2021 Stil für dieses Rezept
2. Prüfe ob OG, FG, ABV, IBU, EBC innerhalb der BJCP-Richtwerte liegen
3. Bewerte die Zutaten (Malze, Hopfen, Hefe) auf Stilkonformität
4. Vergib einen Konformitäts-Score von 0–100 (100 = perfekt stilkonform)
5. Liste konkrete Abweichungen und Verbesserungsvorschläge auf

Gib AUSSCHLIEßLICH dieses JSON zurück:
{
  "bjcpStyle": { "code": "10A", "name": "...", "nameDe": "..." },
  "conformityScore": 85,
  "parameterChecks": [
    { "param": "OG", "value": "1.048", "range": "1.044–1.052", "status": "ok" },
    { "param": "IBU", "value": "45", "range": "8–15", "status": "high" }
  ],
  "strengths": ["Positives 1", "Positives 2"],
  "deviations": ["Abweichung mit Begründung 1"],
  "improvements": ["Konkreter Verbesserungsvorschlag 1", "Vorschlag 2"],
  "verdict": "Kurzes deutsches Fazit in 2–3 Sätzen."
}
Nur JSON, kein Markdown.`;
}

function brewTypeToGerman(type: string | undefined): string {
  const map: Record<string, string> = {
    beer: 'Bier', wine: 'Wein', cider: 'Cider', mead: 'Met',
  };
  return map[type ?? ''] ?? 'Getränk';
}

/** Converts an equipment profile JSON object from get_user_brew_context into a
 *  short readable block to inject into architect prompts. */
function buildEquipmentContext(eq: Record<string, unknown> | null | undefined): string {
  if (!eq) return '';
  const method = eq.brewMethod === 'all_grain' ? 'All-Grain'
                : eq.brewMethod === 'extract'   ? 'Malzextrakt'
                : eq.brewMethod === 'biab'       ? 'BIAB'
                : String(eq.brewMethod ?? 'All-Grain');
  const parts = [
    eq.name         ? `Anlage: ${eq.name} (${method})` : `Methode: ${method}`,
    eq.batchVolumeL ? `Batch: ${eq.batchVolumeL} L` : '',
    eq.boilOffRateL ? `Verdampfung: ${eq.boilOffRateL} L/h` : '',
    eq.trubLossL    ? `Trub-Verlust: ${eq.trubLossL} L` : '',
  ].filter(Boolean);
  if (eq.location) {
    const waterHint = inferWaterChemistry(String(eq.location));
    parts.push(`Standort: ${eq.location}${waterHint ? ` → ${waterHint}` : ''}`);
  }
  return '  ' + parts.join(' | ') + '\n';
}

/** Maps a brewery location string to a water chemistry hint for the AI prompt.
 *  Covers major brewing cities/regions; returns empty string for unknowns. */
function inferWaterChemistry(location: string): string {
  const l = location.toLowerCase();
  if (/münchen|munich|oberbayern|bavaria/.test(l))  return 'weiches Wasser – ideal für Weizen, Helles';
  if (/pilsen|plzeň|pilsner|böhmen/.test(l))        return 'sehr weiches Wasser – Pilsner-typisch';
  if (/köln|cologne/.test(l))                        return 'mittleres Wasser – typisch Kölsch';
  if (/düsseldorf/.test(l))                          return 'mittleres Wasser – typisch Altbier';
  if (/berlin/.test(l))                              return 'weiches bis mittleres Wasser';
  if (/burton|burton.*trent/.test(l))                return 'sehr hartes Sulfat-Wasser – ideal für Bitter/IPA';
  if (/dublin|ireland/.test(l))                      return 'mittelhartes Wasser – typisch für Stouts';
  if (/bamberg/.test(l))                             return 'weiches Wasser – Rauchbier/Lager';
  if (/wien|vienna|österreich/.test(l))              return 'mittleres Karbonates Wasser – Vienna Lager';
  return '';
}

/** Formats a sessionContext object from get_user_brew_context into a readable
 *  process context block for coach prompts. */
function buildSessionContext(sc: Record<string, unknown> | null | undefined): string {
  if (!sc) return '';
  const lines: string[] = [];
  if (sc.phase || sc.status) {
    const parts = [sc.phase ? String(sc.phase) : '', sc.status ? String(sc.status) : '']
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
    if (parts.length) lines.push(`Phase: ${parts.join(' / ')}`);
  }
  if (sc.currentGravity)      lines.push(`Akt. Dichte: ${Number(sc.currentGravity).toFixed(3)} SG`);
  if (sc.apparentAttenuation) lines.push(`Scheinb. Vergärung: ${Number(sc.apparentAttenuation).toFixed(1)}%`);
  if (sc.notes && String(sc.notes).trim()) lines.push(`Session-Notizen: ${String(sc.notes).trim()}`);
  const pnotes = Array.isArray(sc.processNotes)
    ? (sc.processNotes as Array<Record<string, unknown>>)
    : [];
  if (pnotes.length > 0) {
    const noteLines = pnotes
      .filter(n => n.title)
      .map(n => `    - ${String(n.title)}${n.note ? ` (${String(n.note)})` : ''}`)
      .join('\n');
    if (noteLines) lines.push(`Brautag-Notizen:\n${noteLines}`);
  }
  if (lines.length === 0) return '';
  return lines.map(l => `  ${l}`).join('\n') + '\n';
}

/** Converts a flavorDna object from get_user_brew_context into a readable
 *  context line listing the brewer’s average taste dimensions. */
function buildFlavorDnaContext(dna: Record<string, unknown> | null | undefined): string {
  if (!dna || !dna.count) return '';
  const pct = (v: unknown) => `${Math.round(Number(v) * 100)}%`;
  const high = [];
  if (Number(dna.bitterness) > 0.6) high.push('eher bitter');
  if (Number(dna.sweetness)  > 0.6) high.push('eher süß');
  if (Number(dna.roast)      > 0.5) high.push('röstig');
  if (Number(dna.fruitiness) > 0.6) high.push('fruchtig');
  if (Number(dna.body)       > 0.7) high.push('vollmundig');
  return [
    `  ${dna.count} Profile | Süße: ${pct(dna.sweetness)} | Bitterkeit: ${pct(dna.bitterness)}`,
    `  Körper: ${pct(dna.body)} | Röst: ${pct(dna.roast)} | Fruchtigkeit: ${pct(dna.fruitiness)}`,
    high.length ? `  Charakteristik: ${high.join(', ')}` : '',
  ].filter(Boolean).join('\n');
}

/** Converts the inspirationSignal from get_user_brew_context into a readable context line
 *  summarising the brewer's taste compass based on liked foreign brews. */
function buildInspirationContext(sig: Record<string, unknown> | null | undefined): string {
  if (!sig) return '';
  const styles = Array.isArray(sig.topStyles) ? (sig.topStyles as string[]).filter(Boolean).join(', ') : '';
  const hops   = Array.isArray(sig.topHops)   ? (sig.topHops   as string[]).filter(Boolean).join(', ') : '';
  if (!styles && !hops) return '';
  const parts = [
    styles ? `Inspirations-Stile: ${styles}` : '',
    hops   ? `Hopfen-Präferenzen: ${hops}`   : '',
  ].filter(Boolean);
  return '  ' + parts.join(' | ') + '\n';
}

/** Produces a one-line prompt calibration hint when this user has consistently
 *  rated a given capability as unhelpful (≥3 total votes, >50% thumbs-down).
 *  Returns empty string if there's not enough signal or feedback is positive. */
function buildFeedbackContext(
  profile: Record<string, unknown> | null | undefined,
  cap: string,
): string {
  if (!profile) return '';
  const entry = profile[cap] as { up: number; down: number; total: number } | undefined;
  if (!entry || Number(entry.total) < 3) return '';
  const downRatio = Number(entry.down) / Number(entry.total);
  if (downRatio > 0.5) {
    return `[Stil-Kalibrierung: Deine letzten Antworten für diese Funktion wurden ${entry.down}× als nicht hilfreich bewertet — bitte besonders konkret, direkt und mit klar umsetzbaren Empfehlungen antworten.]`;
  }
  return '';
}

/** Trims and caps breweries.description to a concise brand voice context string.
 *  Max 300 chars to keep token usage bounded; appends "…" if truncated. */
function buildBrandVoiceContext(description: string | null | undefined): string {
  const d = description?.trim();
  if (!d) return '';
  return d.length > 300 ? d.slice(0, 297) + '…' : d;
}

/** Maps profiles.tier to a human-readable experience label + prompt hint for depth adaptation. */
function mapExperienceTier(tier: string): { label: string; hint: string } {
  if (['lehrling', 'hobby'].includes(tier)) {
    return {
      label: 'Anfänger (Hobby-Brauer)',
      hint: 'Erkläre Fachbegriffe wenn nötig. Einfache, klare Sprache. Keine vorausgesetzte Expertise.',
    };
  }
  if (tier === 'geselle') {
    return {
      label: 'Fortgeschrittener Brauer',
      hint: 'Fachbegriffe sind bekannt. Fokus auf Präzision, keine Grundlagen-Erklärungen.',
    };
  }
  if (['meister', 'braumeister', 'legende'].includes(tier)) {
    return {
      label: 'Experte / Braumeister',
      hint: 'Nur Werte, Empfehlungen und Analyse. Technisch präzise. Kein Einführungstext.',
    };
  }
  // Brewery tiers: garage, micro, craft, industrial
  return {
    label: 'Professionelle Brauerei',
    hint: 'Professioneller Kontext. Skalierbare Empfehlungen. Fachterminologie ohne Erläuterung.',
  };
}

/**
 * Converts brews.data ingredient values (string, JSONB array or object)
 * to a short comma-separated readable string for prompt context.
 */
function formatIngredient(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return (val as unknown[])
      .map((v) => {
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v !== null) {
          const obj = v as Record<string, unknown>;
          return String(obj.name ?? obj.type ?? obj.label ?? '').trim();
        }
        return String(v);
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');
  }
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    return String(obj.name ?? obj.type ?? '').trim();
  }
  return String(val);
}

function extractJson(text: string, shape: 'array' | 'object'): unknown {
  const pattern = shape === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = text.match(pattern);
  return JSON.parse(match ? match[0] : text);
}
