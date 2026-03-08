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
  /** Phase A: Σ drinking_probability — geschätzte Trinker (CIS) */
  weightedDrinkerEstimate?: number;
  verifiedDrinkers: number;  // scans that led to a rating or confirmed drinking
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
  weightedDrinkerEstimate = 0,
  verifiedDrinkers,
  isLoading = false,
  userTier = 'free',
}: DrinkerFunnelCardProps) {

  const isLocked = userTier === 'free';

  const safeVerified  = verifiedDrinkers;
  const safeLoggedIn  = loggedInScans;
  const safeTotal     = Math.max(totalScans, safeLoggedIn);
  const safeEstimated = Math.round(weightedDrinkerEstimate);

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
      id: 'estimated',
      label: 'Geschätzte Trinker',
      sublabel: `${pct(safeEstimated, safeTotal)} aller Aufrufe`,
      value: safeEstimated,
      color: 'text-cyan-400',
      barColor: 'bg-cyan-500/50',
      tooltip: 'KI-Schätzung (CIS): Wahrscheinliche Trinker basierend auf Verweildauer, Session-Muster und Interaktion.',
    },
    {
      id: 'verified',
      label: 'Verified Drinkers',
      sublabel: `${pct(safeVerified, safeTotal)} aller Aufrufe`,
      value: safeVerified,
      color: 'text-success',
      barColor: 'bg-success/70',
      tooltip: 'Personen, die nachweislich getrunken haben — per Bewertung oder Trink-Bestätigung.',
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-x-0">
          {stages.map((stage, idx) => {
            const barWidth = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
            // Symmetric padding so the divider line sits exactly centered
            // between adjacent content areas (equal space on both sides).
            const paddingClass = idx === 0
              ? 'md:pr-6'
              : idx === stages.length - 1
                ? 'md:pl-6'
                : 'md:px-6';
            return (
              <div
                key={stage.id}
                className={`flex flex-col gap-2 relative ${paddingClass} group`}
                title={stage.tooltip}
              >
                {/* Centered divider between stages */}
                {idx > 0 && (
                  <div className="hidden md:block absolute inset-y-0 left-0 w-px bg-border/50" />
                )}
                {/* Stage index */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-disabled font-mono">{idx + 1}</span>
                </div>
                {/* Value */}
                <div className={`text-2xl font-black font-mono tabular-nums ${stage.color}`}>
                  {stage.value.toLocaleString('de-DE')}
                </div>
                {/* Bar */}
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.barColor} transition-all duration-700${stage.id === 'estimated' ? ' border border-dashed border-cyan-400/60' : ''}`}
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
