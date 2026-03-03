'use client';

// ============================================================================
// Phase 13.2 — Bottle Journey Card
//
// Timeline visualization of a bottle's scan history.
// Tier-gated: enterprise only.
// ============================================================================

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { getBottleJourney, getBreweryBottlesForJourney, type BottleJourney, type BottlePickerItem } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';
import { Package, MapPin, Navigation, Clock, Lock, Search, ChevronDown, ChevronUp, Loader2, Wine } from 'lucide-react';

interface Props {
  breweryId: string;
  userTier: UserTier;
}

function TierGate() {
  return (
    <div className="bg-black border border-zinc-800 rounded-lg p-8 text-center space-y-3">
      <Lock className="mx-auto text-cyan-400" size={28} />
      <p className="text-sm font-medium text-zinc-300">Verfügbar ab Enterprise-Plan</p>
      <p className="text-xs text-zinc-500">
        Verfolge den Weg deiner Flaschen zum Trinker.
      </p>
    </div>
  );
}

function JourneyTimeline({ journey }: { journey: BottleJourney }) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const uniqueCities = [...new Set(journey.steps.map((s) => s.city).filter(Boolean))];
  const ownerScans = journey.steps.filter((s) => s.isOwnerScan).length;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs uppercase font-black tracking-widest text-zinc-500 mb-3">Zusammenfassung</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Package size={14} />, label: 'Scans', value: journey.totalScans },
            { icon: <Navigation size={14} />, label: 'Distanz', value: `${journey.totalDistanceKm} km` },
            { icon: <Clock size={14} />, label: 'Tage in Umlauf', value: journey.totalDaysInCirculation },
            { icon: <MapPin size={14} />, label: 'Städte', value: uniqueCities.length || '—' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">{icon}</div>
              <p className="text-lg font-black text-white">{value}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        {journey.filledAt && (
          <p className="text-xs text-zinc-600 mt-3">
            Abgefüllt: {new Date(journey.filledAt).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>

      {/* Timeline */}
      {journey.steps.length === 0 ? (
        <p className="text-center text-zinc-600 text-sm py-6">Noch keine Scans für diese Flasche.</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-px bg-zinc-800" />

          <div className="space-y-1">
            {journey.steps.map((step, i) => {
              const isExpanded = expandedStep === step.scanId;
              const isOwner = step.isOwnerScan;
              const date = new Date(step.scannedAt);

              return (
                <div key={step.scanId}>
                  {/* Distance connector */}
                  {i > 0 && step.distanceFromPreviousKm != null && step.distanceFromPreviousKm > 0 && (
                    <div className="ml-[30px] pl-5 py-1 flex items-center gap-2">
                      <Navigation size={10} className="text-zinc-600 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-600">
                        {step.distanceFromPreviousKm} km
                        {step.daysFromPrevious != null && step.daysFromPrevious > 0
                          ? `, ${step.daysFromPrevious} Tag${step.daysFromPrevious !== 1 ? 'e' : ''} später`
                          : ''}
                      </span>
                    </div>
                  )}

                  {/* Step card */}
                  <button
                    className={`w-full flex items-start gap-3 pl-1 pr-3 py-2 rounded-xl text-left transition-colors
                      ${isExpanded ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'}`}
                    onClick={() => setExpandedStep(isExpanded ? null : step.scanId)}
                  >
                    {/* Numbered dot */}
                    <div className={`w-11 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-black mt-0.5
                      ${isOwner ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      #{i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isOwner ? 'text-zinc-500' : 'text-white'}`}>
                          {step.city ?? step.countryCode ?? 'Unbekannter Ort'}
                          {isOwner && <span className="ml-1 text-[10px] text-zinc-600">(Brauer)</span>}
                        </p>
                        <span className="text-[10px] text-zinc-600 flex-shrink-0">
                          {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </div>

                      {step.scanIntent && (
                        <p className="text-[10px] text-zinc-600 mt-0.5 capitalize">{step.scanIntent}</p>
                      )}
                    </div>

                    {isExpanded ? (
                      <ChevronUp size={14} className="text-zinc-600 mt-1 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-zinc-600 mt-1 flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="ml-14 mr-3 mb-2 bg-zinc-800/40 rounded-lg p-3 space-y-1">
                      {([
                        step.city ? ['Stadt', step.city] : null,
                        step.countryCode ? ['Land', step.countryCode.toUpperCase()] : null,
                        step.latitude != null ? ['GPS', `${step.latitude.toFixed(4)}, ${step.longitude?.toFixed(4)}`] : null,
                        step.deviceType ? ['Gerät', step.deviceType] : null,
                        step.scanIntent ? ['Intent', step.scanIntent] : null,
                      ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([label, value]) => (
                        <div key={label} className="flex gap-2 text-xs">
                          <span className="text-zinc-600 w-16 flex-shrink-0">{label}</span>
                          <span className="text-zinc-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ownerScans > 0 && (
        <p className="text-[10px] text-zinc-700 text-right">
          {ownerScans} Brauer-Scan{ownerScans !== 1 ? 's' : ''} (grau) enthalten
        </p>
      )}
    </div>
  );
}

export default function BottleJourneyCard({ breweryId, userTier }: Props) {
  const [bottles, setBottles] = useState<BottlePickerItem[]>([]);
  const [loadingBottles, setLoadingBottles] = useState(true);
  const [selectedBottleId, setSelectedBottleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [journey, setJourney] = useState<BottleJourney | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (userTier !== 'enterprise') return <TierGate />;

  // Load brewery bottles on mount
  useEffect(() => {
    setLoadingBottles(true);
    getBreweryBottlesForJourney(breweryId)
      .then((data) => setBottles(data))
      .catch(() => setBottles([]))
      .finally(() => setLoadingBottles(false));
  }, [breweryId]);

  // Filter bottles by search query (number or brew name)
  const filteredBottles = useMemo(() => {
    if (!searchQuery.trim()) return bottles;
    const q = searchQuery.toLowerCase().replace('#', '');
    return bottles.filter((b) =>
      String(b.bottleNumber).includes(q) ||
      b.brewName?.toLowerCase().includes(q) ||
      b.brewStyle?.toLowerCase().includes(q)
    );
  }, [bottles, searchQuery]);

  // Bottles with scans first, then by number
  const sortedBottles = useMemo(() => {
    return [...filteredBottles].sort((a, b) => {
      if (b.scanCount !== a.scanCount) return b.scanCount - a.scanCount;
      return b.bottleNumber - a.bottleNumber;
    });
  }, [filteredBottles]);

  const selectedBottle = bottles.find((b) => b.id === selectedBottleId);

  const handleSelectBottle = (bottle: BottlePickerItem) => {
    setSelectedBottleId(bottle.id);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setError(null);
    setJourney(null);

    startTransition(async () => {
      const result = await getBottleJourney(bottle.id);
      if (!result) {
        setError('Keine Reisedaten für diese Flasche gefunden.');
      } else {
        setJourney(result);
      }
    });
  };

  return (
    <div className="bg-black border border-zinc-800 rounded-lg p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Package size={18} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Flaschen-Reise</h3>
          <p className="text-xs text-zinc-500">Wähle eine Flasche aus deinem Inventar</p>
        </div>
      </div>

      {/* Bottle Picker */}
      <div className="relative">
        {/* Selected bottle / trigger button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3 text-left transition-colors hover:border-zinc-600 focus:outline-none focus:border-amber-500/50"
        >
          {loadingBottles ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={14} className="animate-spin" />
              Flaschen laden…
            </div>
          ) : selectedBottle ? (
            <>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Wine size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white font-mono">#{selectedBottle.bottleNumber}</span>
                  {selectedBottle.brewName && (
                    <span className="text-xs text-zinc-400 truncate">{selectedBottle.brewName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedBottle.scanCount > 0 && (
                    <span className="text-[10px] text-emerald-400">{selectedBottle.scanCount} Scans</span>
                  )}
                  {selectedBottle.brewStyle && (
                    <span className="text-[10px] text-zinc-600">{selectedBottle.brewStyle}</span>
                  )}
                </div>
              </div>
              <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </>
          ) : (
            <>
              <Search size={14} className="text-zinc-600" />
              <span className="text-sm text-zinc-500 flex-1">Flasche auswählen…</span>
              <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Search within dropdown */}
            <div className="p-2 border-b border-zinc-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suche nach Nummer oder Rezept…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Bottle list */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {sortedBottles.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-zinc-500">
                    {bottles.length === 0 ? 'Keine Flaschen im Inventar' : 'Keine Treffer'}
                  </p>
                </div>
              ) : (
                sortedBottles.map((bottle) => (
                  <button
                    key={bottle.id}
                    onClick={() => handleSelectBottle(bottle)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/80 ${
                      selectedBottleId === bottle.id ? 'bg-zinc-800/60' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                      <span className="text-[10px] font-black text-zinc-400 font-mono">#{bottle.bottleNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">
                        {bottle.brewName ?? <span className="italic text-zinc-600">Kein Rezept</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {bottle.brewStyle && (
                          <span className="text-[10px] text-zinc-600">{bottle.brewStyle}</span>
                        )}
                        {bottle.filledAt && (
                          <span className="text-[10px] text-zinc-700">
                            Abgefüllt {new Date(bottle.filledAt).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      {bottle.scanCount > 0 ? (
                        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {bottle.scanCount} Scans
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-700">0 Scans</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Summary footer */}
            {bottles.length > 0 && (
              <div className="px-3 py-2 border-t border-zinc-800 text-[10px] text-zinc-600">
                {bottles.length} Flaschen im Inventar
                {bottles.filter(b => b.scanCount > 0).length > 0 && (
                  <> · {bottles.filter(b => b.scanCount > 0).length} mit Scans</>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 size={16} className="animate-spin text-amber-400" />
          <span className="text-xs text-zinc-500">Reisedaten laden…</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
      )}

      {journey && !isPending && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3">
            Reise von{' '}
            <span className="text-white">
              {selectedBottle ? `#${selectedBottle.bottleNumber}` : ''}{' '}
              {journey.brewName ? `— ${journey.brewName}` : journey.bottleId.slice(-6)}
            </span>
          </p>
          <JourneyTimeline journey={journey} />
        </div>
      )}
    </div>
  );
}
