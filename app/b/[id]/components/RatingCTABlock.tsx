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
import { QrCode } from 'lucide-react';

import { type CapTier } from '@/lib/cap-tier';

interface RatingCTABlockProps {
  avgRating: number;
  ratingCount: number;
  hasAlreadyRated: boolean;
  capCollected: boolean;
  capTier?: CapTier;
  collectingCap: boolean;
  capUrl?: string | null;
  isQrVerified: boolean;
  onRate: () => void;
  onClaim: () => void;
}

export default function RatingCTABlock({
  avgRating,
  ratingCount,
  hasAlreadyRated,
  capCollected,
  capTier,
  collectingCap,
  capUrl,
  isQrVerified,
  onRate,
  onClaim,
}: RatingCTABlockProps) {
  return (
    <div
      className={`bg-surface border rounded-2xl p-5 transition-all duration-500 ${
        capCollected ? 'border-brand/40' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-4">
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
            tier={capCollected ? (capTier ?? 'zinc') : 'silver'}
            size="sm"
          />
        </div>

        {/* Rating-Info + CTA stacked */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            {avgRating > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-brand">{avgRating}</span>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-xs ${star <= Math.round(avgRating) ? 'text-amber-400' : 'text-text-disabled'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {ratingCount} {ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Noch keine Bewertungen</p>
            )}

            {capCollected && (
              <p className="text-[10px] text-brand font-black uppercase tracking-wider mt-1">
                ✓ Kronkorken gesammelt
              </p>
            )}
          </div>

          {/* State-abhängiger CTA — volle Breite auf Mobile */}
          {capCollected ? (
            <Link
              href="/dashboard/collection"
              className="inline-flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand border border-brand-dim rounded-xl px-3 py-2 hover:bg-brand-bg/20 transition w-full sm:w-auto"
            >
              ✨ Ansehen
            </Link>
          ) : hasAlreadyRated ? (
            <button
              onClick={onClaim}
              disabled={collectingCap}
              className="inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover active:scale-95 text-black font-black text-xs rounded-xl px-4 py-2.5 transition-all disabled:opacity-50 w-full sm:w-auto"
            >
              {collectingCap ? (
                <span className="animate-spin inline-block">🧪</span>
              ) : (
                '🥇 Kronkorken sichern'
              )}
            </button>
          ) : isQrVerified ? (
            <button
              onClick={onRate}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-brand-hover active:scale-95 text-black font-black text-xs rounded-xl px-4 py-2.5 transition-all w-full sm:w-auto"
            >
              💬 Bewerten
            </button>
          ) : (
            <p className="text-[10px] text-text-disabled flex items-center gap-1.5">
              <QrCode className="w-3 h-3 shrink-0" />
              QR-Code scannen um zu bewerten
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
