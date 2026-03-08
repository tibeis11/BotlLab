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
      <div className="bg-surface rounded-2xl border border-border p-6 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[2px] bg-surface/60 z-10 flex flex-col items-center justify-center gap-2">
          <Lock size={20} className="text-rating" />
          <p className="text-sm font-bold text-text-secondary">Verfügbar ab Brewer-Plan</p>
          <p className="text-xs text-text-muted">Erfahre, woher deine Scans kommen</p>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={16} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-secondary">Herkunftsquellen</h3>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-secondary">Herkunftsquellen</h3>
        </div>
        <p className="text-xs text-error">{error}</p>
      </div>
    );
  }

  // ── Empty State ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-secondary">Herkunftsquellen</h3>
        </div>
        <p className="text-xs text-text-muted mt-4 text-center py-4">
          Noch keine Scan-Daten verfügbar. UTM-Parameter &amp; Referrer werden ab sofort erfasst.
        </p>
      </div>
    );
  }

  const topItem = items[0];

  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Herkunftsquellen</h3>
        </div>
        <span className="text-xs text-text-muted">Woher kommen die Scans?</span>
      </div>

      {/* Bar list */}
      <div className="space-y-3">
        {items.map((item) => (
          <SourceRow key={item.key} item={item} isTop={item.key === topItem.key} />
        ))}
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceRow({ item, isTop }: { item: ScanSourceBreakdownItem; isTop: boolean }) {
  const barColor = isTop ? 'bg-brand' : 'bg-brand opacity-50';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-text-secondary font-bold truncate max-w-[65%]">
          <span>{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0 text-text-secondary">
          <span className="text-text-secondary font-mono">{item.percentage}%</span>
          <span className="text-text-disabled">({item.count.toLocaleString('de-DE')})</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
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
            <div className="h-3 bg-surface-hover rounded w-28 animate-pulse" />
            <div className="h-3 bg-surface-hover rounded w-12 animate-pulse" />
          </div>
          <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
            <div className="h-full bg-surface-hover rounded-full animate-pulse" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
