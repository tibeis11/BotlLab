'use client';

import { useEffect, useState } from 'react';
import { CloudSun, Lock } from 'lucide-react';
import { getScanWeatherBreakdown, type ScanWeatherBreakdownItem } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface WeatherCorrelationChartProps {
  breweryId: string;
  userTier?: UserTier;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function WeatherCorrelationChart({
  breweryId,
  userTier = 'free',
  startDate,
  endDate,
}: WeatherCorrelationChartProps) {
  const [items, setItems]           = useState<ScanWeatherBreakdownItem[]>([]);
  const [totalWithWeather, setTotal] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const isLocked = userTier === 'free' || userTier === 'brewer';

  useEffect(() => {
    if (isLocked) { setLoading(false); return; }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getScanWeatherBreakdown(breweryId, { startDate, endDate });
        if (cancelled) return;
        if (result.success) {
          setItems(result.items ?? []);
          setTotal(result.totalWithWeather ?? 0);
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

  // ── Locked State ────────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="bg-black rounded-lg border border-zinc-800 p-6 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[2px] bg-zinc-950/60 z-10 flex flex-col items-center justify-center gap-2">
          <Lock size={20} className="text-violet-400" />
          <p className="text-sm font-medium text-zinc-300">Verfügbar ab Brewery-Plan</p>
          <p className="text-xs text-zinc-500">Wie beeinflusst das Wetter deine Scans?</p>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-black rounded-lg border border-zinc-800 p-6">
        <HeaderRow />
        <SkeletonRows />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-black rounded-lg border border-zinc-800 p-6">
        <HeaderRow />
        <p className="text-xs text-red-400 mt-3">{error}</p>
      </div>
    );
  }

  // ── Empty / pending-weather State ────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="bg-black rounded-lg border border-zinc-800 p-6">
        <HeaderRow />
        <p className="text-xs text-zinc-500 mt-4 text-center py-6">
          Wetterdaten werden noch gesammelt.{' '}
          <span className="text-zinc-400">Kommt in den nächsten Stunden.</span>
        </p>
      </div>
    );
  }

  const topItem = items[0];

  return (
    <div className="bg-black rounded-lg border border-zinc-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CloudSun size={16} className="text-sky-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Wetter-Korrelation</h3>
        </div>
        <span className="text-xs text-zinc-500">
          {totalWithWeather.toLocaleString('de-DE')} Scans mit Wetterdaten
        </span>
      </div>

      {/* Bar list */}
      <div className="space-y-3">
        {items.map((item) => (
          <WeatherRow key={`${item.condition}::${item.category}`} item={item} isTop={item.condition === topItem.condition && item.category === topItem.category} />
        ))}
      </div>

      {/* Footer */}
      <p className="mt-4 text-xs text-zinc-600">
        Wetterdaten werden stündlich via{' '}
        <span className="text-zinc-500 font-medium">Open-Meteo</span> abgerufen — DSGVO-konform, ohne Schlüssel.
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeaderRow() {
  return (
    <div className="flex items-center gap-2 mb-5">
      <CloudSun size={16} className="text-zinc-500" />
      <h3 className="text-sm font-medium text-zinc-400">Wetter-Korrelation</h3>
    </div>
  );
}

function WeatherRow({ item, isTop }: { item: ScanWeatherBreakdownItem; isTop: boolean }) {
  const barColor = isTop ? 'bg-sky-500' : 'bg-zinc-600';
  const categoryBadge = CATEGORY_BADGE[item.category] ?? null;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-zinc-300 font-medium truncate max-w-[65%]">
          <span>{item.icon}</span>
          <span className="truncate">{item.label}</span>
          {categoryBadge && (
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${categoryBadge.className}`}>
              {categoryBadge.label}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 shrink-0 text-zinc-400">
          <span className="text-zinc-300 font-mono">{item.percentage}%</span>
          <span className="text-zinc-600">({item.count.toLocaleString('de-DE')})</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${item.percentage}%` }}
        />
      </div>
    </div>
  );
}

const CATEGORY_BADGE: Record<string, { label: string; className: string }> = {
  hot:  { label: 'heiß',  className: 'bg-orange-500/20 text-orange-300' },
  warm: { label: 'warm',  className: 'bg-yellow-500/20 text-yellow-300' },
  cool: { label: 'kühl',  className: 'bg-sky-500/20    text-sky-300'    },
  cold: { label: 'kalt',  className: 'bg-blue-500/20   text-blue-300'   },
};

function SkeletonRows() {
  return (
    <div className="space-y-3 opacity-40">
      {[80, 55, 30, 15].map((w, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <div className="h-3 bg-zinc-700 rounded w-32 animate-pulse" />
            <div className="h-3 bg-zinc-700 rounded w-12 animate-pulse" />
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-600 rounded-full animate-pulse" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
