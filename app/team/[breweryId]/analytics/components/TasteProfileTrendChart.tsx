'use client';

import { useState, useEffect } from 'react';
import { Lock, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getTasteTimeline, type TimelineDataPoint } from '@/lib/rating-analytics';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface TasteProfileTrendChartProps {
  brewOptions: Array<{ id: string; name: string; style?: string }>;
  userTier?: UserTier;
  /** Default open state for the accordion wrapper */
  defaultOpen?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DIMENSIONS = [
  { key: 'bitterness' as const, label: 'Bitterness', color: '#f59e0b' },
  { key: 'sweetness'  as const, label: 'Sweetness',  color: '#06b6d4' },
  { key: 'body'       as const, label: 'Body',        color: '#8b5cf6' },
  { key: 'carbonation'as const, label: 'Carbonation', color: '#10b981' },
  { key: 'acidity'    as const, label: 'Acidity',     color: '#f43f5e' },
] as const;

type DimKey = typeof DIMENSIONS[number]['key'];

// ============================================================================
// Helpers
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs shadow-lg min-w-[140px]">
      <p className="text-zinc-400 font-medium mb-2">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2 justify-between">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-mono">{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function TasteProfileTrendChart({
  brewOptions,
  userTier = 'free',
  defaultOpen = false,
}: TasteProfileTrendChartProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedBrewId, setSelectedBrewId] = useState<string>('');
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDims, setActiveDims] = useState<Set<DimKey>>(
    new Set(DIMENSIONS.map(d => d.key))
  );

  const isLocked = userTier === 'free';

  // Load timeline when brew is selected
  useEffect(() => {
    if (!selectedBrewId) { setTimeline([]); return; }
    setLoading(true);
    getTasteTimeline(selectedBrewId)
      .then(data => setTimeline(data))
      .finally(() => setLoading(false));
  }, [selectedBrewId]);

  // Set default brew when options load
  useEffect(() => {
    if (brewOptions.length > 0 && !selectedBrewId) {
      setSelectedBrewId(brewOptions[0].id);
    }
  }, [brewOptions]);

  const toggleDim = (dim: DimKey) => {
    setActiveDims(prev => {
      const next = new Set(prev);
      if (next.has(dim)) {
        if (next.size > 1) next.delete(dim); // keep at least one
      } else {
        next.add(dim);
      }
      return next;
    });
  };

  const hasEnoughData = timeline.length >= 3;

  return (
    <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-white">Geschmackstrend</span>
          {selectedBrewId && brewOptions.length > 0 && (
            <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded ml-1">
              {brewOptions.find(b => b.id === selectedBrewId)?.name ?? ''}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
      </button>

      {/* Accordion body */}
      {isOpen && (
        <div className="px-6 pb-6 border-t border-zinc-800">
          {/* Tier lock */}
          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Lock size={20} className="text-amber-400 mt-4" />
              <p className="text-sm font-medium text-zinc-300">Verfügbar ab Brewer-Plan</p>
              <p className="text-xs text-zinc-500 text-center max-w-xs">
                Geschmackstrend-Analyse für deine Biere.
              </p>
            </div>
          ) : (
            <>
              {/* Controls row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 mb-5">
                {/* Brew selector */}
                <select
                  value={selectedBrewId}
                  onChange={e => setSelectedBrewId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition max-w-xs"
                >
                  <option value="">— Brew auswählen —</option>
                  {brewOptions.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.style ? ` (${b.style})` : ''}
                    </option>
                  ))}
                </select>

                {/* Dimension toggles */}
                <div className="flex flex-wrap gap-2">
                  {DIMENSIONS.map(dim => (
                    <button
                      key={dim.key}
                      onClick={() => toggleDim(dim.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border transition ${
                        activeDims.has(dim.key)
                          ? 'border-transparent text-white'
                          : 'border-zinc-700 text-zinc-600 bg-transparent'
                      }`}
                      style={activeDims.has(dim.key) ? { backgroundColor: `${dim.color}25`, borderColor: dim.color, color: dim.color } : {}}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: activeDims.has(dim.key) ? dim.color : '#52525b' }}
                      />
                      {dim.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart area */}
              {!selectedBrewId ? (
                <div className="h-52 flex items-center justify-center text-zinc-600 text-sm italic border border-dashed border-zinc-800 rounded-lg">
                  Wähle ein Brew aus, um den Trend zu sehen.
                </div>
              ) : loading ? (
                <div className="h-52 bg-zinc-900/30 rounded-lg animate-pulse" />
              ) : !hasEnoughData ? (
                <div className="h-52 flex items-center justify-center text-zinc-600 text-sm italic border border-dashed border-zinc-800 rounded-lg">
                  Noch zu wenige Bewertungen für einen Trend (mindestens 3 Monate erforderlich).
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      tickFormatter={d => {
                        const [y, m] = d.split('-');
                        return `${m}/${y.slice(2)}`;
                      }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      tickCount={6}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={v => <span className="text-[10px] text-zinc-400">{v}</span>}
                      iconSize={8}
                    />
                    {DIMENSIONS.filter(d => activeDims.has(d.key)).map(dim => (
                      <Line
                        key={dim.key}
                        type="monotone"
                        dataKey={dim.key}
                        name={dim.label}
                        stroke={dim.color}
                        strokeWidth={2}
                        dot={{ fill: dim.color, r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}

              {hasEnoughData && (
                <p className="text-[10px] text-zinc-600 mt-3">
                  Basierend auf {timeline.reduce((a, b) => a + b.counts, 0)} Bewertungen über {timeline.length} Monate
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
