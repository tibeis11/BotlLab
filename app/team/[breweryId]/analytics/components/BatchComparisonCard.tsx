'use client';

import { useState, useTransition } from 'react';
import { Lock, FlaskConical, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { getBatchComparison, type BatchComparisonResult } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface BatchComparisonCardProps {
  brews: Array<{ id: string; name: string; style: string }>;
  userTier?: UserTier;
}

// ============================================================================
// Constants
// ============================================================================

const DIMENSION_LABELS: Record<string, string> = {
  bitterness: 'Bitterkeit',
  sweetness: 'Süße',
  body: 'Körper',
  roast: 'Röstung',
  fruitiness: 'Fruchtigkeit',
};
const DIMENSIONS = ['bitterness', 'sweetness', 'body', 'roast', 'fruitiness'] as const;

// ============================================================================
// Helpers
// ============================================================================

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-text-disabled text-xs font-mono">–</span>;
  const sign = delta > 0 ? '+' : '';
  const color = Math.abs(delta) > 0.5
    ? delta > 0 ? 'text-emerald-400' : 'text-red-400'
    : 'text-text-muted';
  return (
    <span className={`text-xs font-mono ${color}`}>
      {sign}{delta.toFixed(1)}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BatchComparisonCard({ brews, userTier = 'free' }: BatchComparisonCardProps) {
  const [brewIdA, setBrewIdA] = useState<string>('');
  const [brewIdB, setBrewIdB] = useState<string>('');
  const [result, setResult] = useState<BatchComparisonResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLocked = userTier === 'free' || userTier === 'brewer';

  if (isLocked) {
    return (
      <div className="relative bg-surface border border-border rounded-2xl p-6 overflow-hidden">
        <div className="blur-sm pointer-events-none select-none">
          <div className="text-sm font-bold text-text-primary mb-4">Sud-Vergleich (A/B-Testing)</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-surface rounded border border-border" />
            <div className="h-10 bg-surface rounded border border-border" />
          </div>
          <div className="h-64 bg-surface/50 rounded mt-4" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/60 gap-3">
          <Lock size={22} className="text-violet-400" />
          <p className="text-sm font-bold text-text-secondary">Verfügbar ab Brewery-Plan</p>
          <p className="text-xs text-text-muted text-center max-w-xs">
            A/B-Vergleich deiner Sude.
          </p>
        </div>
      </div>
    );
  }

  function handleCompare() {
    if (!brewIdA || !brewIdB || brewIdA === brewIdB) return;
    setErrorMsg(null);
    setResult(null);
    startTransition(async () => {
      const res = await getBatchComparison(brewIdA, brewIdB);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.data) {
        setResult(res.data);
      }
    });
  }

  // radar data
  const radarData = result
    ? DIMENSIONS.map(dim => ({
        subject: DIMENSION_LABELS[dim],
        [result.brewA.name]: result.brewA.tasteProfile[dim] ?? 0,
        [result.brewB.name]: result.brewB.tasteProfile[dim] ?? 0,
      }))
    : [];

  const selectClass = "w-full bg-surface border border-border-hover rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-violet-500 transition";

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <FlaskConical size={16} className="text-violet-400" />
        <h3 className="text-sm font-bold text-text-primary">Sud-Vergleich</h3>
        <span className="text-[10px] text-text-disabled bg-surface border border-border px-2 py-0.5 rounded ml-1">A/B Testing</span>
      </div>

      {/* Brew selectors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Sud A (Baseline)</label>
          <select
            value={brewIdA}
            onChange={e => setBrewIdA(e.target.value)}
            className={selectClass}
          >
            <option value="">— Brew auswählen —</option>
            {brews.map(b => (
              <option key={b.id} value={b.id}>{b.name}{b.style ? ` (${b.style})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center sm:mt-4 text-text-disabled">
          <ArrowRight size={18} />
        </div>

        <div className="flex-1">
          <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Sud B (Vergleich)</label>
          <select
            value={brewIdB}
            onChange={e => setBrewIdB(e.target.value)}
            className={selectClass}
          >
            <option value="">— Brew auswählen —</option>
            {brews.map(b => (
              <option key={b.id} value={b.id}>{b.name}{b.style ? ` (${b.style})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="sm:mt-4">
          <button
            onClick={handleCompare}
            disabled={!brewIdA || !brewIdB || brewIdA === brewIdB || isPending}
            className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition"
          >
            {isPending ? 'Lädt…' : 'Vergleichen'}
          </button>
        </div>
      </div>

      {/* Same brew warning */}
      {brewIdA && brewIdB && brewIdA === brewIdB && (
        <p className="text-xs text-amber-400 mb-4">Wähle zwei verschiedene Sude aus.</p>
      )}

      {/* Error */}
      {errorMsg && (
        <p className="text-xs text-red-400 mb-4">{errorMsg}</p>
      )}

      {/* No result yet */}
      {!result && !isPending && (
        <div className="flex flex-col items-center justify-center py-12 text-text-disabled text-sm italic border border-dashed border-border rounded-lg">
          Wähle zwei Sude aus und klicke auf "Vergleichen".
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="h-64 bg-surface/30 rounded-lg animate-pulse flex items-center justify-center text-text-disabled text-sm">
          Vergleich wird berechnet…
        </div>
      )}

      {/* Results */}
      {result && !isPending && (
        <div className="space-y-6">
          {/* Sample size warning */}
          {result.sampleSizeWarning && (
            <div className="flex items-start gap-2 bg-warning-bg border border-warning/20 rounded-lg p-3">
              <AlertTriangle size={14} className="text-warning mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning">
                Mindestens ein Sud hat weniger als 10 Bewertungen — das Ergebnis ist statistisch wenig belastbar.
              </p>
            </div>
          )}

          {/* Score summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface/50 border border-border rounded-2xl p-4 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{result.brewA.name}</p>
              <p className="text-2xl font-bold text-text-primary">
                {result.brewA.avgOverall?.toFixed(1) ?? '–'}
                <span className="text-xs text-text-muted font-normal ml-0.5">★</span>
              </p>
              <p className="text-[10px] text-text-disabled mt-1">{result.brewA.ratings} Ratings</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Δ Overall</p>
              <DeltaBadge delta={result.overallRatingChange} />
            </div>
            <div className="bg-surface/50 border border-border rounded-2xl p-4 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{result.brewB.name}</p>
              <p className="text-2xl font-bold text-text-primary">
                {result.brewB.avgOverall?.toFixed(1) ?? '–'}
                <span className="text-xs text-text-muted font-normal ml-0.5">★</span>
              </p>
              <p className="text-[10px] text-text-disabled mt-1">{result.brewB.ratings} Ratings</p>
            </div>
          </div>

          {/* Radar comparison */}
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: 'var(--text-disabled)', fontSize: 9 }} />
              <Radar
                name={result.brewA.name}
                dataKey={result.brewA.name}
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name={result.brewB.name}
                dataKey={result.brewB.name}
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.15}
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
            </RadarChart>
          </ResponsiveContainer>

          {/* Delta table */}
          <div>
            <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-3">Dimensionsvergleich (B − A)</h4>
            <div className="space-y-2">
              {DIMENSIONS.map(dim => {
                const delta = result.deltas[dim];
                const isSignificant = result.significantDifferences.includes(dim);
                return (
                  <div
                    key={dim}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isSignificant ? 'bg-surface border border-border-hover' : 'bg-surface/30'}`}
                  >
                    <span className="w-24 text-xs text-text-secondary flex-shrink-0">{DIMENSION_LABELS[dim]}</span>
                    <span className="flex-1 text-xs font-mono text-text-muted">
                      {result.brewA.tasteProfile[dim]?.toFixed(1) ?? '–'}
                    </span>
                    <DeltaBadge delta={delta} />
                    <span className="flex-1 text-xs font-mono text-text-muted text-right">
                      {result.brewB.tasteProfile[dim]?.toFixed(1) ?? '–'}
                    </span>
                    {isSignificant && (
                      <span className="text-[9px] bg-accent-purple/10 text-accent-purple border border-accent-purple/20 px-1.5 py-0.5 rounded">
                        Messbar
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
