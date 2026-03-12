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
import { QrCode, MessageCircle, Trophy, Sparkles } from 'lucide-react';

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
      className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-500 ${
        capCollected ? 'border-brand/40' : 'border-border'
      }`}
    >
      {/* Oberer Bereich: Rating-Info + CrownCap */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          {avgRating > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-text">{avgRating}</span>
                <div className="flex gap-0.5 pb-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-sm ${star <= Math.round(avgRating) ? 'text-amber-400' : 'text-border'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-text-muted">
                {ratingCount} {ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-text">Noch keine Bewertungen</p>
              <p className="text-xs text-text-muted mt-0.5">Sei der Erste!</p>
            </div>
          )}
        </div>

        {/* CrownCap als Dekoelement rechts */}
        <div
          className={`shrink-0 transition-all duration-700 ${
            capCollected
              ? 'drop-shadow-[0_0_10px_rgba(6,182,212,0.45)]'
              : 'grayscale opacity-35'
          }`}
        >
          <CrownCap
            content={capUrl}
            tier={capCollected ? (capTier ?? 'zinc') : 'silver'}
            size="sm"
          />
        </div>
      </div>

      {/* Unterer Bereich: CTA-Leiste */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between">
        {capCollected ? (
          <>
            <p className="text-xs text-brand font-bold uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Kronkorken gesammelt</p>
            <Link
              href="/dashboard/collection"
              className="text-xs font-bold text-brand hover:text-brand-hover transition underline underline-offset-2"
            >
              Ansehen
            </Link>
          </>
        ) : hasAlreadyRated ? (
          <button
            onClick={onClaim}
            disabled={collectingCap}
            className="flex items-center gap-2 text-sm font-bold text-text hover:text-brand transition-colors disabled:opacity-50"
          >
            <span className="w-8 h-8 rounded-xl bg-surface-raised flex items-center justify-center shrink-0">
              {collectingCap ? <span className="animate-spin inline-block"><Trophy className="w-4 h-4 text-text-muted" /></span> : <Trophy className="w-4 h-4 text-amber-400" />}
            </span>
            Kronkorken sichern
          </button>
        ) : isQrVerified ? (
          <button
            onClick={onRate}
            className="flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-hover transition-colors"
          >
            <span className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-brand" />
            </span>
            Jetzt bewerten
          </button>
        ) : (
          <p className="text-xs text-text-disabled flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            QR-Code scannen um zu bewerten
          </p>
        )}
      </div>
    </div>
  );
}
