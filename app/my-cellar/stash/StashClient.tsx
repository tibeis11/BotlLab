'use client';

// ============================================================================
// Phase 12.2 — Stash Client (Digitaler Kühlschrank)
// ============================================================================

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { removeFromStash, type StashEntry, type PurchaseLocation } from '@/lib/actions/stash-actions';
import { PURCHASE_LOCATION_LABELS } from '@/lib/stash-config';

interface StashClientProps {
  initialStash: StashEntry[];
}

export default function StashClient({ initialStash }: StashClientProps) {
  const [stash, setStash] = useState(initialStash);
  const [isPending, startTransition] = useTransition();

  function handleRemove(brewId: string) {
    startTransition(async () => {
      await removeFromStash(brewId);
      setStash((prev) => prev.filter((e) => e.brewId !== brewId));
    });
  }

  if (stash.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
        <span className="text-6xl">🥶</span>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">Mein Stash</h1>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
            Dein digitaler Kühlschrank ist noch leer. Auf Bier-Seiten kannst du Biere zum Stash hinzufügen!
          </p>
        </div>
        <Link
          href="/discover"
          className="text-xs text-cyan-400 font-bold border border-cyan-800 rounded-full px-5 py-2 hover:bg-cyan-900/20 transition-all"
        >
          Biere entdecken →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-500">Mein</p>
        <h1 className="text-3xl font-black text-white">Stash</h1>
        <p className="text-sm text-zinc-500">
          {stash.length} {stash.length === 1 ? 'Bier' : 'Biere'} kalt gestellt
        </p>
      </div>

      {/* Location breakdown */}
      <LocationBreakdown stash={stash} />

      {/* Stash list */}
      <div className="space-y-3">
        {stash.map((entry) => (
          <StashCard
            key={entry.id}
            entry={entry}
            onRemove={() => handleRemove(entry.brewId)}
            removing={isPending}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Location Breakdown ───────────────────────────────────────────────────────
function LocationBreakdown({ stash }: { stash: StashEntry[] }) {
  const withLocation = stash.filter((e) => e.purchaseLocation);
  if (withLocation.length === 0) return null;

  const counts: Partial<Record<PurchaseLocation, number>> = {};
  for (const entry of withLocation) {
    const loc = entry.purchaseLocation!;
    counts[loc] = (counts[loc] || 0) + 1;
  }

  const sorted = (Object.entries(counts) as [PurchaseLocation, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
        Wo du kaufst
      </p>
      <div className="flex flex-wrap gap-2">
        {sorted.map(([loc, count]) => (
          <div
            key={loc}
            className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1.5 text-xs text-zinc-300"
          >
            <span>{PURCHASE_LOCATION_LABELS[loc].split(' ')[0]}</span>
            <span>{PURCHASE_LOCATION_LABELS[loc].split(' ').slice(1).join(' ')}</span>
            <span className="text-zinc-500 ml-1">×{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stash Card ───────────────────────────────────────────────────────────────
function StashCard({
  entry,
  onRemove,
  removing,
}: {
  entry: StashEntry;
  onRemove: () => void;
  removing: boolean;
}) {
  const addedDate = new Date(entry.addedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-4 items-center">
      {/* Image */}
      {entry.brew.imageUrl ? (
        <img
          src={entry.brew.imageUrl}
          alt={entry.brew.name}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🍺</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <Link
          href={`/b/${entry.brewId}`}
          className="text-sm font-bold text-white hover:text-cyan-400 transition-colors truncate block"
        >
          {entry.brew.name}
        </Link>
        {entry.brew.breweryName && (
          <p className="text-[11px] text-zinc-500 truncate">{entry.brew.breweryName}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {entry.brew.style && (
            <span className="text-[10px] bg-zinc-800 border border-zinc-700 rounded-full px-2 py-0.5 text-zinc-400">
              {entry.brew.style}
            </span>
          )}
          {entry.brew.abv && (
            <span className="text-[10px] text-zinc-600">{entry.brew.abv}% ABV</span>
          )}
          {entry.purchaseLocation && (
            <span className="text-[10px] text-cyan-700">
              {PURCHASE_LOCATION_LABELS[entry.purchaseLocation]}
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-700">{addedDate}</p>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        disabled={removing}
        className="p-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-all disabled:opacity-30"
        title="Aus Stash entfernen"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
