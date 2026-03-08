'use client';

// ============================================================================
// Phase 14.3 — Style Seasonality (Platform-wide)
// Zeigt die Saisonalität eines Bierstils plattformweit + Release-Empfehlung.
// Tier-gated: brewery+
// ============================================================================

import React, { useState, useTransition } from 'react';
import { getStyleSeasonality, type StyleSeasonalityResult, type MonthlyDistribution } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';
import { CalendarDays, Lock, Rocket, Search } from 'lucide-react';

const TIER_ORDER: UserTier[] = ['free', 'brewer', 'brewery', 'enterprise'];
function tierAtLeast(userTier: UserTier, required: UserTier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required);
}

// Popular style suggestions
const STYLE_SUGGESTIONS = [
  'IPA', 'Pale Ale', 'Stout', 'Porter', 'Weizen', 'Pilsner', 'Sour Ale', 'Lager', 'Märzen', 'Bock',
];

// Bar chart for all 12 months
function StyleBars({ distribution, peakMonth }: { distribution: MonthlyDistribution[]; peakMonth: number }) {
  const maxPct = Math.max(...distribution.map((d) => d.percentage), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {distribution.map((d) => {
        const isPeak = d.month === peakMonth;
        const height = Math.round((d.percentage / maxPct) * 100);
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="bg-surface border border-border-hover rounded px-2 py-1 text-[10px] text-text-primary whitespace-nowrap shadow-lg">
                {d.monthName}: {d.percentage}%
              </div>
            </div>
            <div
              className={`w-full rounded-sm transition-all ${isPeak ? 'bg-amber-400' : 'bg-surface-hover'}`}
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <span className={`text-[8px] ${isPeak ? 'text-amber-400 font-bold' : 'text-text-disabled'}`}>
              {d.monthName.slice(0, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  userTier: UserTier;
}

export default function StyleSeasonalityCard({ userTier }: Props) {
  const [query, setQuery]         = useState('');
  const [result, setResult]       = useState<StyleSeasonalityResult | null>(null);
  const [pending, startTrans]     = useTransition();
  const [searched, setSearched]   = useState(false);

  const canAccess = tierAtLeast(userTier, 'brewery');

  function search(style: string) {
    if (!style.trim()) return;
    setQuery(style);
    setSearched(true);
    startTrans(async () => {
      const data = await getStyleSeasonality(style.trim());
      setResult(data);
    });
  }

  // ── Tier gate ──────────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-surface-hover rounded-lg">
            <CalendarDays className="w-5 h-5 text-text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Saisonale Stilnachfrage</h3>
            <p className="text-xs text-text-muted">Plattformweite Release-Timing-Empfehlung</p>
          </div>
          <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
            Brewery+
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Lock className="w-8 h-8 text-violet-400" />
          <p className="text-sm text-text-secondary text-center max-w-xs">
            Verfügbar ab <strong className="text-text-primary">Brewery-Plan</strong>. Optimales Release-Timing für jeden Bierstil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <CalendarDays className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">Saisonale Stilnachfrage</h3>
          <p className="text-xs text-text-muted">Plattformweite Scan-Verteilung je Bierstil</p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(query)}
          placeholder="Bierstil eingeben, z.B. IPA…"
          className="w-full bg-surface-hover border border-border-hover text-text-primary text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-amber-500/50 placeholder:text-text-disabled"
        />
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {STYLE_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => search(s)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              query === s
                ? 'bg-warning-bg border-warning/30 text-warning'
                : 'bg-surface-hover border-border-hover text-text-secondary hover:text-text-primary hover:border-border-hover'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search button */}
      <button
        onClick={() => search(query)}
        disabled={pending || !query.trim()}
        className="w-full mb-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {pending ? <span className="animate-spin">↻</span> : <Search className="w-4 h-4" />}
        Saisonalität analysieren
      </button>

      {/* Loading skeleton */}
      {pending && (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-surface-hover rounded" />
          <div className="h-12 bg-surface-hover rounded" />
        </div>
      )}

      {/* Results */}
      {!pending && searched && result && (
        <div className="space-y-4">
          {!result.hasEnoughData ? (
            <p className="text-sm text-text-secondary text-center py-4">{result.releaseRecommendation}</p>
          ) : (
            <>
              {/* Bar chart */}
              <StyleBars distribution={result.distribution} peakMonth={result.peakMonth} />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-border/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-text-muted mb-1">Peak-Monat</p>
                  <p className="text-sm font-semibold text-amber-400">{result.peakMonthName}</p>
                </div>
                <div className="bg-border/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-text-muted mb-1">Peak-Anteil</p>
                  <p className="text-sm font-bold text-text-primary">
                    {result.distribution.find((d) => d.month === result.peakMonth)?.percentage ?? 0}%
                  </p>
                </div>
                <div className="bg-border/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-text-muted mb-1">Scans gesamt</p>
                  <p className="text-sm font-bold text-text-primary">{result.totalScans.toLocaleString('de-DE')}</p>
                </div>
              </div>

              {/* Release recommendation */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                <Rocket className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">{result.releaseRecommendation}</p>
              </div>
            </>
          )}
        </div>
      )}

      {!pending && !searched && (
        <p className="text-xs text-text-disabled text-center py-4">
          Gib einen Bierstil ein, um das optimale Release-Fenster zu ermitteln.
        </p>
      )}
    </div>
  );
}
