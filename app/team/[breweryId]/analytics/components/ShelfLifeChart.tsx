'use client';

import { useState, useEffect, useCallback } from 'react';
import { PackageOpen, Lock, TrendingDown, Star } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { getShelfLifeCurve, type ShelfLifeResult } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface ShelfLifeChartProps {
  brews: Array<{ id: string; name: string; style?: string }>;
  userTier: UserTier;
}

// ============================================================================
// Helpers
// ============================================================================

const BUCKET_LABELS: Record<string, string> = {
  '0-7':   '0–7 Tage',
  '8-14':  '8–14 Tage',
  '15-30': '15–30 Tage',
  '31-60': '31–60 Tage',
  '60+':   '60+ Tage',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-surface border border-border-hover rounded px-3 py-2 text-xs shadow-lg">
      <p className="text-text-secondary font-bold mb-1">{BUCKET_LABELS[label] ?? label}</p>
      <p className="text-text-primary font-mono">Ø {d.value?.toFixed(1)} Sterne</p>
      {d.payload?.ratingCount != null && (
        <p className="text-text-muted mt-0.5">{d.payload.ratingCount} Bewertung{d.payload.ratingCount !== 1 ? 'en' : ''}</p>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function ShelfLifeChart({ brews, userTier }: ShelfLifeChartProps) {
  const [selectedBrewId, setSelectedBrewId] = useState<string>('');
  const [result,  setResult]  = useState<ShelfLifeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const isLocked = userTier === 'free' || userTier === 'brewer';

  const load = useCallback(async (brewId: string) => {
    if (!brewId) return;
    setLoading(true);
    setError(null);
    const res = await getShelfLifeCurve(brewId);
    if (res.success) {
      setResult(res.result);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  // Auto-select first brew
  useEffect(() => {
    if (brews.length > 0 && !selectedBrewId) {
      const id = brews[0].id;
      setSelectedBrewId(id);
    }
  }, [brews]);

  // Load when selection changes (and not locked)
  useEffect(() => {
    if (selectedBrewId && !isLocked) load(selectedBrewId);
  }, [selectedBrewId, isLocked, load]);

  const chartData = result?.data.map(d => ({
    bucket: d.bucket,
    avgRating: d.avgRating,
    ratingCount: d.ratingCount,
  })) ?? [];

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <PackageOpen size={15} className="text-blue-400" />
          <h3 className="text-sm font-bold text-text-primary">Shelf-Life & Trinkreife</h3>
        </div>
        {!isLocked && result?.peakAgeBucket && (
          <div className="flex items-center gap-1.5 text-[10px] text-success bg-success-bg border border-success/20 px-2.5 py-1 rounded-full">
            <Star size={9} />
            Peak: {BUCKET_LABELS[result.peakAgeBucket]}
          </div>
        )}
      </div>

      {/* Tier lock */}
      {isLocked ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Lock size={20} className="text-violet-400" />
          <p className="text-sm font-bold text-text-secondary">Verfügbar ab Brewery-Plan</p>
          <p className="text-xs text-text-muted text-center max-w-xs">
            Shelf-Life Analyse für deine Biere.
          </p>
        </div>
      ) : (
        <>
          {/* Brew selector */}
          <div className="mb-5">
            <select
              value={selectedBrewId}
              onChange={e => setSelectedBrewId(e.target.value)}
              className="bg-surface border border-border-hover rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500 transition max-w-xs w-full"
            >
              <option value="">— Brew auswählen —</option>
              {brews.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.style ? ` (${b.style})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="h-52 bg-surface/30 rounded-lg animate-pulse" />
          ) : error ? (
            <div className="h-52 flex items-center justify-center text-red-400 text-sm">
              {error}
            </div>
          ) : !selectedBrewId ? (
            <div className="h-52 flex items-center justify-center text-text-disabled text-sm italic border border-dashed border-border rounded-lg">
              Wähle ein Brew aus.
            </div>
          ) : !result?.hasEnoughData ? (
            <div className="h-52 flex flex-col items-center justify-center gap-2 text-text-disabled text-sm border border-dashed border-border rounded-lg">
              <PackageOpen size={20} className="text-text-disabled" />
              <span className="italic">Noch zu wenige Daten für eine Shelf-Life Kurve.</span>
              <span className="text-[10px] text-text-disabled">Mindestens 3 Alters-Buckets mit Bewertungen erforderlich.</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickFormatter={b => BUCKET_LABELS[b] ?? b}
                  />
                  <YAxis
                    domain={([min, max]) => [Math.max(0, Math.floor(min - 0.5)), Math.min(10, Math.ceil(max + 0.5))]}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {result.peakAgeBucket && (
                    <ReferenceLine
                      x={result.peakAgeBucket}
                      stroke="#10b981"
                      strokeDasharray="4 2"
                      label={{ value: 'Peak', position: 'top', fill: '#10b981', fontSize: 9 }}
                    />
                  )}
                  {result.dropOffBucket && (
                    <ReferenceLine
                      x={result.dropOffBucket}
                      stroke="#ef4444"
                      strokeDasharray="4 2"
                      label={{ value: 'Abfall', position: 'top', fill: '#ef4444', fontSize: 9 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="avgRating"
                    name="Ø Bewertung"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={{ fill: '#60a5fa', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Insights row */}
              <div className="flex flex-wrap gap-4 mt-4">
                {result.peakAgeBucket && (
                  <div className="flex items-center gap-1.5 text-[10px] text-success">
                    <Star size={9} className="text-success" />
                    Optimal: <strong>{BUCKET_LABELS[result.peakAgeBucket]}</strong>
                  </div>
                )}
                {result.dropOffBucket && (
                  <div className="flex items-center gap-1.5 text-[10px] text-error">
                    <TrendingDown size={9} className="text-error" />
                    Qualitätsabfall ab: <strong>{BUCKET_LABELS[result.dropOffBucket]}</strong>
                  </div>
                )}
                <div className="text-[10px] text-text-disabled ml-auto">
                  {chartData.reduce((s, d) => s + d.ratingCount, 0)} Bewertungen analysiert
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
