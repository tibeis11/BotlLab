'use client';

// ============================================================================
// Phase 13.5 — Seasonality Sparkline
//
// 12-month bar sparkline showing when a brew gets scanned most.
// Tier-gated: brewer+.
// ============================================================================

import React, { useEffect, useState, useTransition } from 'react';
import { getSeasonalityIndex, type SeasonalityResult } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';
import { CalendarDays, Lock, Lightbulb } from 'lucide-react';

interface Props {
  brews: Array<{ id: string; name: string; style: string }>;
  userTier: UserTier;
}

// SVG sparkline bar chart
function Sparkline({ distribution, peakMonth }: Pick<SeasonalityResult, 'distribution' | 'peakMonth'>) {
  const maxScans = Math.max(...distribution.map((d) => d.scans), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-[3px] h-12">
        {distribution.map((d) => {
          const heightPct = d.scans > 0 ? Math.max((d.scans / maxScans) * 100, 8) : 2;
          const isPeak = d.month === peakMonth && d.scans > 0;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div
                className={`w-full rounded-sm transition-all ${isPeak ? 'bg-amber-400' : d.scans > 0 ? 'bg-surface-hover group-hover:bg-border-hover' : 'bg-border'}`}
                style={{ height: `${heightPct}%` }}
              />
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-surface-hover border border-border-hover rounded-lg px-2 py-1 text-[10px] text-text-primary whitespace-nowrap z-10 pointer-events-none flex-col items-center">
                <span className="font-bold">{d.monthName}</span>
                <span className="text-text-secondary">{d.scans} Scans</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Month labels */}
      <div className="flex gap-[3px] mt-1">
        {distribution.map((d) => (
          <div key={d.month} className={`flex-1 text-center text-[8px] ${d.month === peakMonth && d.scans > 0 ? 'text-amber-400 font-bold' : 'text-text-disabled'}`}>
            {d.monthName.slice(0, 1)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct < 15 ? '#10b981' : pct < 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
          <circle cx={24} cy={24} r={18} fill="none" stroke="var(--border)" strokeWidth={7} />
          <circle
            cx={24} cy={24} r={18}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeDasharray={`${pct * 1.131} ${113.1 - pct * 1.131}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black" style={{ color }}>{pct}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-text-primary">
          {pct < 15 ? 'Ganzjährig' : pct < 40 ? 'Leicht saisonal' : 'Stark saisonal'}
        </p>
        <p className="text-[10px] text-text-disabled">Saisonalitäts-Score</p>
      </div>
    </div>
  );
}

export default function SeasonalitySparkline({ brews, userTier }: Props) {
  const [selectedBrewId, setSelectedBrewId] = useState<string>(brews[0]?.id ?? '');
  const [result, setResult] = useState<SeasonalityResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const tierOk = userTier === 'brewer' || userTier === 'brewery' || userTier === 'enterprise';

  useEffect(() => {
    if (!selectedBrewId || !tierOk) return;
    startTransition(async () => {
      const data = await getSeasonalityIndex(selectedBrewId);
      setResult(data);
    });
  }, [selectedBrewId, tierOk]);

  if (!tierOk) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-3">
        <Lock className="mx-auto text-amber-400" size={28} />
        <p className="text-sm font-bold text-text-secondary">Verfügbar ab Brewer-Plan</p>
        <p className="text-xs text-text-muted">Saisonalitäts-Analyse für deine Biere.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={18} className="text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Saisonalitäts-Index</h3>
            <p className="text-xs text-text-muted">Wann wird dein Bier am meisten gescannt?</p>
          </div>
        </div>

        <select
          value={selectedBrewId}
          onChange={(e) => setSelectedBrewId(e.target.value)}
          className="bg-surface-hover border border-border-hover rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-sky-500/50 max-w-[160px]"
        >
          {brews.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {isPending && (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!isPending && result && (
        <>
          {result.hasEnoughData ? (
            <>
              {/* Score + Sparkline */}
              <div className="space-y-4">
                <ScoreGauge score={result.seasonalityScore} />
                <Sparkline distribution={result.distribution} peakMonth={result.peakMonth} />
              </div>

              {/* Insight */}
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex gap-2">
                <Lightbulb size={13} className="text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-sky-200/80">{result.insight}</p>
              </div>

              {/* Peak info */}
              <div className="flex gap-3 text-center">
                <div className="flex-1 bg-surface-hover/50 rounded-xl p-3">
                  <p className="text-base font-black text-amber-400">{result.peakMonthName}</p>
                  <p className="text-[10px] text-text-disabled mt-0.5">Peak-Monat</p>
                </div>
                <div className="flex-1 bg-surface-hover/50 rounded-xl p-3">
                  <p className="text-base font-black text-text-primary">{Math.round(result.seasonalityScore * 100)}</p>
                  <p className="text-[10px] text-text-disabled mt-0.5">Score (0–100)</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-2">
              <CalendarDays size={28} className="mx-auto text-text-disabled" />
              <p className="text-xs text-text-muted">{result.insight}</p>
              <p className="text-[10px] text-text-disabled">Mindestens 10 Scans über mehrere Monate erforderlich.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
