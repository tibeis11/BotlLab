'use client';

import { useEffect, useState, useMemo } from 'react';
import { Clock, Info } from 'lucide-react';
import { getVibeTimeHeatmap, type VibeTimeSlot } from '@/lib/actions/analytics-actions';
import { HEATMAP_THRESHOLD } from './VibeTopVibesCard';

const VIBE_LABELS: Record<string, string> = {
  friends: 'Freunde',
  party: 'Party',
  festival: 'Festival',
  bbq: 'Grillen',
  date: 'Date',
  feierabend: 'Feierabend',
  couch: 'Couch',
  gaming: 'Gaming',
  relax: 'Relaxen',
  outdoor: 'Draußen',
  sommer: 'Sommer',
  winter: 'Winter',
  sport: 'Sport',
  music: 'Musik',
  dinner: 'Dinner',
  cooking: 'Kochen',
};

function vibeLabel(key: string): string {
  return VIBE_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

interface VibeTimeHeatmapProps {
  breweryId: string;
}

export default function VibeTimeHeatmap({ breweryId }: VibeTimeHeatmapProps) {
  const [slots, setSlots] = useState<VibeTimeSlot[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [totalChecks, setTotalChecks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVibeTimeHeatmap(breweryId)
      .then((res) => {
        setSlots(res.slots);
        setVibes(res.vibes);
        setTotalChecks(res.totalChecks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [breweryId]);

  // Build grid data: vibes as rows, hours as columns
  const { grid, maxCount, topVibes } = useMemo(() => {
    const countMap: Record<string, Record<number, number>> = {};
    let max = 0;

    for (const s of slots) {
      if (!countMap[s.vibe]) countMap[s.vibe] = {};
      countMap[s.vibe][s.hour] = s.count;
      if (s.count > max) max = s.count;
    }

    // Only show top 8 vibes by total count
    const vibeTotal = vibes.map((v) => {
      const hours = countMap[v] || {};
      const total = Object.values(hours).reduce((a, b) => a + b, 0);
      return { vibe: v, total };
    });
    vibeTotal.sort((a, b) => b.total - a.total);
    const top = vibeTotal.slice(0, 8).map((v) => v.vibe);

    return { grid: countMap, maxCount: max, topVibes: top };
  }, [slots, vibes]);

  // Hour labels (only show every 3rd for readability)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border animate-pulse">
        <div className="h-4 w-56 bg-surface-hover rounded mb-4" />
        <div className="h-48 bg-surface-hover rounded" />
      </div>
    );
  }

  // Phase 9.3: Need 50+ checks for heatmap
  if (totalChecks < HEATMAP_THRESHOLD) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border">
        <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">
          Vibes × Tageszeit
        </h3>
        <div className="flex items-start gap-3 bg-surface-hover text-text-muted rounded-xl p-4 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-text-secondary">Noch nicht genug Daten</p>
            <p className="text-xs mt-1">
              Die Tageszeit-Heatmap wird ab {HEATMAP_THRESHOLD} VibeChecks freigeschaltet.
              Aktuell: {totalChecks} / {HEATMAP_THRESHOLD}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">
            Vibes × Tageszeit
          </h3>
          <p className="text-text-muted text-xs mt-0.5">
            Wann wird welcher Trinkanlass gemeldet?
          </p>
        </div>
        <Clock size={16} className="text-purple-400" />
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour header row */}
          <div className="flex items-end mb-1 ml-24">
            {hours.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[9px] text-text-muted"
              >
                {h % 3 === 0 ? `${h.toString().padStart(2, '0')}` : ''}
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {topVibes.map((vibe) => (
            <div key={vibe} className="flex items-center mb-0.5">
              <div className="w-24 text-xs text-text-secondary truncate pr-2 text-right">
                {vibeLabel(vibe)}
              </div>
              <div className="flex flex-1 gap-px">
                {hours.map((h) => {
                  const count = grid[vibe]?.[h] || 0;
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  return (
                    <div
                      key={h}
                      className="flex-1 aspect-square rounded-sm transition-colors"
                      style={{
                        backgroundColor: count === 0
                          ? 'var(--color-surface-hover)'
                          : `rgba(168, 85, 247, ${0.15 + intensity * 0.85})`,
                      }}
                      title={`${vibeLabel(vibe)} um ${h}:00 — ${count}×`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-text-muted">
            <span>Wenig</span>
            <div className="flex gap-px">
              {[0.15, 0.35, 0.55, 0.75, 1].map((op, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(168, 85, 247, ${op})` }}
                />
              ))}
            </div>
            <span>Viel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
