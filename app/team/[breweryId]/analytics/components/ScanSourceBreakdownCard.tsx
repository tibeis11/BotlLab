'use client';

import { useEffect, useState } from 'react';
import { Globe, Lock } from 'lucide-react';
import { getScanSourceBreakdown, type ScanSourceBreakdownItem } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface ScanSourceBreakdownCardProps {
  breweryId: string;
  userTier?: UserTier;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function ScanSourceBreakdownCard({
  breweryId,
  userTier = 'free',
  startDate,
  endDate,
}: ScanSourceBreakdownCardProps) {
  const [items, setItems]     = useState<ScanSourceBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const isLocked = userTier === 'free';

  useEffect(() => {
    if (isLocked) { setLoading(false); return; }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getScanSourceBreakdown(breweryId, { startDate, endDate });
        if (cancelled) return;
        if (result.success) {
          setItems(result.items ?? []);
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
          <Lock size={20} className="text-amber-400" />
          <p className="text-sm font-medium text-zinc-300">Verfügbar ab Brewer-Plan</p>
          <p className="text-xs text-zinc-500">Erfahre, woher deine Scans kommen</p>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-black rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={16} className="text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-400">Herkunftsquellen</h3>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-black rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-400">Herkunftsquellen</h3>
        </div>
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  // ── Empty State ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="bg-black rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-400">Herkunftsquellen</h3>
        </div>
        <p className="text-xs text-zinc-500 mt-4 text-center py-4">
          Noch keine Scan-Daten verfügbar. UTM-Parameter &amp; Referrer werden ab sofort erfasst.
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
          <Globe size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Herkunftsquellen</h3>
        </div>
        <span className="text-xs text-zinc-500">Woher kommen die Scans?</span>
      </div>

      {/* Bar list */}
      <div className="space-y-3">
        {items.map((item) => (
          <SourceRow key={item.key} item={item} isTop={item.key === topItem.key} />
        ))}
      </div>

      {/* Footer hint */}
      <p className="mt-4 text-xs text-zinc-600">
        Tipp: Hänge <code className="bg-zinc-800 px-1 rounded text-zinc-400 font-mono">?utm_medium=qr</code> an deine QR-Code-URLs um Quellen exakt zu tracken.
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceRow({ item, isTop }: { item: ScanSourceBreakdownItem; isTop: boolean }) {
  const barColor = isTop ? 'bg-cyan-500' : 'bg-zinc-600';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-zinc-300 font-medium truncate max-w-[65%]">
          <span>{item.icon}</span>
          <span className="truncate">{item.label}</span>
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

function SkeletonRows() {
  return (
    <div className="space-y-3 opacity-40">
      {[80, 55, 30, 15].map((w, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <div className="h-3 bg-zinc-700 rounded w-28 animate-pulse" />
            <div className="h-3 bg-zinc-700 rounded w-12 animate-pulse" />
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-700 rounded-full animate-pulse" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
