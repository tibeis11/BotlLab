import { NextResponse } from 'next/server';
import {
  classifyCisScans,
  classifyRepeatScans,
  // Legacy stubs kept for backwards-compatibility but return 0:
  classifyBrowseScans,
  classifySocialScans,
  classifySingleScans,
} from '@/lib/actions/analytics-actions';

// ============================================================================
// Phase 0 — Cron: Classify Scan Intent (CIS Engine v2, 2026-03-08)
// Runs every 15 minutes via Vercel Cron.
//
// New pipeline:
//   1. classifyRepeatScans()  — loyal returning users (cross-day evidence)
//   2. classifyCisScans()     — session-aware additive scoring for all remaining
//                               unclassified scans (replaces browse + single)
//
// Legacy classifyBrowseScans / classifySocialScans / classifySingleScans are
// kept as no-ops to avoid breaking any direct invocations.
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
    // 1. Repeat scans first — loyal users get highest-priority classification
    const repeatCount = await classifyRepeatScans();

    // 2. CIS Engine v2 — session-aware, additive scoring
    const cisResult = await classifyCisScans();

    const totalClassified = repeatCount + cisResult.nonQr + cisResult.session;
    const durationMs = Date.now() - startTime;

    console.log(
      `[classify-scan-intent] Done in ${durationMs}ms — ` +
      `repeat: ${repeatCount}, cis_session: ${cisResult.session}, cis_non_qr: ${cisResult.nonQr} ` +
      `(total: ${totalClassified})`
    );

    return NextResponse.json({
      success: true,
      classified: {
        repeat: repeatCount,
        cis_session: cisResult.session,
        cis_non_qr: cisResult.nonQr,
        total: totalClassified,
      },
      durationMs,
    });
  } catch (error) {
    console.error('[classify-scan-intent] Error:', error);
    return NextResponse.json(
      {
        error: 'Classification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

