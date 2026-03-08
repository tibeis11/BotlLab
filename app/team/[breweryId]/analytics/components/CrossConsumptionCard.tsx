'use client';

// ============================================================================
// Phase 14.2 — Cross-Consumption Distribution Leads
// Zeigt, was die eigenen Trinker sonst noch konsumieren (anonym).
// Tier-gated: enterprise
// ============================================================================

import React, { useEffect, useState, useTransition } from 'react';
import { getCrossConsumptionInsights, type CrossConsumptionInsight } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';
import { Share2, Lock, MapPin, Tag, Shield, RefreshCw } from 'lucide-react';

const TIER_ORDER: UserTier[] = ['free', 'brewer', 'brewery', 'enterprise'];
function tierAtLeast(userTier: UserTier, required: UserTier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required);
}

interface Props {
  breweryId: string;
  userTier: UserTier;
}

export default function CrossConsumptionCard({ breweryId, userTier }: Props) {
  const [result, setResult]   = useState<CrossConsumptionInsight | null>(null);
  const [pending, startTrans] = useTransition();
  const [loaded, setLoaded]   = useState(false);

  const canAccess = tierAtLeast(userTier, 'enterprise');

  useEffect(() => {
    if (!canAccess) return;
    startTrans(async () => {
      const data = await getCrossConsumptionInsights(breweryId);
      setResult(data);
      setLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breweryId, canAccess]);

  // ── Tier gate ──────────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-surface-hover rounded-lg">
            <Share2 className="w-5 h-5 text-text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Cross-Consumption Analyse</h3>
            <p className="text-xs text-text-muted">Distribution Leads &amp; Trinker-Overlap</p>
          </div>
          <span className="ml-auto text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded">
            Enterprise
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Lock className="w-8 h-8 text-cyan-400" />
          <p className="text-sm text-text-secondary text-center max-w-xs">
            Verfügbar ab <strong className="text-text-primary">Enterprise-Plan</strong>. Erfahre, was deine Stammtrinker sonst noch konsumieren.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!loaded || pending) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-surface-hover rounded w-56 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface-hover rounded-lg" />)}
        </div>
      </div>
    );
  }

  // ── No data ────────────────────────────────────────────────────────────────
  if (!result) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <Share2 className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Cross-Consumption Analyse</h3>
        </div>
        <p className="text-sm text-text-secondary text-center py-6">Keine Daten verfügbar.</p>
      </div>
    );
  }

  const notEnough = result.overlapBreweryCount === 0;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <Share2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Cross-Consumption Analyse</h3>
            <p className="text-xs text-text-muted">
              {result.myDrinkerCount} Trinker analysiert · Distribution Leads
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            startTrans(async () => {
              const data = await getCrossConsumptionInsights(breweryId);
              setResult(data);
            });
          }}
          disabled={pending}
          className="p-1.5 rounded-lg bg-surface-hover border border-border-hover text-text-secondary hover:text-text-primary disabled:opacity-50"
          title="Neu laden"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {notEnough ? (
        <p className="text-sm text-text-secondary text-center py-6">{result.privacyNote}</p>
      ) : (
        <div className="space-y-4">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-border/60 rounded-lg p-3">
              <p className="text-2xl font-bold text-violet-400">{result.overlapBreweryCount}</p>
              <p className="text-xs text-text-secondary mt-1">andere Brauereien besucht</p>
            </div>
            <div className="bg-border/60 rounded-lg p-3">
              <p className="text-2xl font-bold text-text-primary">{result.myDrinkerCount}</p>
              <p className="text-xs text-text-secondary mt-1">analysierte Trinker</p>
            </div>
          </div>

          {/* Top styles */}
          {result.topOverlapStyles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-text-muted" />
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">Meist-konsumierte Stile</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.topOverlapStyles.map((style) => (
                  <span key={style} className="text-xs bg-surface-hover border border-border-hover text-text-secondary px-2 py-1 rounded-full">
                    {style}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Geographic hotspots */}
          {result.geographicHotspots.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-text-muted" />
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">Distribution Hotspots</p>
              </div>
              <div className="space-y-2">
                {result.geographicHotspots.map((spot) => (
                  <div key={spot.city} className="flex items-center gap-2">
                    <div className="flex-1 bg-surface-hover rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-violet-500 rounded-full"
                        style={{ width: `${spot.scanPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary w-28 text-right truncate">{spot.city}</span>
                    <span className="text-xs text-text-muted w-8 text-right">{spot.scanPercentage}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-2">
                Diese Städte sind besonders aktiv bei deinen Trinkern — potenzielle Distributions-Partner prüfen.
              </p>
            </div>
          )}

          {/* Privacy note */}
          <div className="flex items-center gap-2 p-2.5 bg-border/40 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <p className="text-[10px] text-text-muted">{result.privacyNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
