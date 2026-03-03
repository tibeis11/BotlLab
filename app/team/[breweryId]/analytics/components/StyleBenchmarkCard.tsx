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
  bitterness: 'Bitterness',
  sweetness: 'Sweetness',
  body: 'Body',
  carbonation: 'Carbonation',
  acidity: 'Acidity',
};

const DIMENSIONS = ['bitterness', 'sweetness', 'body', 'carbonation', 'acidity'] as const;
type Dim = typeof DIMENSIONS[number];

// ============================================================================
// Helpers
// ============================================================================

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-zinc-600 text-xs">–</span>;
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
    <span className="flex items-center gap-0.5 text-zinc-500 text-xs font-mono">
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
      <div className="bg-black border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-4 w-56 bg-zinc-800 rounded mb-6" />
        <div className="space-y-3">
          {DIMENSIONS.map(d => <div key={d} className="h-6 bg-zinc-900 rounded" />)}
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="relative bg-black border border-zinc-800 rounded-lg p-6 overflow-hidden">
        <div className="blur-sm pointer-events-none select-none">
          <div className="text-sm font-semibold text-white mb-4">Dein Bier im Stil-Vergleich</div>
          <div className="space-y-3">
            {DIMENSIONS.map(d => (
              <div key={d} className="flex items-center gap-3">
                <span className="w-24 text-xs text-zinc-500">{DIMENSION_LABELS[d]}</span>
                <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-700 rounded-full" style={{ width: '60%' }} />
                </div>
                <span className="text-zinc-600 text-xs font-mono w-8 text-right">–</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
          <Lock size={22} className="text-amber-400" />
          <p className="text-sm font-medium text-zinc-300">Verfügbar ab Brewer-Plan</p>
          <p className="text-xs text-zinc-500 text-center max-w-xs">
            Vergleiche dein Bier mit dem Stil-Durchschnitt.
          </p>
        </div>
      </div>
    );
  }

  // No style set
  if (!benchmark || (!benchmark.brewStyle || benchmark.brewStyle.toLowerCase() === 'unbekannt')) {
    return (
      <div className="bg-black border border-zinc-800 rounded-lg p-6 flex items-start gap-3">
        <ChevronRight size={16} className="text-zinc-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-zinc-500">
          Weise deinem Brew einen <strong className="text-zinc-300">Bierstil</strong> zu, um den Stil-Benchmark zu sehen.
        </p>
      </div>
    );
  }

  // Not enough comparison data
  if (!benchmark.hasEnoughData) {
    return (
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 size={16} className="text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Stil-Benchmark</h3>
        </div>
        <p className="text-sm text-zinc-500">
          Für den Stil <strong className="text-zinc-300">&ldquo;{benchmark.brewStyle}&rdquo;</strong> liegen noch zu wenig Vergleichsdaten vor
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
    <div className="bg-black border border-zinc-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">
            Dein <span className="text-cyan-400">{benchmark.brewStyle}</span> im Vergleich
          </h3>
        </div>
        {/* View toggle */}
        <div className="flex items-center text-xs bg-zinc-900 border border-zinc-800 rounded-md p-0.5 self-start sm:self-auto">
          {(['bars', 'radar'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${viewMode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {mode === 'bars' ? <BarChart2 size={11} /> : <Radio size={11} />}
              {mode === 'bars' ? 'Balken' : 'Radar'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-zinc-600 mb-6">
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
                <span className="w-24 text-xs text-zinc-400 flex-shrink-0">{DIMENSION_LABELS[dim]}</span>

                {/* Own bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${((own ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-white w-6 text-right">{own?.toFixed(1) ?? '–'}</span>
                </div>

                {/* Benchmark bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-600 rounded-full transition-all duration-500"
                      style={{ width: `${((bench ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-500 w-6 text-right">{bench?.toFixed(1) ?? '–'}</span>
                </div>

                {/* Delta */}
                <div className="w-14 text-right flex-shrink-0">
                  <DeltaIndicator delta={delta} />
                </div>
              </div>
            );
          })}

          {/* Legend row */}
          <div className="flex items-center gap-6 pt-2 border-t border-zinc-800/50">
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <div className="w-3 h-1.5 bg-cyan-500 rounded-full" /> Dein Brew
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <div className="w-3 h-1.5 bg-zinc-600 rounded-full" /> Ø {benchmark.brewStyle}
            </div>
          </div>
        </div>
      )}

      {/* Radar view */}
      {viewMode === 'radar' && (
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11 }} />
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
              stroke="#52525b"
              fill="#52525b"
              fillOpacity={0.15}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
              itemStyle={{ color: '#e4e4e7' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
