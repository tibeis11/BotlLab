'use client';

// ============================================================================
// Phase 13.4 — Loyalty Segment Chart
//
// Donut chart showing Einmaltrinker / Wiederkommer / Fan breakdown.
// Tier-gated: brewery+.
// ============================================================================

import React, { useEffect, useState, useTransition } from 'react';
import { getLoyaltyBreakdown, type LoyaltyBreakdown } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';
import { Users, Lock, Lightbulb } from 'lucide-react';

interface Props {
  brews: Array<{ id: string; name: string; style: string }>;
  breweryId: string;
  userTier: UserTier;
}

// Simple SVG donut chart (no external lib)
function DonutChart({ segments }: { segments: LoyaltyBreakdown['segments'] }) {
  const total = segments.reduce((a, s) => a + s.userCount, 0);
  if (total === 0) return (
    <div className="w-32 h-32 rounded-full border-4 border-border flex items-center justify-center">
      <p className="text-[10px] text-text-disabled text-center px-3">Keine Daten</p>
    </div>
  );

  const cx = 64, cy = 64, r = 48, strokeW = 20;
  const circumference = 2 * Math.PI * r;
  let dashOffset = 0;

  const slices = segments.filter(s => s.userCount > 0).map((s) => {
    const pct = s.userCount / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const offset = dashOffset;
    dashOffset += dash;
    return { ...s, dash, gap, offset };
  });

  return (
    <svg width={128} height={128} viewBox="0 0 128 128" className="flex-shrink-0">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeW} />
      {slices.map((s) => (
        <circle
          key={s.segment}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={strokeW}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circumference / 4}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.5s' }}
        />
      ))}
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize={18} fontWeight="900">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>Nutzer</text>
    </svg>
  );
}

function LoyaltyInsight({ breakdown }: { breakdown: LoyaltyBreakdown }) {
  const fan = breakdown.segments.find((s) => s.segment === 'fan');
  const onetime = breakdown.segments.find((s) => s.segment === 'one_time');

  if (!fan || !onetime) return null;

  const insights: string[] = [];

  if (fan.avgRating != null && onetime.avgRating != null) {
    const diff = (fan.avgRating - onetime.avgRating).toFixed(1);
    if (Number(diff) > 0) {
      insights.push(`Fans bewerten dieses Bier ⌀ ${diff} Punkte höher als Einmaltrinker — Kundenbindung zahlt sich aus.`);
    }
  }

  if (fan.userCount > 0 && breakdown.totalTrackedUsers > 0) {
    const pct = Math.round((fan.userCount / breakdown.totalTrackedUsers) * 100);
    insights.push(`${pct}% deiner eingeloggten Trinker sind Fans (5+ Tage).`);
  }

  if (breakdown.anonymousScans > 0) {
    const total = breakdown.segments.reduce((a, s) => a + s.scanCount, 0) + breakdown.anonymousScans;
    const anonPct = Math.round((breakdown.anonymousScans / total) * 100);
    insights.push(`${anonPct}% der Scans sind anonym — kein Loyalty-Tracking möglich ohne Login.`);
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-warning-bg border border-warning/20 rounded-xl p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Lightbulb size={13} className="text-warning flex-shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest text-warning">Insights</span>
      </div>
      {insights.map((ins, i) => (
        <p key={i} className="text-xs text-text-secondary">{ins}</p>
      ))}
    </div>
  );
}

export default function LoyaltySegmentChart({ brews, breweryId, userTier }: Props) {
  const [selectedBrewId, setSelectedBrewId] = useState<string>(brews[0]?.id ?? '');
  const [breakdown, setBreakdown] = useState<LoyaltyBreakdown | null>(null);
  const [isPending, startTransition] = useTransition();

  const tierOk = userTier === 'brewery' || userTier === 'brewer' || userTier === 'enterprise';

  useEffect(() => {
    if (!selectedBrewId || !tierOk) return;
    startTransition(async () => {
      const data = await getLoyaltyBreakdown(selectedBrewId);
      setBreakdown(data);
    });
  }, [selectedBrewId, tierOk]);

  if (!tierOk) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-3">
        <Lock className="mx-auto text-amber-400" size={28} />
        <p className="text-sm font-bold text-text-secondary">Verfügbar ab Brewer-Plan</p>
        <p className="text-xs text-text-muted">Loyalty-Analyse für deine Trinker.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Trinker-Treue</h3>
            <p className="text-xs text-text-muted">Wie loyal sind deine Trinker?</p>
          </div>
        </div>

        {/* Brew selector */}
        <select
          value={selectedBrewId}
          onChange={(e) => setSelectedBrewId(e.target.value)}
          className="bg-surface-hover border border-border-hover rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-emerald-500/50 max-w-[160px]"
        >
          {brews.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {isPending && (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!isPending && breakdown && (
        <>
          {/* Donut + legend */}
          <div className="flex items-center gap-5">
            <DonutChart segments={breakdown.segments} />

            <div className="flex-1 space-y-2 min-w-0">
              {breakdown.segments.map((seg) => (
                <div key={seg.segment} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{seg.label}</p>
                    <p className="text-[10px] text-text-muted">
                      {seg.userCount} Nutzer
                      {seg.avgRating != null ? ` · ⌀ ${seg.avgRating}★` : ''}
                      {` · ${seg.scanCount} Scans`}
                    </p>
                  </div>
                </div>
              ))}

              {breakdown.anonymousScans > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-surface-hover border border-border-hover" />
                  <p className="text-[10px] text-text-disabled">
                    {breakdown.anonymousScans} anonyme Scans (kein Tracking)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Insight box */}
          <LoyaltyInsight breakdown={breakdown} />
        </>
      )}

      {!isPending && breakdown && breakdown.totalTrackedUsers === 0 && breakdown.anonymousScans === 0 && (
        <p className="text-xs text-text-disabled text-center py-4">
          Noch keine Scan-Daten für dieses Bier.
        </p>
      )}
    </div>
  );
}
