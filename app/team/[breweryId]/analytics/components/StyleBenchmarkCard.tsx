'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Lock, BarChart2, Radio } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import type { StyleBenchmarkResult } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types & constants
// ============================================================================

interface StyleBenchmarkCardProps {
  benchmark: StyleBenchmarkResult | null;
  userTier?: UserTier;
  isLoading?: boolean;
}

type ViewMode = 'bars' | 'radar';

const DIMENSION_LABELS: Record<string, string> = {
  bitterness: 'Bitterkeit',
  sweetness: 'Süße',
  body: 'Körper',
  roast: 'Röstung',
  fruitiness: 'Fruchtigkeit',
};

const DIMENSIONS = ['bitterness', 'sweetness', 'body', 'roast', 'fruitiness'] as const;
type Dim = typeof DIMENSIONS[number];

// ============================================================================
// Helpers
// ============================================================================

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-text-disabled text-xs">–</span>;
  const abs = Math.abs(delta);
  const sign = delta >= 0 ? '+' : '';

  if (delta > 0.5) return (
    <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-mono">
      <TrendingUp size={11} /> {sign}{delta.toFixed(1)}
    </span>
  );
  if (delta < -0.5) return (
    <span className="flex items-center gap-0.5 text-red-400 text-xs font-mono">
      <TrendingDown size={11} /> {delta.toFixed(1)}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-text-muted text-xs font-mono">
      <Minus size={11} /> {sign}{delta.toFixed(1)}
    </span>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function StyleBenchmarkCard({
  benchmark,
  userTier = 'free',
  isLoading = false,
}: StyleBenchmarkCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('bars');

  // Tier lock: brewer+
  const isLocked = userTier === 'free';

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-56 bg-surface-hover rounded mb-6" />
        <div className="space-y-3">
          {DIMENSIONS.map(d => <div key={d} className="h-6 bg-surface rounded" />)}
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="relative bg-surface border border-border rounded-2xl p-6 overflow-hidden">
        <div className="blur-sm pointer-events-none select-none">
          <div className="text-sm font-bold text-text-primary mb-4">Dein Bier im Stil-Vergleich</div>
          <div className="space-y-3">
            {DIMENSIONS.map(d => (
              <div key={d} className="flex items-center gap-3">
                <span className="w-24 text-xs text-text-muted">{DIMENSION_LABELS[d]}</span>
                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-surface-hover rounded-full" style={{ width: '60%' }} />
                </div>
                <span className="text-text-disabled text-xs font-mono w-8 text-right">–</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 gap-3">
          <Lock size={22} className="text-amber-400" />
          <p className="text-sm font-bold text-text-secondary">Verfügbar ab Brewer-Plan</p>
          <p className="text-xs text-text-muted text-center max-w-xs">
            Vergleiche dein Bier mit dem Stil-Durchschnitt.
          </p>
        </div>
      </div>
    );
  }

  // No style set
  if (!benchmark || (!benchmark.brewStyle || benchmark.brewStyle.toLowerCase() === 'unbekannt')) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 flex items-start gap-3">
        <ChevronRight size={16} className="text-text-disabled mt-0.5 flex-shrink-0" />
        <p className="text-sm text-text-muted">
          Weise deinem Brew einen <strong className="text-text-secondary">Bierstil</strong> zu, um den Stil-Benchmark zu sehen.
        </p>
      </div>
    );
  }

  // Not enough comparison data
  if (!benchmark.hasEnoughData) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 size={16} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-primary">Stil-Benchmark</h3>
        </div>
        <p className="text-sm text-text-muted">
          Für den Stil <strong className="text-text-secondary">&ldquo;{benchmark.brewStyle}&rdquo;</strong> liegen noch zu wenig Vergleichsdaten vor
          {benchmark.benchmarkBrewCount > 0 ? ` (${benchmark.benchmarkBrewCount} von mind. 3 Brews)` : ''}.
          Sobald mindestens 3 verschiedene Brews dieses Stils bewertet wurden, erscheint hier der Benchmark.
        </p>
      </div>
    );
  }

  // Build radar data
  const radarData = DIMENSIONS.map(dim => ({
    subject: DIMENSION_LABELS[dim],
    'Dein Brew': benchmark.brewValues[dim] ?? 0,
    [`Ø ${benchmark.brewStyle}`]: benchmark.benchmarkValues[dim] ?? 0,
  }));

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-text-primary">
            Dein <span className="text-cyan-400">{benchmark.brewStyle}</span> im Vergleich
          </h3>
        </div>
        {/* View toggle */}
        <div className="flex items-center text-xs bg-surface border border-border rounded-lg p-0.5 self-start sm:self-auto">
          {(['bars', 'radar'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${viewMode === mode ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {mode === 'bars' ? <BarChart2 size={11} /> : <Radio size={11} />}
              {mode === 'bars' ? 'Balken' : 'Radar'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-text-disabled mb-6">
        Basierend auf {benchmark.benchmarkBrewCount} {benchmark.brewStyle}s und{' '}
        {benchmark.benchmarkRatingCount} Bewertungen in BotlLab
      </p>

      {/* Bar view */}
      {viewMode === 'bars' && (
        <div className="space-y-4">
          {DIMENSIONS.map(dim => {
            const own = benchmark.brewValues[dim];
            const bench = benchmark.benchmarkValues[dim];
            const delta = benchmark.deltas[dim];

            return (
              <div key={dim} className="flex items-center gap-3">
                <span className="w-24 text-xs text-text-secondary flex-shrink-0">{DIMENSION_LABELS[dim]}</span>

                {/* Own bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${((own ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-primary w-6 text-right">{own?.toFixed(1) ?? '–'}</span>
                </div>

                {/* Benchmark bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-surface-hover rounded-full transition-all duration-500"
                      style={{ width: `${((bench ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-muted w-6 text-right">{bench?.toFixed(1) ?? '–'}</span>
                </div>

                {/* Delta */}
                <div className="w-14 text-right flex-shrink-0">
                  <DeltaIndicator delta={delta} />
                </div>
              </div>
            );
          })}

          {/* Legend row */}
          <div className="flex items-center gap-6 pt-2 border-t border-border-subtle">
            <div className="flex items-center gap-2 text-[10px] text-text-secondary">
              <div className="w-3 h-1.5 bg-cyan-500 rounded-full" /> Dein Brew
            </div>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <div className="w-3 h-1.5 bg-surface-hover rounded-full" /> Ø {benchmark.brewStyle}
            </div>
          </div>
        </div>
      )}

      {/* Radar view */}
      {viewMode === 'radar' && (
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Radar
              name="Dein Brew"
              dataKey="Dein Brew"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Radar
              name={`Ø ${benchmark.brewStyle}`}
              dataKey={`Ø ${benchmark.brewStyle}`}
              stroke="var(--text-disabled)"
              fill="var(--text-disabled)"
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
      )}
    </div>
  );
}
