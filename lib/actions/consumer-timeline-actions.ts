// ZWEI WELTEN Phase 4.4 — Server Action: getConsumerTimeline
// Fetches timeline data for "Meine Reise" — caps, ratings, scans grouped by month
'use server';

import { createClient } from '@/lib/supabase-server';
import type { TimelineEvent, TimelineMonth } from '@/lib/timeline-types';


const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export async function getConsumerTimeline(
  userId: string,
  limit = 50
): Promise<TimelineMonth[]> {
  const supabase = await createClient();

  // Parallel fetch: caps, user ratings, scans
  const [capsRes, ratingsRes, scansRes] = await Promise.all([
    supabase
      .from('collected_caps')
      .select('id, collected_at, brew_id, brews(id, name, brewery_id, breweries(name))')
      .eq('user_id', userId)
      .order('collected_at', { ascending: false })
      .limit(limit),

    supabase
      .from('ratings')
      .select('id, created_at, rating, comment, brew_id, brews(id, name, brewery_id, breweries(name))')
      .eq('user_id', userId)
      .eq('moderation_status', 'auto_approved')
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('bottle_scans')
      .select('id, created_at, city, brew_id, brews(id, name, brewery_id, breweries(name))')
      .eq('viewer_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  // Build flat events list
  const events: TimelineEvent[] = [];

  for (const cap of capsRes.data ?? []) {
    const brew = cap.brews as any;
    events.push({
      id: `cap-${cap.id}`,
      kind: 'cap',
      ts: cap.collected_at ?? '',
      brewName: brew?.name ?? null,
      brewId: cap.brew_id ?? null,
      breweryName: brew?.breweries?.name ?? null,
      city: null,
      rating: null,
      comment: null,
    });
  }

  for (const r of ratingsRes.data ?? []) {
    const brew = r.brews as any;
    events.push({
      id: `rating-${r.id}`,
      kind: 'rating',
      ts: r.created_at,
      brewName: brew?.name ?? null,
      brewId: r.brew_id ?? null,
      breweryName: brew?.breweries?.name ?? null,
      city: null,
      rating: r.rating,
      comment: r.comment ?? null,
    });
  }

  for (const s of scansRes.data ?? []) {
    const brew = s.brews as any;
    events.push({
      id: `scan-${s.id}`,
      kind: 'scan',
      ts: s.created_at,
      brewName: brew?.name ?? null,
      brewId: s.brew_id ?? null,
      breweryName: brew?.breweries?.name ?? null,
      city: s.city ?? null,
      rating: null,
      comment: null,
    });
  }

  // Sort DESC by timestamp
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  // Deduplicate: if a cap + rating have the same brew_id within 60s, merge city from scan
  // Enrich cap/rating events with city from nearest scan of the same brew
  const scansByBrew = new Map<string, { city: string; ts: number }[]>();
  for (const e of events) {
    if (e.kind === 'scan' && e.brewId && e.city) {
      if (!scansByBrew.has(e.brewId)) scansByBrew.set(e.brewId, []);
      scansByBrew.get(e.brewId)!.push({ city: e.city, ts: new Date(e.ts).getTime() });
    }
  }

  for (const e of events) {
    if ((e.kind === 'cap' || e.kind === 'rating') && e.brewId && !e.city) {
      const scans = scansByBrew.get(e.brewId);
      if (scans && scans.length > 0) {
        // Find nearest scan
        const ets = new Date(e.ts).getTime();
        let best = scans[0];
        for (const s of scans) {
          if (Math.abs(s.ts - ets) < Math.abs(best.ts - ets)) best = s;
        }
        // Only if within 24h
        if (Math.abs(best.ts - ets) < 24 * 60 * 60 * 1000) {
          e.city = best.city;
        }
      }
    }
  }

  // Group by month
  const monthMap = new Map<string, TimelineEvent[]>();

  for (const e of events) {
    if (!e.ts) continue;
    const d = new Date(e.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(e);
  }

  // Convert to sorted array
  const months: TimelineMonth[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, evts]) => {
      const [yearStr, monthStr] = key.split('-');
      return {
        key,
        label: `${MONTH_NAMES[parseInt(monthStr, 10) - 1]} ${yearStr}`,
        events: evts,
      };
    });

  return months;
}
