'use client';

import { Lock } from 'lucide-react';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface FunnelStage {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  color: string;        // Tailwind text colour class
  barColor: string;     // Tailwind bg colour class
  tooltip: string;
}

export interface DrinkerFunnelCardProps {
  totalScans: number;
  loggedInScans: number;
  verifiedDrinkers: number;  // scans that led to a rating
  capCollectors: number;     // unique users who claimed a Kronkorken
  isLoading?: boolean;
  userTier?: UserTier;
}

// ============================================================================
// Helpers
// ============================================================================

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// ============================================================================
// Component
// ============================================================================

export default function DrinkerFunnelCard({
  totalScans,
  loggedInScans,
  verifiedDrinkers,
  capCollectors,
  isLoading = false,
  userTier = 'free',
}: DrinkerFunnelCardProps) {

  const isLocked = userTier === 'free';

  // Self-healing guardrail: enforce logical funnel invariant
  // Cap Collector ⊂ Verified Drinker ⊂ Eingeloggt ⊂ Gesamt
  // If historical data wasn't backfilled yet, these ensure consistency.
  const safeCaps     = capCollectors;
  const safeVerified = Math.max(verifiedDrinkers, safeCaps);
  const safeLoggedIn = Math.max(loggedInScans, safeVerified);
  const safeTotal    = Math.max(totalScans, safeLoggedIn);

  const stages: FunnelStage[] = [
    {
      id: 'scans',
      label: 'Aufrufe gesamt',
      sublabel: '100% — Alle Besuche',
      value: safeTotal,
      color: 'text-text-primary',
      barColor: 'bg-surface-hover',
      tooltip: 'Jeder Aufruf der Flaschenseite, egal ob eingeloggt oder anonym.',
    },
    {
      id: 'logged',
      label: 'Eingeloggte Besuche',
      sublabel: `${pct(safeLoggedIn, safeTotal)} aller Aufrufe`,
      value: safeLoggedIn,
      color: 'text-brand',
      barColor: 'bg-brand/70',
      tooltip: 'Aufrufe von registrierten und eingeloggten BotlLab-Nutzern.',
    },
    {
      id: 'verified',
      label: 'Verified Drinkers',
      sublabel: `${pct(safeVerified, safeLoggedIn)} eingeloggter Besuche`,
      value: safeVerified,
      color: 'text-success',
      barColor: 'bg-success/70',
      tooltip: 'Nutzer, die nachweislich getrunken haben — per Bewertung oder Kronkorken-Sammlung bestätigt.',
    },
    {
      id: 'caps',
      label: 'Cap Collectors',
      sublabel: `${pct(safeCaps, safeVerified)} der Verified Drinkers`,
      value: safeCaps,
      color: 'text-warning',
      barColor: 'bg-warning/70',
      tooltip: 'Verified Drinkers, die zusätzlich einen Kronkorken gesammelt haben — deine engagierteste Community.',
    },
  ];

  const maxValue = safeTotal || 1;

  return (
    <div className="relative bg-surface rounded-2xl border border-border p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-text-primary text-sm font-bold">Verified Drinker Funnel</h3>
          <p className="text-text-muted text-xs mt-0.5">Vom Scan bis zum Stammgast</p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-hover border border-border px-2.5 py-1 rounded-full text-[10px] text-text-muted font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block"></span>
          Privacy First
        </div>
      </div>

      {/* Funnel Stages */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-8 w-16 bg-surface-hover rounded" />
              <div className="h-1.5 w-full bg-surface-hover rounded-full" />
              <div className="h-3 w-20 bg-surface-hover rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 md:divide-x md:divide-border/50">
          {stages.map((stage, idx) => {
            const barWidth = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
            return (
              <div
                key={stage.id}
                className="flex flex-col gap-2 md:pl-6 first:pl-0 group"
                title={stage.tooltip}
              >
                {/* Stage index */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-disabled font-mono">{idx + 1}</span>
                  {idx > 0 && (
                    <span className="hidden md:block text-border text-xs">›</span>
                  )}
                </div>
                {/* Value */}
                <div className={`text-2xl font-black font-mono tabular-nums ${stage.color}`}>
                  {stage.value.toLocaleString('de-DE')}
                </div>
                {/* Bar */}
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.barColor} transition-all duration-700`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                {/* Labels */}
                <div>
                  <div className="text-xs font-bold text-text-secondary leading-tight">{stage.label}</div>
                  <div className="text-[10px] text-text-disabled mt-0.5 leading-tight">{stage.sublabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conversation summary sentence */}
      {!isLoading && safeTotal > 0 && (
        <p className="mt-5 text-xs text-text-disabled border-t border-border pt-4">
          Von{' '}
          <span className="text-text-secondary font-bold">{safeTotal.toLocaleString('de-DE')}</span>{' '}
          Aufrufen haben{' '}
          <span className="text-emerald-400 font-medium">{safeVerified.toLocaleString('de-DE')}</span>{' '}
          Menschen dieses Bier nachweislich getrunken —{' '}
          <span className="text-text-secondary font-bold">{pct(safeVerified, safeTotal)}</span>{' '}
          Conversion.
        </p>
      )}

      {/* Tier-gate blur overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm rounded-2xl">
          <Lock size={20} className="text-amber-400 mb-3" />
          <p className="text-sm font-bold text-text-secondary mb-1">Verfügbar ab Brewer-Plan</p>
          <p className="text-xs text-text-muted text-center max-w-[200px]">
            Verstehe wer dein Bier wirklich trinkt.
          </p>
        </div>
      )}
    </div>
  );
}
