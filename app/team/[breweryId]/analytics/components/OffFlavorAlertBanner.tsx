'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Lock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { detectBreweryOffFlavors, type OffFlavorAlert } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface OffFlavorAlertBannerProps {
  breweryId: string;
  userTier: UserTier;
}

// ============================================================================
// Helpers
// ============================================================================

function severityConfig(severity: OffFlavorAlert['severity']) {
  if (severity === 'critical') {
    return {
      borderClass: 'border-red-800',
      bgClass: 'bg-red-950/40',
      badgeClass: 'bg-red-900/50 text-red-300 border border-red-800',
      icon: <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />,
      label: 'Kritisch',
    };
  }
  return {
    borderClass: 'border-amber-800',
    bgClass: 'bg-amber-950/40',
    badgeClass: 'bg-amber-900/50 text-amber-300 border border-amber-800',
    icon: <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />,
    label: 'Warnung',
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function OffFlavorAlertBanner({ breweryId, userTier }: OffFlavorAlertBannerProps) {
  const [alerts, setAlerts]       = useState<OffFlavorAlert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [brewsChecked, setBrewsChecked] = useState(0);

  const isLocked = userTier === 'free';

  useEffect(() => {
    if (isLocked) { setLoading(false); return; }
    detectBreweryOffFlavors(breweryId).then(res => {
      if (res.success) {
        setAlerts(res.alerts);
        setBrewsChecked(res.brewsChecked);
      }
      setLoading(false);
    });
  }, [breweryId, isLocked]);

  // Don't render anything while loading (or if locked+empty)
  if (loading) {
    return (
      <div className="h-14 bg-zinc-900/30 rounded-lg animate-pulse" />
    );
  }

  if (isLocked) {
    return (
      <div className="bg-black border border-dashed border-zinc-800 rounded-lg px-6 py-4 flex items-center gap-3">
        <Lock size={16} className="text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-zinc-300">Off-Flavor Frühwarnsystem</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Verfügbar ab Brewer-Plan
          </p>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg px-6 py-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        <p className="text-xs text-emerald-300/80">
          Keine Off-Flavor-Anomalien erkannt in den letzten 30 Tagen
          {brewsChecked > 0 && ` (${brewsChecked} Brews geprüft)`}.
        </p>
      </div>
    );
  }

  const toggleBrew = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Group by brewery for display
  const byBrew = alerts.reduce<Record<string, OffFlavorAlert[]>>((acc, a) => {
    if (!acc[a.brewId]) acc[a.brewId] = [];
    acc[a.brewId].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-400" />
          Off-Flavor Frühwarnung
        </h3>
        <span className="text-[10px] text-zinc-600">{alerts.length} Anomalie{alerts.length !== 1 ? 'n' : ''} in 30 Tagen</span>
      </div>

      {Object.entries(byBrew).map(([brewId, brewAlerts]) => {
        const brewName = brewAlerts[0].brewName;
        const hasCritical = brewAlerts.some(a => a.severity === 'critical');
        const cfg = severityConfig(hasCritical ? 'critical' : 'warning');
        const key = brewId;
        const isExpanded = expanded.has(key);

        return (
          <div
            key={key}
            className={`rounded-lg border overflow-hidden ${cfg.borderClass} ${cfg.bgClass}`}
          >
            {/* Brew header row */}
            <button
              onClick={() => toggleBrew(key)}
              className="w-full flex items-start justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left gap-3"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {cfg.icon}
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white truncate block">{brewName}</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    {brewAlerts.length} Fehlgeschmack{brewAlerts.length !== 1 ? 'e' : ''} gemeldet
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${cfg.badgeClass}`}>
                  {cfg.label}
                </span>
                {isExpanded
                  ? <ChevronUp size={12} className="text-zinc-500" />
                  : <ChevronDown size={12} className="text-zinc-500" />
                }
              </div>
            </button>

            {/* Expanded tags list */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                {brewAlerts.map(alert => (
                  <div key={alert.flaggedTag} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-300 capitalize bg-zinc-900/60 px-2 py-0.5 rounded">
                        {alert.flaggedTag}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-400">
                        {alert.occurrences} Nutzer{alert.occurrences !== 1 ? '' : ''}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${
                        alert.severity === 'critical'
                          ? 'bg-red-900/50 text-red-300'
                          : 'bg-amber-900/50 text-amber-300'
                      }`}>
                        {alert.severity === 'critical' ? '≥5' : '≥3'}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
                  <ExternalLink size={9} />
                  Basierend auf dem letzten 30-Tages-Zeitraum
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
