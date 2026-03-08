'use client';

// ============================================================================
// Leaderboard — Client Component (Phase 11.4)
//
// Top 50 users ranked by Tasting IQ with user's own position highlighted.
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
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
  if (rank === 2) return 'border-border-hover bg-surface-hover/50';
  if (rank === 3) return 'border-amber-600/30 bg-amber-600/5';
  return 'border-border bg-surface/50';
}

export default function LeaderboardClient({ entries, myStats }: LeaderboardClientProps) {
  const isEmpty = entries.length === 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand">
          Leaderboard
        </p>
        <h1 className="text-3xl font-bold text-text-primary">Tasting IQ Rangliste</h1>
        <p className="text-sm text-text-muted">
          Die besten Gaumen der Community
        </p>
      </div>

      {/* My stats card */}
      {myStats.tastingIQ > 0 && (
        <div className="bg-brand-bg border border-brand/20 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-bg border border-brand/30 flex items-center justify-center">
              <User className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Dein Tasting IQ</p>
              <p className="text-xs text-text-muted">
                Rang {myStats.rank ?? '–'} von {myStats.totalPlayers} • {myStats.gamesPlayed} Spiele
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand">{myStats.tastingIQ}</p>
            <p className="text-[10px] text-text-disabled uppercase tracking-widest font-bold">Punkte</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <p className="text-text-muted text-sm max-w-sm">
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
                    <span className="text-sm font-mono text-text-disabled">#{entry.rank}</span>
                  )}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-surface-hover border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {entry.logoUrl ? (
                      <img
                        src={entry.logoUrl}
                        alt={entry.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-text-disabled" />
                    )}
                  </div>
                  <p className={`text-sm font-semibold truncate ${isTop3 ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {entry.displayName}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className={`text-lg font-bold tabular-nums ${isTop3 ? 'text-brand' : 'text-text-muted'}`}>
                    {entry.tastingIQ}
                  </p>
                  <p className="text-[9px] text-text-disabled uppercase tracking-wider">IQ</p>
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
          className="text-sm text-brand hover:text-brand-hover font-medium transition-colors"
        >
          Dein Taste DNA Profil →
        </Link>
      </div>
    </div>
  );
}
