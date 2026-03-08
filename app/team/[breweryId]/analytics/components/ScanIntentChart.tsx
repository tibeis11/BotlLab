'use client';

import { useEffect, useState } from 'react';
import {
  Lock, Brain, Info, Users, CheckCircle2, BarChart3,
  Smartphone, Search, Archive, Layers, Link, RefreshCw, CalendarDays, Share2, LucideIcon,
} from 'lucide-react';
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
// Intent icon map (Lucide)
// ============================================================================

const INTENT_ICONS: Record<string, LucideIcon> = {
  single:            Smartphone,
  browse:            Search,
  collection_browse: Archive,
  fridge_surf:       Layers,
  non_qr:            Link,
  repeat:            RefreshCw,
  event:             CalendarDays,
  social_discovery:  Share2,
  confirmed:         CheckCircle2,
};

const DEFAULT_ICON = Brain;

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
          const IntentIcon = INTENT_ICONS[item.intent] ?? DEFAULT_ICON;

          return (
            <div key={item.intent} className="group">
              <div className="flex items-center gap-3">
                <IntentIcon size={14} className={`shrink-0 ${colors.text}`} />
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

      {/* Footer */}
      <div className="border-t border-zinc-800/50 mt-6 pt-5 space-y-5">

        {/* Modell-Confidence */}
        {(() => {
          const estimated = data.weightedDrinkerEstimate;
          const confirmed = data.confirmedDrinkers;
          if (estimated <= 0) return null;

          const confidence = Math.min(confirmed / estimated, 1.0);
          const pct = Math.round(confidence * 100);

          const [label, valueColor, trackColor] =
            pct >= 50
              ? ['Gut kalibriert',       'text-emerald-400', 'bg-emerald-500']
              : pct >= 20
              ? ['Wenig Beweise',         'text-amber-400',   'bg-amber-500']
              : ['Mehr Feedback nötig',   'text-red-400',     'bg-red-500'];

          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Modell-Confidence
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${valueColor}`}>
                  {pct}% — {label}
                </span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${trackColor} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">
                {confirmed} bestätigte Trinker · ~{Math.round(estimated)} geschätzt
              </p>
            </div>
          );
        })()}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800/50 rounded-xl overflow-hidden">
          {/* Rohe Scans */}
          <div className="bg-zinc-900 px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <BarChart3 size={11} className="text-zinc-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scans</span>
            </div>
            <p className="text-xl font-black font-mono tabular-nums text-white">
              {data.totalScans.toLocaleString('de-DE')}
            </p>
          </div>

          {/* Geschätzte Trinker */}
          <div className="bg-zinc-900 px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Users size={11} className="text-cyan-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Geschätzt</span>
            </div>
            <p className="text-xl font-black font-mono tabular-nums text-cyan-400">
              ~{Math.round(data.weightedDrinkerEstimate).toLocaleString('de-DE')}
            </p>
            <p className="text-[10px] text-zinc-600">
              {data.totalScans > 0
                ? `${Math.round((data.weightedDrinkerEstimate / data.totalScans) * 100)}% der Scans`
                : '—'}
            </p>
          </div>

          {/* Bestätigt */}
          <div className="bg-zinc-900 px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bestätigt</span>
            </div>
            <p className="text-xl font-black font-mono tabular-nums text-emerald-400">
              {data.confirmedDrinkers.toLocaleString('de-DE')}
            </p>
            <p className="text-[10px] text-zinc-600">
              {data.totalScans > 0
                ? `${((data.confirmedDrinkers / data.totalScans) * 100).toFixed(1)}% Confirmed-Rate`
                : '—'}
            </p>
          </div>

          {/* Modell-Genauigkeit */}
          <div className="bg-zinc-900 px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Brain size={11} className="text-violet-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Modell</span>
            </div>
            {data.modelAccuracy !== null ? (
              <>
                <p className="text-xl font-black font-mono tabular-nums text-violet-400">
                  {Math.round(data.modelAccuracy * 100)}%
                </p>
                <p className="text-[10px] text-zinc-600">aus Feedback</p>
              </>
            ) : (
              <p className="text-xs text-zinc-600 mt-1 leading-tight">Noch zu wenig Daten</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
