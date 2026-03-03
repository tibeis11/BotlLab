'use client';

// ============================================================================
// Leaderboard — Client Component (Phase 11.4)
//
// Top 50 users ranked by Tasting IQ with user's own position highlighted.
// ============================================================================

import React from 'react';
import Link from 'next/link';
import type {
  LeaderboardEntry,
  TastingIQInfo,
} from '@/lib/actions/beat-the-brewer-actions';

interface LeaderboardClientProps {
  entries: LeaderboardEntry[];
  myStats: TastingIQInfo;
}

function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function getRankStyle(rank: number): string {
  if (rank === 1) return 'border-yellow-500/30 bg-yellow-500/5';
  if (rank === 2) return 'border-zinc-400/30 bg-zinc-400/5';
  if (rank === 3) return 'border-amber-600/30 bg-amber-600/5';
  return 'border-zinc-800 bg-zinc-900/50';
}

export default function LeaderboardClient({ entries, myStats }: LeaderboardClientProps) {
  const isEmpty = entries.length === 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-500">
          Leaderboard
        </p>
        <h1 className="text-3xl font-black text-white">Tasting IQ Rangliste</h1>
        <p className="text-sm text-zinc-500">
          Die besten Gaumen der Community
        </p>
      </div>

      {/* My stats card */}
      {myStats.tastingIQ > 0 && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-xl">
              🧠
            </div>
            <div>
              <p className="text-sm font-bold text-white">Dein Tasting IQ</p>
              <p className="text-xs text-zinc-500">
                Rang {myStats.rank ?? '–'} von {myStats.totalPlayers} • {myStats.gamesPlayed} Spiele
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-cyan-400">{myStats.tastingIQ}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Punkte</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <span className="text-5xl">🏆</span>
          <p className="text-zinc-500 text-sm max-w-sm">
            Noch keine Einträge. Spiele &quot;Beat the Brewer&quot; um als Erster auf dem Leaderboard zu erscheinen!
          </p>
        </div>
      )}

      {/* Leaderboard table */}
      {!isEmpty && (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${getRankStyle(entry.rank)}`}
              >
                {/* Rank */}
                <div className="w-10 text-center">
                  {isTop3 ? (
                    <span className="text-xl">{getRankEmoji(entry.rank)}</span>
                  ) : (
                    <span className="text-sm font-mono text-zinc-600">#{entry.rank}</span>
                  )}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {entry.logoUrl ? (
                      <img
                        src={entry.logoUrl}
                        alt={entry.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs">👤</span>
                    )}
                  </div>
                  <p className={`text-sm font-semibold truncate ${isTop3 ? 'text-white' : 'text-zinc-300'}`}>
                    {entry.displayName}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className={`text-lg font-black tabular-nums ${isTop3 ? 'text-cyan-400' : 'text-zinc-400'}`}>
                    {entry.tastingIQ}
                  </p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">IQ</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link to Taste DNA */}
      <div className="text-center pt-4">
        <Link
          href="/my-cellar/taste-dna"
          className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          🧬 Dein Taste DNA Profil →
        </Link>
      </div>
    </div>
  );
}
