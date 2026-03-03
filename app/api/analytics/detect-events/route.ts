import { NextResponse } from 'next/server';
import { detectEventClusters } from '@/lib/actions/analytics-actions';

// ============================================================================
// Phase 10.3 — Cron: Detect Scan Event Clusters
// Runs every hour at :30 via Vercel Cron (see vercel.json)
// Calls PostGIS ST_ClusterDBSCAN to find spatial-temporal scan clusters.
// Only GPS-snapped scans (geo_source = 'gps_snapped_h3') are considered.
// IP-based scans are excluded to avoid fake events from mobile carrier exits.
// ============================================================================

export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const result = await detectEventClusters();
    const durationMs = Date.now() - startTime;

    console.log(
      `[detect-events] Done in ${durationMs}ms — ` +
      `new events: ${result.newEvents}, notified breweries: ${result.notifiedBreweries.length}`
    );

    return NextResponse.json({
      success: true,
      newEvents: result.newEvents,
      notifiedBreweries: result.notifiedBreweries.length,
      durationMs,
    });
  } catch (error) {
    console.error('[detect-events] Error:', error);
    return NextResponse.json(
      {
        error: 'Event detection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
