import { NextResponse } from 'next/server';
import {
  classifyBrowseScans,
  classifyRepeatScans,
  classifySocialScans,
  classifySingleScans,
} from '@/lib/actions/analytics-actions';

// ============================================================================
// Phase 9.9 — Cron: Classify Scan Intent
// Runs every 15 minutes via Vercel Cron (see vercel.json or migration cron)
// Classifies unclassified bottle_scans in order: browse → repeat → social → single
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
    // Run classifiers in sequence (order matters — most specific first)
    const browseCount  = await classifyBrowseScans();
    const repeatCount  = await classifyRepeatScans();
    const socialCount  = await classifySocialScans();
    const singleCount  = await classifySingleScans();

    const totalClassified = browseCount + repeatCount + socialCount + singleCount;
    const durationMs = Date.now() - startTime;

    console.log(
      `[classify-scan-intent] Done in ${durationMs}ms — ` +
      `browse: ${browseCount}, repeat: ${repeatCount}, social: ${socialCount}, single: ${singleCount} ` +
      `(total: ${totalClassified})`
    );

    return NextResponse.json({
      success: true,
      classified: {
        browse: browseCount,
        repeat: repeatCount,
        social: socialCount,
        single: singleCount,
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
