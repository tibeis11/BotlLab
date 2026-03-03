'use client';

// ============================================================================
// Phase 12.3 — Bounties Client (Brewer Dashboard)
// ============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import {
  toggleBountyActive,
  type BrewerBounty,
} from '@/lib/actions/bounty-actions';
import { formatCondition, formatRewardType } from '@/lib/bounty-utils';

interface Props {
  breweryId: string;
  bounties: BrewerBounty[];
  brews: { id: string; name: string }[];
  canManage: boolean;
}

export default function BountiesClient({ breweryId, bounties: initial, brews: _brews, canManage }: Props) {
  const [bounties, setBounties] = useState(initial);

  async function handleToggle(bountyId: string, currentActive: boolean) {
    await toggleBountyActive(bountyId, !currentActive);
    setBounties((prev) =>
      prev.map((b) => (b.id === bountyId ? { ...b, isActive: !currentActive } : b)),
    );
  }

  const activeBounties = bounties.filter(b => b.isActive);
  const inactiveBounties = bounties.filter(b => !b.isActive);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Bounties</h1>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-amber-500 bg-amber-500/10 border border-amber-500/20">
              Rewards
            </span>
          </div>
          <p className="text-sm text-zinc-500">Erstelle Challenges und belohne die besten Taster mit echten Rewards.</p>
        </div>

        <div className="flex items-center gap-4">
          {canManage && (
            <Link
              href={`/team/${breweryId}/bounties/new`}
              className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-md text-sm font-bold border border-transparent transition-all shadow-sm flex items-center gap-2"
            >
              + Neue Bounty
            </Link>
          )}
          <div className="h-8 w-px bg-zinc-800 hidden md:block" />
          <div className="text-right hidden md:block">
            <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">Gesamt</p>
            <p className="text-zinc-300 font-mono text-xs text-right">{bounties.length}</p>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">

        {/* LEFT COLUMN: Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-8 z-20">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="text-amber-500 text-xs font-bold uppercase tracking-wider relative z-10">Aktiv</div>
              <div className="text-2xl font-mono font-bold text-amber-400 relative z-10">{activeBounties.length}</div>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-zinc-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider relative z-10">Inaktiv</div>
              <div className="text-2xl font-mono font-bold text-zinc-400 relative z-10">{inactiveBounties.length}</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              🏹 So funktionieren Bounties
            </h3>
            <div className="space-y-2 text-xs text-zinc-500 leading-relaxed">
              <p>Definiere eine Challenge mit Bedingung (z.B. Match Score &gt; 90%) und einem Reward.</p>
              <p>Nutzer die die Bedingung erfüllen, können den Reward einlösen.</p>
              <p>Du kannst max. Einlösungen und Ablaufdaten festlegen.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Content */}
        <div className="space-y-6">

          {/* Bounties list */}
          {bounties.length === 0 ? (
            <div className="bg-zinc-900/20 border border-zinc-800 border-dashed rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-2 border border-zinc-800">
                <Trophy className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-white">Noch keine Bounties</h3>
              <p className="text-zinc-500 text-sm max-w-sm">
                Erstelle eine Bounty und belohne Taster, die deine Biere am besten kennen.
              </p>
              {canManage && (
                <Link
                  href={`/team/${breweryId}/bounties/new`}
                  className="mt-2 text-amber-500 hover:text-amber-400 text-sm font-bold uppercase tracking-wide border-b-2 border-amber-500/20 hover:border-amber-500 transition-all pb-1"
                >
                  Erste Bounty erstellen
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {bounties.map((bounty) => (
                <BountyCard
                  key={bounty.id}
                  bounty={bounty}
                  canManage={canManage}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}

        </div> {/* End Right Column */}
      </div> {/* End Main Grid */}

    </div>
  );
}

// ─── Bounty Card (brewer view) ──────────────────────────────────────────────
function BountyCard({
  bounty,
  canManage,
  onToggle,
}: {
  bounty: BrewerBounty;
  canManage: boolean;
  onToggle: (id: string, current: boolean) => void;
}) {
  const expired = bounty.expiresAt && new Date(bounty.expiresAt) < new Date();
  const full = bounty.maxClaims !== null && bounty.claimCount >= bounty.maxClaims;
  const inactive = !bounty.isActive || !!expired || !!full;

  return (
    <div className={`bg-zinc-900/40 border rounded-2xl overflow-hidden transition-all hover:border-zinc-700 ${inactive ? 'border-zinc-800 opacity-50' : 'border-amber-800/40 hover:border-amber-700/50'}`}>
      {/* Card Header */}
      <div className="p-4 flex items-start justify-between gap-3 border-b border-zinc-800">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {formatRewardType(bounty.rewardType)}
            </span>
            {bounty.brewName && (
              <span className="text-[10px] text-zinc-600 font-medium truncate">· {bounty.brewName}</span>
            )}
            {expired && (
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Abgelaufen</span>
            )}
            {full && (
              <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ausgeschöpft</span>
            )}
          </div>
          <h3 className="text-sm font-bold text-white leading-tight truncate">{bounty.title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{bounty.description}</p>
        </div>
        {canManage && (
          <button
            onClick={() => onToggle(bounty.id, bounty.isActive)}
            className={`flex-shrink-0 text-[10px] font-black uppercase tracking-wider rounded-md px-2.5 py-1.5 border transition-all ${
              bounty.isActive && !expired && !full
                ? 'border-green-800/60 text-green-500 bg-green-500/5 hover:bg-green-500/10'
                : 'border-zinc-700 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
            }`}
          >
            {bounty.isActive ? '● Aktiv' : '○ Inaktiv'}
          </button>
        )}
      </div>
      {/* Card Body */}
      <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Bedingung</p>
          <p className="text-xs text-zinc-400">🎯 {formatCondition(bounty.conditionType, bounty.conditionValue)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Reward</p>
          <p className="text-xs text-zinc-400">🎁 {bounty.rewardValue}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Einlösungen</p>
          <p className="text-xs text-zinc-400 font-mono">
            {bounty.claimCount}{bounty.maxClaims ? ` / ${bounty.maxClaims}` : ''}
          </p>
        </div>
        {bounty.expiresAt && (
          <div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Läuft ab</p>
            <p className="text-xs text-zinc-400">
              {new Date(bounty.expiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
