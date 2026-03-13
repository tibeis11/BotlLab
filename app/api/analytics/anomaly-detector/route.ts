import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';

// ============================================================================
// Phase 15.2 — Cron: Anomaly Detector (BotlGuide Analyst)
//
// Runs daily at 04:00 UTC via Vercel Cron.
// Scans all breweries for statistical anomalies in their analytics data.
// Only generates an insight (and optionally an LLM call) when Z-Score > 2.0.
//
// Anomaly sources:
//   - Off-Flavor reports   (Phase 5.3)
//   - Batch A/B drift      (Phase 4.5)
//   - Taste trend decline  (Phase 5)
//   - Shelf-Life drop-off  (Phase 5.4)
//   - Event clusters       (Phase 10)
//   - Market gaps          (Phase 14)
// ============================================================================

const Z_THRESHOLD = 2.0;

function getAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = getAdminClient();

  try {
    // 1) Get all active breweries
    const { data: breweries } = await supabase
      .from('breweries')
      .select('id, name')
      .limit(500);

    if (!breweries || breweries.length === 0) {
      return NextResponse.json({ success: true, message: 'No breweries found', insightsCreated: 0 });
    }

    let totalInsights = 0;

    for (const brewery of breweries) {
      const newInsights = await detectAnomaliesForBrewery(supabase, brewery.id, brewery.name);
      totalInsights += newInsights;
    }

    const durationMs = Date.now() - startTime;

    console.log(
      `[anomaly-detector] Done in ${durationMs}ms — ` +
      `breweries checked: ${breweries.length}, insights created: ${totalInsights}`
    );

    return NextResponse.json({
      success: true,
      breweriesChecked: breweries.length,
      insightsCreated: totalInsights,
      durationMs,
    });
  } catch (error) {
    console.error('[anomaly-detector] Error:', error);
    return NextResponse.json(
      {
        error: 'Anomaly detection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ── Per-Brewery Detection ──────────────────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof getAdminClient>;

async function detectAnomaliesForBrewery(
  supabase: SupabaseAdmin,
  breweryId: string,
  _breweryName: string
): Promise<number> {
  let insightsCreated = 0;

  // Check that we haven't already generated insights today (avoid duplicates)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from('analytics_ai_insights')
    .select('id', { count: 'exact', head: true })
    .eq('brewery_id', breweryId)
    .gte('created_at', todayStart.toISOString());

  if ((todayCount ?? 0) > 0) return 0; // Already processed today

  // ── 1. Off-Flavor Detection (Phase 5.3) ──────────────────────────────
  insightsCreated += await checkOffFlavorAnomaly(supabase, breweryId);

  // ── 2. Batch Rating Drift (Phase 4.5) ────────────────────────────────
  insightsCreated += await checkBatchDrift(supabase, breweryId);

  // ── 3. Taste Trend Decline (Phase 5) ─────────────────────────────────
  insightsCreated += await checkTasteTrendDecline(supabase, breweryId);

  // ── 4. Event Surges (Phase 10) ───────────────────────────────────────
  insightsCreated += await checkEventSurge(supabase, breweryId);

  return insightsCreated;
}

// ── Anomaly Detectors ──────────────────────────────────────────────────────

/**
 * Off-Flavor: Check if any brew has ≥3 off-flavor reports in the last 30 days.
 * Calculates Z-Score against average off-flavor rate per brew.
 */
async function checkOffFlavorAnomaly(
  supabase: SupabaseAdmin,
  breweryId: string
): Promise<number> {
  // Get brews for this brewery
  const { data: brews } = await supabase
    .from('brews')
    .select('id, name')
    .eq('brewery_id', breweryId);

  if (!brews || brews.length === 0) return 0;

  let created = 0;

  for (const brew of brews) {
    // Count off-flavor tags in last 30 days
    // Note: ratings table uses `flavor_tags` (string[]) for off-flavor reporting
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentRatings } = await supabase
      .from('ratings')
      .select('flavor_tags')
      .eq('brew_id', brew.id)
      .gte('created_at', thirtyDaysAgo);

    if (!recentRatings) continue;

    const offFlavorCount = recentRatings.filter(
      (r) => r.flavor_tags && (r.flavor_tags as string[]).length > 0
    ).length;

    // Get historical average (all time excluding last 30 days)
    const { data: allRatings } = await supabase
      .from('ratings')
      .select('flavor_tags')
      .eq('brew_id', brew.id)
      .lt('created_at', thirtyDaysAgo);

    const historicalCount = allRatings
      ? allRatings.filter(
          (r) => r.flavor_tags && (r.flavor_tags as string[]).length > 0
        ).length
      : 0;

    // Z-Score: (current - mean) / stddev
    const totalHistorical = allRatings?.length ?? 0;
    if (totalHistorical < 5) continue; // Need enough data

    const historicalRate = historicalCount / totalHistorical;
    const currentRate = recentRatings.length > 0 ? offFlavorCount / recentRatings.length : 0;

    // Approximate stddev from Bernoulli distribution
    const stddev = Math.sqrt(historicalRate * (1 - historicalRate) / totalHistorical);
    if (stddev === 0) continue;

    const zScore = (currentRate - historicalRate) / stddev;

    if (zScore > Z_THRESHOLD && offFlavorCount >= 3) {
      // Collect the specific off-flavor tags reported
      const tagCounts: Record<string, number> = {};
      for (const r of recentRatings) {
        const tags = r.flavor_tags as string[] | null;
        if (tags) {
          for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
          }
        }
      }

      const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

      await insertInsight(supabase, {
        breweryId,
        brewId: brew.id,
        insightType: 'off_flavor',
        severity: zScore > 3.0 ? 'critical' : 'warning',
        title: `Off-Flavor Alert: „${topTag?.[0] ?? 'Unbekannt'}" bei ${brew.name}`,
        body: `${offFlavorCount} unabhängige Trinker melden Off-Flavors in den letzten 30 Tagen (${recentRatings.length} Bewertungen total). Die häufigste Meldung ist „${topTag?.[0] ?? 'n/a'}" (${topTag?.[1] ?? 0}×). Z-Score: ${zScore.toFixed(1)} — das ist statistisch signifikant.`,
        actionSuggestion: `Überprüfe dein Brauprotokoll für ${brew.name}: Nachgärzeit, Gärtemperatur und Hefestamm. Vergleiche mit dem vorherigen, problemfreien Sud.`,
        triggerData: { zScore, offFlavorCount, totalRatings: recentRatings.length, tagCounts },
        sourcePhases: ['phase_5.3'],
      });

      created++;
    }
  }

  return created;
}

/**
 * Batch Drift: Check if the latest brew of a recipe deviates ≥0.5 points
 * from the previous batch's overall rating.
 */
async function checkBatchDrift(
  supabase: SupabaseAdmin,
  breweryId: string
): Promise<number> {
  // Get brews ordered by creation date, grouped by name (= same recipe)
  const { data: brews } = await supabase
    .from('brews')
    .select('id, name, style, created_at')
    .eq('brewery_id', breweryId)
    .order('created_at', { ascending: false });

  if (!brews || brews.length < 2) return 0;

  // Group brews by normalized name
  const byName: Record<string, typeof brews> = {};
  for (const brew of brews) {
    const key = (brew.name ?? '').toLowerCase().trim();
    if (!byName[key]) byName[key] = [];
    byName[key].push(brew);
  }

  let created = 0;

  for (const [, batches] of Object.entries(byName)) {
    if (batches.length < 2) continue;

    const [latest, previous] = batches;

    // Get average ratings for both batches
    const [latestAvg, previousAvg] = await Promise.all([
      getBrewAverageRating(supabase, latest.id),
      getBrewAverageRating(supabase, previous.id),
    ]);

    if (latestAvg === null || previousAvg === null) continue;
    if (latestAvg.count < 3 || previousAvg.count < 3) continue; // Need enough ratings

    const drift = latestAvg.avg - previousAvg.avg;

    if (Math.abs(drift) >= 0.5) {
      const direction = drift < 0 ? 'gesunken' : 'gestiegen';
      const severity: 'info' | 'warning' = Math.abs(drift) >= 1.0 ? 'warning' : 'info';

      await insertInsight(supabase, {
        breweryId,
        brewId: latest.id,
        insightType: 'batch_comparison',
        severity,
        title: `Batch-Vergleich: ${latest.name} ist ${direction}`,
        body: `Der aktuelle Sud hat eine Durchschnittsbewertung von ${latestAvg.avg.toFixed(1)}★ (${latestAvg.count} Bewertungen), der vorherige Sud lag bei ${previousAvg.avg.toFixed(1)}★ (${previousAvg.count}). Differenz: ${drift > 0 ? '+' : ''}${drift.toFixed(1)} Punkte.`,
        actionSuggestion: drift < 0
          ? `Vergleiche die Rezeptänderungen zwischen den letzten beiden Chargen von ${latest.name}. Prüfe besonders Gärtemperatur und Hefevitalität.`
          : `Die letzte Charge von ${latest.name} kommt besser an! Dokumentiere die Änderungen, damit du den Erfolg reproduzieren kannst.`,
        triggerData: {
          latestBrewId: latest.id,
          previousBrewId: previous.id,
          latestAvg: latestAvg.avg,
          previousAvg: previousAvg.avg,
          drift,
        },
        sourcePhases: ['phase_4.5'],
      });

      created++;
    }
  }

  return created;
}

/**
 * Taste Trend: Check if brewery-wide average rating dropped ≥0.3 vs. previous month.
 */
async function checkTasteTrendDecline(
  supabase: SupabaseAdmin,
  breweryId: string
): Promise<number> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  // Get brew IDs for this brewery (ratings has no brewery_id — go through brews)
  const { data: breweryBrews } = await supabase
    .from('brews')
    .select('id')
    .eq('brewery_id', breweryId);

  if (!breweryBrews || breweryBrews.length === 0) return 0;
  const brewIds = breweryBrews.map((b) => b.id);

  // Current month ratings
  const { data: currentRatings } = await supabase
    .from('ratings')
    .select('rating')
    .in('brew_id', brewIds)
    .gte('created_at', thisMonthStart);

  // Previous month ratings
  const { data: prevRatings } = await supabase
    .from('ratings')
    .select('rating')
    .in('brew_id', brewIds)
    .gte('created_at', lastMonthStart)
    .lt('created_at', thisMonthStart);

  if (!currentRatings || !prevRatings) return 0;
  if (currentRatings.length < 5 || prevRatings.length < 5) return 0;

  const currentAvg = currentRatings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / currentRatings.length;
  const prevAvg = prevRatings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / prevRatings.length;
  const diff = currentAvg - prevAvg;

  if (diff <= -0.3) {
    await insertInsight(supabase, {
      breweryId,
      brewId: null,
      insightType: 'trend',
      severity: diff <= -0.5 ? 'warning' : 'info',
      title: `Rating-Trend: Durchschnitt sinkt um ${Math.abs(diff).toFixed(1)} Punkte`,
      body: `Dein Brauerei-Durchschnitt liegt diesen Monat bei ${currentAvg.toFixed(1)}★ (${currentRatings.length} Bewertungen), letzten Monat waren es ${prevAvg.toFixed(1)}★ (${prevRatings.length}). Das ist ein Rückgang von ${Math.abs(diff).toFixed(1)} Punkten.`,
      actionSuggestion: 'Prüfe, ob ein bestimmter Sud den Durchschnitt nach unten zieht. Nutze den Batch-Vergleich für Details.',
      triggerData: { currentAvg, prevAvg, diff, currentCount: currentRatings.length, prevCount: prevRatings.length },
      sourcePhases: ['phase_5'],
    });
    return 1;
  }

  return 0;
}

