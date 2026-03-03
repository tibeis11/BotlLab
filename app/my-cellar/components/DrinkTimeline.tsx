// ZWEI WELTEN Phase 4.4 — "Meine Reise" Timeline Component
// Renders a visual timeline of caps, ratings, and scans grouped by month

import Link from 'next/link';
import { Beer, Star, ScanLine, MapPin } from 'lucide-react';
import type { TimelineMonth, TimelineEvent } from '@/lib/timeline-types';

const KIND_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  cap: { icon: Beer, color: 'text-cyan-500', label: 'Kronkorken' },
  rating: { icon: Star, color: 'text-amber-500', label: 'Bewertung' },
  scan: { icon: ScanLine, color: 'text-emerald-500', label: 'Scan' },
};

export default function DrinkTimeline({ months }: { months: TimelineMonth[] }) {
  if (months.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center">
        <Beer className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-400">Noch keine Reise-Einträge</p>
        <p className="text-xs text-zinc-600 mt-1">
          Scanne Kronkorken oder bewerte Biere, um deine Reise zu starten!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {months.map((month) => (
        <div key={month.key}>
          {/* Month header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
              {month.label}
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Events */}
          <div className="relative pl-6 space-y-1">
            {/* Vertical line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-zinc-800" />

            {month.events.map((event) => (
              <TimelineRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const config = KIND_CONFIG[event.kind] ?? KIND_CONFIG.cap;
  const Icon = config.icon;

  const content = (
    <div className="group flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-zinc-900/60 transition-colors relative">
      {/* Dot on the timeline */}
      <div className={`absolute -left-6 top-3.5 w-[7px] h-[7px] rounded-full border-2 border-zinc-800 ${
        event.kind === 'cap' ? 'bg-cyan-500' :
        event.kind === 'rating' ? 'bg-amber-500' :
        'bg-emerald-500'
      }`} />

      {/* Icon */}
      <div className={`w-7 h-7 rounded-lg bg-zinc-800/80 flex items-center justify-center flex-shrink-0 ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition truncate">
            {event.brewName || 'Unbekanntes Bier'}
          </span>

          {/* Star rating */}
          {event.kind === 'rating' && event.rating !== null && (
            <span className="text-amber-400 text-[11px] font-bold flex items-center gap-0.5">
              {'★'.repeat(Math.round(event.rating))}
              <span className="text-zinc-500 ml-1">{event.rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {event.breweryName && (
            <span className="text-[11px] text-zinc-500">{event.breweryName}</span>
          )}
          {event.city && (
            <span className="text-[11px] text-zinc-600 flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {event.city}
            </span>
          )}
        </div>

        {/* Comment preview for ratings */}
        {event.kind === 'rating' && event.comment && (
          <p className="text-[11px] text-zinc-600 mt-1 line-clamp-1 italic">
            &ldquo;{event.comment}&rdquo;
          </p>
        )}
      </div>

      {/* Date */}
      <span className="text-[10px] text-zinc-600 flex-shrink-0 mt-1 tabular-nums">
        {new Date(event.ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
      </span>
    </div>
  );

  if (event.brewId) {
    return (
      <Link href={`/brew/${event.brewId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
