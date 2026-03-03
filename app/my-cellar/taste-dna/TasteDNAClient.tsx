'use client';

// ============================================================================
// Taste DNA — Client Component (Phase 11.2)
//
// Displays the user's aggregate flavor profile as a radar chart,
// stats cards, style breakdown, and recent game history.
// ============================================================================

import React from 'react';
import Link from 'next/link';
import {
  FLAVOR_DIMENSIONS,
  type FlavorDimensionId,
} from '@/lib/flavor-profile-config';
import type { TasteDNAProfile } from '@/lib/actions/taste-dna-actions';
import RadarChart from '@/app/b/[id]/components/RadarChart';
import ShareDNAButton from './ShareDNAButton';

interface TasteDNAClientProps {
  dna: TasteDNAProfile | null;
}

function getDimLabel(id: FlavorDimensionId | null): string {
  if (!id) return '–';
  return FLAVOR_DIMENSIONS.find((d) => d.id === id)?.label ?? id;
}

function getDimIcon(id: FlavorDimensionId | null): string {
  if (!id) return '🎯';
  return FLAVOR_DIMENSIONS.find((d) => d.id === id)?.icon ?? '🎯';
}

export default function TasteDNAClient({ dna }: TasteDNAClientProps) {
  // Not logged in or no data
  if (!dna) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <span className="text-5xl">🧬</span>
        <h1 className="text-2xl font-black text-white">Taste DNA</h1>
        <p className="text-zinc-500 text-sm max-w-sm">
          Melde dich an, um dein Geschmacksprofil zu entdecken.
        </p>
      </div>
    );
  }

  // No games played yet
  if (dna.gamesPlayed === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        <span className="text-6xl">🧬</span>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">Deine Taste DNA</h1>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto">
            Spiele &quot;Beat the Brewer&quot; bei verschiedenen Bieren, um dein persönliches
            Geschmacksprofil zu entdecken.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-xs w-full space-y-4">
          <p className="text-sm text-zinc-400">
            Dein Tasting IQ: <span className="text-cyan-400 font-bold">{dna.tastingIQ}</span>
          </p>
          <p className="text-xs text-zinc-600">
            Scanne ein Bier mit Flavor-Profil und starte Beat the Brewer!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-500">
          Taste DNA
        </p>
        <h1 className="text-3xl font-black text-white">Dein Geschmacksprofil</h1>
        <p className="text-sm text-zinc-500">
          Basierend auf {dna.gamesPlayed} Beat the Brewer {dna.gamesPlayed === 1 ? 'Runde' : 'Runden'}
        </p>
      </div>

      {/* Share button */}
      <div className="max-w-md mx-auto w-full px-1">
        <ShareDNAButton gamesPlayed={dna.gamesPlayed} />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tasting IQ" value={String(dna.tastingIQ)} icon="🧠" />
        <StatCard label="Spiele" value={String(dna.gamesPlayed)} icon="🎮" />
        <StatCard label="Ø Match" value={`${dna.averageMatchScore}%`} icon="🎯" />
        <StatCard label="Best Match" value={`${dna.bestMatchScore}%`} icon="🏆" />
      </div>

      {/* Radar + Strongest Dimension */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center space-y-4">
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
            Dein Geschmacksprofil
          </p>
          <RadarChart
            playerProfile={dna.averageProfile}
            size={260}
          />
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            Durchschnitt deiner Einschätzungen
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
            Deine Dimensionen
          </p>

          {dna.strongestDimension && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 text-center space-y-1">
              <span className="text-2xl">{getDimIcon(dna.strongestDimension)}</span>
              <p className="text-sm font-bold text-cyan-400">
                {getDimLabel(dna.strongestDimension)}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                Deine stärkste Dimension
              </p>
            </div>
          )}

          <div className="space-y-3">
            {FLAVOR_DIMENSIONS.map((dim) => {
              const val = dna.averageProfile[dim.id];
              const percent = Math.round(val * 100);
              return (
                <div key={dim.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                      <span>{dim.icon}</span> {dim.label}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">{percent}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: dim.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Style Preferences */}
      {dna.styleBreakdown.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
            Deine Bierstile
          </p>
          <div className="flex flex-wrap gap-2">
            {dna.styleBreakdown.map(({ style, count }) => (
              <span
                key={style}
                className="bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1.5 text-xs text-zinc-300 font-medium"
              >
                {style}
                <span className="text-zinc-600 ml-1.5">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Games */}
      {dna.recentGames.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
            Letzte Spiele
          </p>
          <div className="space-y-2">
            {dna.recentGames.map((game, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{game.brewName}</p>
                  {game.brewStyle && (
                    <p className="text-[10px] text-zinc-500">{game.brewStyle}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-bold text-cyan-400">{game.matchPercent}%</p>
                    <p className="text-[9px] text-zinc-600">Match</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-400">+{game.pointsEarned}</p>
                    <p className="text-[9px] text-zinc-600">IQ</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ───
function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center space-y-1">
      <span className="text-xl">{icon}</span>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">{label}</p>
    </div>
  );
}