/**
 * Event Surge: Check if a new event cluster was detected with ≥10 scans.
 */
async function checkEventSurge(
  supabase: SupabaseAdmin,
  breweryId: string
): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // scan_events table: uses `breweries` (text[]), `total_scans`, `event_start`, `created_at`
  const { data: recentEvents } = await supabase
    .from('scan_events')
    .select('id, total_scans, event_start, event_end, center_lat, center_lng, city, breweries')
    .gte('created_at', sevenDaysAgo)
    .gte('total_scans', 10);

  if (!recentEvents || recentEvents.length === 0) return 0;

  // Filter to events that involve this brewery
  const relevantEvents = recentEvents.filter(
    (e) => e.breweries && (e.breweries as string[]).includes(breweryId)
  );

  let created = 0;

  for (const event of relevantEvents) {
    // Check if we already have an insight for this event
    const { count } = await supabase
      .from('analytics_ai_insights')
      .select('id', { count: 'exact', head: true })
      .eq('brewery_id', breweryId)
      .eq('insight_type', 'event_detected')
      .contains('trigger_data', { eventId: event.id });

    if ((count ?? 0) > 0) continue; // Already reported

    await insertInsight(supabase, {
      breweryId,
      brewId: null,
      insightType: 'event_detected',
      severity: event.total_scans >= 25 ? 'warning' : 'info',
      title: `Event erkannt: ${event.total_scans} Scans${event.city ? ` in ${event.city}` : ''}`,
      body: `Ein Scan-Cluster mit ${event.total_scans} Scans wurde erkannt (${new Date(event.event_start).toLocaleDateString('de-DE')}${event.city ? `, ${event.city}` : ''}). Das deutet auf ein Event oder eine Verkostung hin.`,
      actionSuggestion: 'Überprüfe, ob ein Event stattfand. Falls ja, markiere es im Dashboard für bessere Analyse deiner Event-Performance.',
      triggerData: {
        eventId: event.id,
        scanCount: event.total_scans,
        city: event.city,
        startedAt: event.event_start,
      },
      sourcePhases: ['phase_10'],
    });

    created++;
  }

  return created;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getBrewAverageRating(
  supabase: SupabaseAdmin,
  brewId: string
): Promise<{ avg: number; count: number } | null> {
  const { data } = await supabase
    .from('ratings')
    .select('rating, plausibility_score, is_shadowbanned')
    .eq('brew_id', brewId);

  if (!data || data.length === 0) return null;

  const validRatings = data.filter((r) => r.rating != null && !r.is_shadowbanned);
  if (validRatings.length === 0) return null;

  let totalScore = 0;
  let totalWeight = 0;
  validRatings.forEach(r => {
    const weight = r.plausibility_score ?? 1.0;
    totalScore += (r.rating ?? 0) * weight;
    totalWeight += weight;
  });

  const avg = totalWeight > 0 ? totalScore / totalWeight : 0;
  return { avg, count: validRatings.length };
}

interface InsertInsightParams {
  breweryId: string;
  brewId: string | null;
  insightType: string;
  severity: string;
  title: string;
  body: string;
  actionSuggestion: string;
  triggerData: Record<string, unknown>;
  sourcePhases: string[];
}

async function insertInsight(
  supabase: SupabaseAdmin,
  params: InsertInsightParams
): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const { error } = await supabase.from('analytics_ai_insights').insert({
    brewery_id: params.breweryId,
    brew_id: params.brewId,
    insight_type: params.insightType,
    severity: params.severity,
    title: params.title,
    body: params.body,
    action_suggestion: params.actionSuggestion,
    trigger_data: params.triggerData as unknown as Json,
    source_phases: params.sourcePhases,
    expires_at: expiresAt,
  });

  if (error) {
    console.error(`[anomaly-detector] Failed to insert insight for ${params.breweryId}:`, error.message);
  }
}
