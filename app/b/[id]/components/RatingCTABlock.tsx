'use client';

// ============================================================================
// Phase 2.2 — Kompakter Rating + Cap CTA-Block
//
// Zeigt Ø-Bewertung, Anzahl Ratings und einen state-abhängigen CTA-Button.
// Ersetzt den alten gigantischen floating-Cap-Block.
// Platzierung: direkt nach VibeCheck, vor den Details (above fold on mobile).
// ============================================================================

import Link from 'next/link';
import CrownCap from '@/app/components/CrownCap';

interface RatingCTABlockProps {
  avgRating: number;
  ratingCount: number;
  hasAlreadyRated: boolean;
  capCollected: boolean;
  collectingCap: boolean;
  capUrl?: string | null;
  onRate: () => void;
  onClaim: () => void;
}

export default function RatingCTABlock({
  avgRating,
  ratingCount,
  hasAlreadyRated,
  capCollected,
  collectingCap,
  capUrl,
  onRate,
  onClaim,
}: RatingCTABlockProps) {
  return (
    <div
      className={`bg-zinc-900 border rounded-2xl p-5 transition-all duration-500 ${
        capCollected ? 'border-cyan-700/40' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* CrownCap — klein & inline statt floating hero */}
        <div
          className={`shrink-0 transition-all duration-700 ${
            capCollected
              ? 'scale-110 drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]'
              : 'grayscale opacity-50'
          }`}
        >
          <CrownCap
            content={capUrl}
            tier={capCollected ? 'gold' : 'zinc'}
            size="sm"
          />
        </div>

        {/* Rating-Info */}
        <div className="flex-1 min-w-0">
          {avgRating > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-cyan-500">{avgRating}</span>
              <div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-xs ${star <= Math.round(avgRating) ? 'text-yellow-500' : 'text-zinc-700'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {ratingCount} {ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Noch keine Bewertungen</p>
          )}

          {capCollected && (
            <p className="text-[10px] text-cyan-500 font-black uppercase tracking-wider mt-1">
              ✓ Kronkorken gesammelt
            </p>
          )}
        </div>

        {/* State-abhängiger CTA */}
        <div className="shrink-0">
          {capCollected ? (
            <Link
              href="/dashboard/collection"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400 border border-cyan-800 rounded-xl px-3 py-2 hover:bg-cyan-900/20 transition whitespace-nowrap"
            >
              ✨ Ansehen
            </Link>
          ) : hasAlreadyRated ? (
            <button
              onClick={onClaim}
              disabled={collectingCap}
              className="inline-flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-black text-xs rounded-xl px-4 py-2.5 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {collectingCap ? (
                <span className="animate-spin inline-block">🧪</span>
              ) : (
                '🥇 Kronkorken sichern'
              )}
            </button>
          ) : (
            <button
              onClick={onRate}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-cyan-400 active:scale-95 text-black font-black text-xs rounded-xl px-4 py-2.5 transition-all whitespace-nowrap"
            >
              💬 Bewerten
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
