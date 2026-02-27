'use client';

import { QrCode } from 'lucide-react';
import TasteRadarChart from './TasteRadarChart';
import FlavorTagCloud from './FlavorTagCloud';
import type { TasteProfile, FlavorDistribution } from '@/lib/rating-analytics';

interface Rating {
  id: string;
  rating: number;
  comment?: string | null;
  author_name?: string | null;
  created_at: string;
  qr_verified?: boolean;
}

interface BrewRatingsTabProps {
  ratings: Rating[];
  tasteProfile: TasteProfile | null;
  flavorTags: FlavorDistribution[];
  avgRating: number;
}

function StarRow({ filled, dim }: { filled: boolean; dim?: boolean }) {
  return (
    <span className={`text-sm leading-none ${filled ? 'text-amber-400' : 'text-zinc-700'} ${dim ? 'opacity-40' : ''}`}>★</span>
  );
}

function RatingHistogram({ ratings }: { ratings: Rating[] }) {
  if (!ratings.length) return null;

  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => Math.round(r.rating) === star).length,
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="flex flex-col gap-1.5">
      {counts.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-3 group">
          <div className="flex gap-0.5 w-14 justify-end">
            {[1,2,3,4,5].map(s => <StarRow key={s} filled={s <= star} dim={s > star} />)}
          </div>
          <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500/80 rounded-full transition-all duration-500 group-hover:bg-amber-400"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-600 w-6 text-right font-mono">{count}</span>
        </div>
      ))}
    </div>
  );
}

function QRCta() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-10 px-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <QrCode className="w-7 h-7 text-cyan-500" />
      </div>
      <div>
        <p className="text-white font-bold text-base">Flasche probiert?</p>
        <p className="text-zinc-500 text-sm mt-1 max-w-xs">
          Scan den QR-Code auf dem Etikett, um eine verifizierte Bewertung abzugeben.
        </p>
      </div>
      <p className="text-[10px] text-zinc-700 uppercase tracking-wider font-bold">
        Alle Bewertungen auf BotlLab sind durch QR-Code verifiziert
      </p>
    </div>
  );
}

function RatingCard({ rating }: { rating: Rating }) {
  return (
    <div className="flex gap-4 py-5 border-b border-zinc-800/50 last:border-0">
      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-xs text-zinc-400 shrink-0">
        {(rating.author_name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white leading-tight">{rating.author_name || 'Gast'}</p>
                {rating.qr_verified && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-1.5 py-0.5">
                    ✓ QR
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {new Date(rating.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          <div className="flex gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className={`text-sm ${rating.rating >= s ? 'text-amber-400' : 'text-zinc-800'}`}>★</span>
            ))}
          </div>
        </div>
        {rating.comment && (
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed font-medium">{rating.comment}</p>
        )}
      </div>
    </div>
  );
}

export default function BrewRatingsTab({ ratings, tasteProfile, flavorTags, avgRating }: BrewRatingsTabProps) {

  const hasRatings = ratings.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

      {/* Score summary */}
      {hasRatings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          {/* Average score */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-6xl font-black text-white tabular-nums leading-none">{avgRating.toFixed(1)}</p>
              <div className="flex gap-0.5 justify-center mt-1.5">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`text-base ${avgRating >= s ? 'text-amber-400' : avgRating >= s - 0.5 ? 'text-amber-400/50' : 'text-zinc-800'}`}>★</span>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-1.5 font-bold uppercase tracking-wider">
                {ratings.length} Bewertung{ratings.length !== 1 ? 'en' : ''}
              </p>
            </div>
            <div className="flex-1">
              <RatingHistogram ratings={ratings} />
            </div>
          </div>

          {/* QR CTA */}
          <div className="border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/50">
            <QRCta />
          </div>
        </div>
      )}

      {/* Taste profile analytics */}
      {tasteProfile && tasteProfile.count > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Geschmacksprofil</h3>
            <div className="h-px bg-zinc-800 flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center py-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Radar</p>
              <TasteRadarChart profile={tasteProfile} />
            </div>
            <div className="flex flex-col py-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 text-center">Häufigste Attribute</p>
              <FlavorTagCloud tags={flavorTags} />
            </div>
          </div>
        </div>
      )}

      {/* Ratings list or empty state */}
      {hasRatings ? (
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Bewertungen</h3>
            <div className="h-px bg-zinc-800 flex-1" />
          </div>
          <div>
            {ratings.map(r => <RatingCard key={r.id} rating={r} />)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <div className="text-4xl opacity-30">★</div>
          <p className="text-zinc-500 font-medium">Noch keine Bewertungen</p>
          <div className="border border-dashed border-zinc-800 rounded-2xl w-full max-w-sm bg-zinc-950/50">
            <QRCta />
          </div>
        </div>
      )}
    </div>
  );
}
