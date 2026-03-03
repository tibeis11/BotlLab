import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchWeatherBatch } from '@/lib/weather-service';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/analytics/fetch-weather
//
// Called by pg_cron every hour (via pg_net / http_post).
// Processes up to 50 scans that are missing weather data.
// Auth: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

export async function POST(req: Request) {
  // Auth
  const secret     = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);

  // 1. Fetch unprocessed scans with known coordinates
  const { data: pending, error: fetchErr } = await sb
    .from('bottle_scans')
    .select('id, latitude, longitude, scanned_at, created_at')
    .is('weather_fetched_at', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error('[fetch-weather] DB fetch error', fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Nothing to process' });
  }

  // 2. Fetch weather for the batch (grouped by location+date)
  const results = await fetchWeatherBatch(
    pending.map((r) => ({
      id:        r.id,
      latitude:  r.latitude  as number,
      longitude: r.longitude as number,
      scannedAt: (r.scanned_at ?? r.created_at) as string,
    })),
  );

  // 3. Upsert results back into bottle_scans
  let processed = 0;
  const now = new Date().toISOString();

  for (const result of results) {
    const w = result.weather;
    await sb
      .from('bottle_scans')
      .update({
        weather_temp_c:     w?.tempC     ?? null,
        weather_condition:  w?.condition ?? 'unavailable',
        weather_category:   w?.category  ?? null,
        weather_is_outdoor: w?.isOutdoor ?? null,
        weather_fetched_at: now,
      } as never)
      .eq('id', result.id);
    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
