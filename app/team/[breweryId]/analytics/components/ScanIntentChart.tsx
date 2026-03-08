'use client';

import { useEffect, useState } from 'react';
import { Lock, Brain, Info, Users, CheckCircle2, BarChart3 } from 'lucide-react';
import { getScanIntentBreakdown, type IntentBreakdownResult } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface ScanIntentChartProps {
  breweryId: string;
  userTier?: UserTier;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Intent colour map
// ============================================================================

const INTENT_COLORS: Record<string, { bar: string; text: string }> = {
  single:            { bar: 'bg-cyan-600',    text: 'text-cyan-400' },
  browse:            { bar: 'bg-surface-hover',    text: 'text-text-secondary' },
  collection_browse: { bar: 'bg-surface-hover',    text: 'text-text-muted' },
  repeat:            { bar: 'bg-emerald-600', text: 'text-emerald-400' },
  social_discovery:  { bar: 'bg-violet-600',  text: 'text-violet-400' },
  event:             { bar: 'bg-amber-600',   text: 'text-amber-400' },
  confirmed:         { bar: 'bg-green-500',   text: 'text-green-400' },
};

const DEFAULT_COLOR = { bar: 'bg-surface-hover', text: 'text-text-secondary' };

// ============================================================================
// Skeleton
// ============================================================================

function SkeletonRows() {
  return (
    <div className="space-y-3 animate-pulse">
      {[80, 55, 30, 20, 12].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-4 h-4 bg-surface-hover rounded" />
          <div className="flex-1">
            <div className="h-1.5 bg-surface-hover rounded-full" style={{ width: `${w}%` }} />
          </div>
          <div className="w-12 h-4 bg-surface-hover rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function ScanIntentChart({
  breweryId,
  userTier = 'free',
  startDate,
  endDate,
}: ScanIntentChartProps) {
  const [data, setData]       = useState<IntentBreakdownResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const isLocked = userTier === 'free' || userTier === 'brewer';

  useEffect(() => {
    if (isLocked) { setLoading(false); return; }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getScanIntentBreakdown(breweryId, { startDate, endDate });
        if (cancelled) return;
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error ?? 'Fehler beim Laden');
        }
      } catch {
        if (!cancelled) setError('Fehler beim Laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [breweryId, isLocked, startDate, endDate]);

  // ── Locked State ──────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[2px] bg-surface/60 z-10 flex flex-col items-center justify-center gap-2">
          <Lock size={20} className="text-violet-400" />
          <p className="text-sm font-bold text-text-secondary">Verfügbar ab Brewery-Plan</p>
          <p className="text-xs text-text-muted">Erfahre, was hinter deinen Scans steckt</p>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Brain size={16} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-secondary">Scan-Qualität</h3>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-secondary">Scan-Qualität</h3>
        </div>
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  // ── Empty State ───────────────────────────────────────────────────────────
  if (!data || data.intents.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-secondary">Scan-Qualität</h3>
        </div>
        <p className="text-xs text-text-disabled">Noch keine klassifizierten Scans vorhanden</p>
      </div>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────
  const maxCount = data.intents[0]?.count ?? 1;

  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-cyan-500" />
          <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">
            Scan-Qualität: Was steckt hinter den Scans?
          </h3>
        </div>
        <div className="group relative">
          <Info size={14} className="text-text-disabled hover:text-text-secondary cursor-help transition-colors" />
          <div className="absolute right-0 top-6 w-64 p-3 bg-surface border border-border-hover rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
            <p className="text-[10px] text-text-secondary leading-relaxed">
              Unser ML-Modell klassifiziert jeden Scan nach seiner Absicht.
              &quot;Einzelscans&quot; sind wahrscheinlich echte Trinker, während
              &quot;Browse&quot; eher Neugierige im Kühlschrank sind.
            </p>
          </div>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {data.intents.map((item) => {
          const colors = INTENT_COLORS[item.intent] ?? DEFAULT_COLOR;
          const barWidthPct = Math.max((item.count / maxCount) * 100, 4);

          return (
            <div key={item.intent} className="group">
              <div className="flex items-center gap-3">
                <span className="text-sm w-5 text-center flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-bold truncate pr-2 ${colors.text}`}>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-text-muted">{item.percentage}%</span>
                      <span className="text-text-disabled font-mono text-[10px]">({item.count})</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-border mt-6 pt-4">
        {/* Metrics Footer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Raw Scans */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 size={12} className="text-text-muted" />
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Rohe Scans</span>
            </div>
            <p className="text-lg font-mono font-bold text-text-primary">
              {data.totalScans.toLocaleString('de-DE')}
            </p>
          </div>

          {/* Estimated Drinkers */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users size={12} className="text-cyan-500" />
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Geschätzte Trinker</span>
            </div>
            <p className="text-lg font-mono font-bold text-cyan-400">
              ~{Math.round(data.weightedDrinkerEstimate).toLocaleString('de-DE')}
            </p>
            <p className="text-[10px] text-text-disabled">
              {data.totalScans > 0
                ? `${Math.round((data.weightedDrinkerEstimate / data.totalScans) * 100)}%`
                : '—'}
            </p>
          </div>

          {/* Confirmed Drinkers */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Bestätigt</span>
            </div>
            <p className="text-lg font-mono font-bold text-emerald-400">
              {data.confirmedDrinkers.toLocaleString('de-DE')}
            </p>
            <p className="text-[10px] text-text-disabled">
              {data.totalScans > 0
                ? `${((data.confirmedDrinkers / data.totalScans) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </div>

          {/* Model Accuracy */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Brain size={12} className="text-violet-500" />
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Modell-Genauigkeit</span>
            </div>
            {data.modelAccuracy !== null ? (
              <>
                <p className="text-lg font-mono font-bold text-violet-400">
                  {Math.round(data.modelAccuracy * 100)}%
                </p>
                <p className="text-[10px] text-text-disabled">basierend auf Feedback</p>
              </>
            ) : (
              <p className="text-xs text-text-disabled mt-1">Noch nicht genug Daten</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
