'use client';

// ============================================================================
// Phase 14.1 — Local Trend Radar
// Regionale Nachfrage-Analyse im Umkreis der Brauerei.
// Tier-gated: brewery+
// ============================================================================

import React, { useEffect, useState, useTransition } from 'react';
import { getLocalTrendRadar, type LocalTrend, type LocalTrendRadarResult } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';
import { Radar, Lock, TrendingUp, TrendingDown, Minus, Lightbulb, RefreshCw } from 'lucide-react';

const TIER_ORDER: UserTier[] = ['free', 'brewer', 'brewery', 'enterprise'];
function tierAtLeast(userTier: UserTier, required: UserTier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required);
}

const OPPORTUNITY_CONFIG = {
  high:   { label: 'Hohe Chance', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  medium: { label: 'Mittlere Chance', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  low:    { label: 'Gesättigt', color: 'text-text-secondary', bg: 'bg-surface-hover border-border-hover' },
};

function TrendRow({ trend }: { trend: LocalTrend }) {
  const opp    = OPPORTUNITY_CONFIG[trend.opportunity];
  const isUp   = trend.scanChangePercent > 0;
  const isFlat = trend.scanChangePercent === 0;
  const Icon   = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const changeColor = isUp ? 'text-emerald-400' : isFlat ? 'text-text-secondary' : 'text-red-400';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${opp.bg}`}>
      {/* Style name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary truncate">{trend.style}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {trend.competitorCount} Brauereien im Radius · Ø {trend.avgRatingInRadius > 0 ? `${trend.avgRatingInRadius} ★` : '–'}
        </p>
      </div>

      {/* Change % */}
      <div className={`flex items-center gap-1 text-sm font-semibold ${changeColor}`}>
        <Icon className="w-4 h-4" />
        {isFlat ? '±0%' : `${isUp ? '+' : ''}${trend.scanChangePercent}%`}
      </div>

      {/* Opportunity badge */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${opp.bg} ${opp.color} whitespace-nowrap`}>
        {opp.label}
      </span>
    </div>
  );
}

interface Props {
  breweryId: string;
  userTier: UserTier;
}

export default function LocalTrendRadarCard({ breweryId, userTier }: Props) {
  const [result, setResult]   = useState<LocalTrendRadarResult | null>(null);
  const [radius, setRadius]   = useState(50);
  const [pending, startTrans] = useTransition();
  const [loaded, setLoaded]   = useState(false);

  const canAccess = tierAtLeast(userTier, 'brewery');

  function load(r: number) {
    startTrans(async () => {
      const data = await getLocalTrendRadar(breweryId, r);
      setResult(data);
      setLoaded(true);
    });
  }

  useEffect(() => {
    if (canAccess) load(radius);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breweryId, canAccess]);

  // ── Tier gate ──────────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-surface-hover rounded-lg">
            <Radar className="w-5 h-5 text-text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Local Trend Radar</h3>
            <p className="text-xs text-text-muted">Regionale Nachfrage im Umkreis</p>
          </div>
          <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
            Brewery+
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Lock className="w-8 h-8 text-violet-400" />
          <p className="text-sm text-text-secondary text-center max-w-xs">
            Verfügbar ab <strong className="text-text-primary">Brewery-Plan</strong>. Regionale Stiltrends und Marktlücken in deinem Umkreis.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!loaded || pending) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-surface-hover rounded w-48 mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-surface-hover rounded-lg" />)}
        </div>
      </div>
    );
  }

  const trends = result?.trends ?? [];

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Radar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Local Trend Radar</h3>
            <p className="text-xs text-text-muted">Bierstil-Nachfrage im {result?.radiusKm ?? radius}-km-Radius</p>
          </div>
        </div>
        {/* Radius picker */}
        <div className="flex items-center gap-2">
          <select
            value={radius}
            onChange={(e) => { const r = Number(e.target.value); setRadius(r); load(r); }}
            className="text-xs bg-surface-hover border border-border-hover text-text-secondary rounded-lg px-2 py-1 focus:outline-none"
          >
            {[25, 50, 100, 200].map((r) => <option key={r} value={r}>{r} km</option>)}
          </select>
          <button
            onClick={() => load(radius)}
            disabled={pending}
            className="p-1.5 rounded-lg bg-surface-hover border border-border-hover text-text-secondary hover:text-text-primary disabled:opacity-50"
            title="Neu laden"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Insight banner */}
      {result?.insight && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 mb-4">
          <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">{result.insight}</p>
        </div>
      )}

      {/* No data */}
      {!result?.hasEnoughData && (
        <div className="text-center py-8">
          <p className="text-sm text-text-secondary">{result?.insight ?? 'Keine Daten verfügbar.'}</p>
        </div>
      )}

      {/* Trend rows */}
      {result?.hasEnoughData && trends.length === 0 && (
        <p className="text-sm text-text-secondary text-center py-6">Keine Stile mit ausreichend Daten (mind. 3 Brauereien).</p>
      )}
      {result?.hasEnoughData && trends.length > 0 && (
        <div className="space-y-2">
          {trends.map((trend) => <TrendRow key={trend.style} trend={trend} />)}
        </div>
      )}

      {/* Legend */}
      {result?.hasEnoughData && result.periodDays && (
        <p className="text-xs text-text-disabled mt-3 text-right">
          Vergleich: letzte 60 Tage vs. 60 Tage davor · Plattformweit anonymisiert
        </p>
      )}
    </div>
  );
}
