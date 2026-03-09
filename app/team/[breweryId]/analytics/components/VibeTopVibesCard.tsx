'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { getBreweryVibeAnalytics, type BreweryVibeAnalytics } from '@/lib/actions/analytics-actions';

// ─── Vibe label mapping (internal key → German display) ──────────────────────
const VIBE_LABELS: Record<string, string> = {
  friends: 'Mit Freunden',
  party: 'Party',
  festival: 'Festival',
  bbq: 'Grillen',
  date: 'Date',
  feierabend: 'Feierabend',
  teambuilding: 'Teambuilding',
  couch: 'Couch',
  gaming: 'Gaming',
  reading: 'Lesen',
  meditation: 'Meditation',
  cooking: 'Kochen',
  bath: 'Badewanne',
  alone: 'Alleine',
  relax: 'Relaxen',
  selfcare: 'Self-Care',
  sommer: 'Sommer',
  winter: 'Winter',
  sport: 'Sport',
  outdoor: 'Draußen',
  craft: 'Craft Night',
  music: 'Musik',
  dinner: 'Dinner',
};

function vibeLabel(key: string): string {
  return VIBE_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

// ─── Thresholds (Phase 9.3) ──────────────────────────────────────────────────
const MIN_THRESHOLD = 10;
const HEATMAP_THRESHOLD = 50;

interface VibeTopVibesCardProps {
  breweryId: string;
}

export default function VibeTopVibesCard({ breweryId }: VibeTopVibesCardProps) {
  const [data, setData] = useState<BreweryVibeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBreweryVibeAnalytics(breweryId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [breweryId]);

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border animate-pulse">
        <div className="h-4 w-48 bg-surface-hover rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 bg-surface-hover rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.totalVibeChecks === 0) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border">
        <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">
          Community Vibes
        </h3>
        <div className="text-center py-8 text-text-muted text-sm">
          <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
          <p>Noch keine VibeCheck-Daten vorhanden.</p>
          <p className="text-xs mt-1">
            Teile deinen QR-Code, damit Trinker ihren Vibe teilen.
          </p>
        </div>
      </div>
    );
  }

  // Phase 9.3: Below minimum threshold
  if (data.totalVibeChecks < MIN_THRESHOLD) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border">
        <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">
          Community Vibes
        </h3>
        <div className="flex items-start gap-3 bg-amber-500/10 text-amber-300 rounded-xl p-4 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Noch zu wenig Daten</p>
            <p className="text-xs mt-1 text-text-muted">
              Erst ab {MIN_THRESHOLD} VibeChecks zeigen wir statistische Auswertungen.
              Aktuell: {data.totalVibeChecks} / {MIN_THRESHOLD}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { socialVsSolo } = data;
  const svTotal = socialVsSolo.social + socialVsSolo.solo + socialVsSolo.other;
  const socialPct = svTotal > 0 ? Math.round((socialVsSolo.social / svTotal) * 100) : 0;
  const soloPct = svTotal > 0 ? Math.round((socialVsSolo.solo / svTotal) * 100) : 0;

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">
            Community Vibes
          </h3>
          <p className="text-text-muted text-xs mt-0.5">
            {data.totalVibeChecks} VibeChecks insgesamt
          </p>
        </div>
        <Sparkles size={16} className="text-purple-400" />
      </div>

      {/* Top vibes — brewery-wide */}
      <div className="space-y-2.5 mb-6">
        {data.breweryTopVibes.slice(0, 7).map((v) => (
          <div key={v.vibe} className="flex items-center gap-3">
            <span className="text-sm text-text-secondary w-28 truncate">
              {vibeLabel(v.vibe)}
            </span>
            <div className="flex-1 h-5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500/70 rounded-full transition-all"
                style={{ width: `${v.percentage}%` }}
              />
            </div>
            <span className="text-xs text-text-muted w-10 text-right font-mono">
              {v.percentage}%
            </span>
          </div>
        ))}
      </div>

      {/* Social vs Solo doughnut-like summary */}
      <div className="border-t border-border pt-4">
        <h4 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">
          Social vs. Solo
        </h4>
        <div className="flex gap-4">
          <div className="flex-1 bg-surface-hover rounded-xl p-3 text-center">
            <div className="text-lg font-black text-purple-400">{socialPct}%</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">Social</div>
          </div>
          <div className="flex-1 bg-surface-hover rounded-xl p-3 text-center">
            <div className="text-lg font-black text-cyan-400">{soloPct}%</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">Solo</div>
          </div>
        </div>
      </div>

      {/* Per-brew breakdown (if multiple brews have vibes) */}
      {data.brewSummaries.length > 1 && (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">
            Pro Rezept
          </h4>
          <div className="space-y-3">
            {data.brewSummaries.slice(0, 5).map((bs) => (
              <div key={bs.brewId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary font-medium truncate max-w-[70%]">
                    {bs.brewName}
                  </span>
                  <span className="text-text-muted">{bs.totalVibeChecks} Checks</span>
                </div>
                <div className="flex gap-1">
                  {bs.topVibes.slice(0, 3).map((tv) => (
                    <span
                      key={tv.vibe}
                      className="text-[10px] bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full"
                    >
                      {vibeLabel(tv.vibe)} {tv.percentage}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { MIN_THRESHOLD, HEATMAP_THRESHOLD };
