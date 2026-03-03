// ZWEI WELTEN Phase 4.4 — Shared types + client-side builder for the timeline

export type TimelineEventKind = 'cap' | 'rating' | 'scan';

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  ts: string;
  brewName: string | null;
  brewId: string | null;
  breweryName: string | null;
  city: string | null;
  rating: number | null;
  comment: string | null;
}

export interface TimelineMonth {
  key: string;
  label: string;
  events: TimelineEvent[];
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/**
 * Client-side timeline builder — transforms caps + ratings arrays
 * into grouped TimelineMonth[] for the DrinkTimeline component.
 */
export function buildTimelineFromData(
  caps: any[],
  ratings: any[]
): TimelineMonth[] {
  const events: TimelineEvent[] = [];

  for (const cap of caps) {
    const brew = cap.brews as any;
    const brewery = brew?.breweries as any;
    events.push({
      id: `cap-${cap.id}`,
      kind: 'cap',
      ts: cap.collected_at ?? '',
      brewName: brew?.name ?? null,
      brewId: cap.brew_id ?? null,
      breweryName: brewery?.name ?? null,
      city: null,
      rating: null,
      comment: null,
    });
  }

  for (const r of ratings) {
    const brew = r.brews as any;
    const brewery = brew?.breweries as any;
    events.push({
      id: `rating-${r.id}`,
      kind: 'rating',
      ts: r.created_at,
      brewName: brew?.name ?? null,
      brewId: r.brew_id ?? null,
      breweryName: brewery?.name ?? null,
      city: null,
      rating: r.rating ?? null,
      comment: r.comment ?? null,
    });
  }

  // Sort DESC
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  // Group by month
  const monthMap = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    if (!e.ts) continue;
    const d = new Date(e.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(e);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, evts]) => {
      const [yearStr, monthStr] = key.split('-');
      return {
        key,
        label: `${MONTH_NAMES[parseInt(monthStr, 10) - 1]} ${yearStr}`,
        events: evts,
      };
    });
}
