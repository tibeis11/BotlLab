'use client';

// ============================================================================
// Phase 12.3 — Brew Bounties (Consumer View)
//
// Shows active bounties for a brew on the /b/[id] page.
// When the user meets a condition (e.g. match score after Beat the Brewer),
// they can claim the reward and see the QR / discount code.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Target, Gift } from 'lucide-react';
import { toast } from 'sonner';
import {
  claimBounty,
  type BrewerBounty,
} from '@/lib/actions/bounty-actions';
import { formatCondition, formatRewardType } from '@/lib/bounty-utils';
import { useAuth } from '@/app/context/AuthContext';

interface BrewBountiesProps {
  brewId: string;
  /** Pass the user's latest Beat the Brewer match score (0–100) if available */
  latestMatchScore?: number;
}

export default function BrewBounties({ brewId, latestMatchScore }: BrewBountiesProps) {
  const { user } = useAuth();
  const [bounties, setBounties] = useState<BrewerBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimedCodes, setClaimedCodes] = useState<Record<string, string | null>>({});
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { getBrewBounties } = await import('@/lib/actions/bounty-actions');
        const data = await getBrewBounties(brewId);
        if (!cancelled) setBounties(data);
      } catch (err: any) {
        console.error('[BrewBounties] load error:', err);
        if (!cancelled) toast.error('Bounties konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [brewId]);

  if (loading || bounties.length === 0) return null;

  function meetsCondition(bounty: BrewerBounty): boolean {
    if (!user) return false;
    switch (bounty.conditionType) {
      case 'match_score':
        return latestMatchScore !== undefined && latestMatchScore >= bounty.conditionValue;
      case 'vibe_check':
        return true; // always claimable with vibe check intent
      case 'rating_count':
        return false; // not tracked client-side here; will fall through to server validation
      default:
        return false;
    }
  }

  async function handleClaim(bounty: BrewerBounty) {
    if (!user) return;
    setClaiming(bounty.id);
    try {
      const result = await claimBounty(bounty.id);
      if (result.success) {
        setBounties((prev) =>
          prev.map((b) => (b.id === bounty.id ? { ...b, userClaimed: true } : b)),
        );
        setClaimedCodes((prev) => ({ ...prev, [bounty.id]: result.rewardCode ?? null }));
        toast.success('Bounty eingelöst! 🏆');
      } else {
        toast.error('Einlösen fehlgeschlagen. Versuche es nochmal.');
      }
    } catch (err: any) {
      console.error('[BrewBounties] handleClaim error:', err);
      toast.error('Fehler beim Einlösen: ' + (err?.message ?? 'Unbekannter Fehler'));
    } finally {
      setClaiming(null);
    }
  }

  return (
    <section className="space-y-3">
      <p className="text-[10px] uppercase font-black tracking-[0.25em] text-amber-500">
        Brewer Bounties
      </p>

      <div className="space-y-3">
        {bounties.map((bounty) => {
          const qualifies = meetsCondition(bounty);
          const code = claimedCodes[bounty.id];
          const expired = bounty.expiresAt && new Date(bounty.expiresAt) < new Date();
          const full = bounty.maxClaims !== null && bounty.claimCount >= bounty.maxClaims;
          const unavailable = !!(expired || full);

          return (
            <div
              key={bounty.id}
              className={`bg-surface border rounded-2xl p-5 space-y-3 ${
                bounty.userClaimed
                  ? 'border-amber-700/50'
                  : unavailable
                  ? 'border-border opacity-60'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    {formatRewardType(bounty.rewardType)}
                  </span>
                  <h3 className="text-base font-black text-text-primary">{bounty.title}</h3>
                  <p className="text-sm text-text-secondary">{bounty.description}</p>
                </div>
                {bounty.userClaimed && (
                  <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-700 text-amber-400 rounded-full px-2.5 py-1">
                    Claimed ✓
                  </span>
                )}
              </div>

              <div className="text-xs text-text-muted space-y-0.5">
                <p className="flex items-center gap-1"><Target className="w-3.5 h-3.5 inline shrink-0" /> {formatCondition(bounty.conditionType, bounty.conditionValue)}</p>
                <p className="flex items-center gap-1"><Gift className="w-3.5 h-3.5 inline shrink-0" /> Reward: <span className="text-text-secondary font-medium">{bounty.rewardValue}</span></p>
                {bounty.maxClaims && (
                  <p>📊 {bounty.claimCount}/{bounty.maxClaims} Einlösungen</p>
                )}
                {bounty.expiresAt && (
                  <p>⏰ Bis {new Date(bounty.expiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                )}
              </div>

              {/* Reward code reveal */}
              {bounty.userClaimed && code && (
                <div className="bg-amber-500/10 border border-amber-700/50 rounded-xl p-3 text-center space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-widest text-amber-500">
                    Dein Reward-Code
                  </p>
                  <p className="text-2xl font-black text-text-primary tracking-[0.15em]">{code}</p>
                  <p className="text-[11px] text-text-muted">
                    Zeig diesen Code beim nächsten Kauf / Taproom-Besuch.
                  </p>
                </div>
              )}

              {/* Claim button */}
              {!bounty.userClaimed && !unavailable && user && qualifies && (
                <button
                  onClick={() => handleClaim(bounty)}
                  disabled={claiming === bounty.id}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-sm rounded-xl py-2.5 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {claiming === bounty.id ? 'Einlösen…' : '🏆 Reward einlösen'}
                </button>
              )}

              {/* Not qualified hint */}
              {!bounty.userClaimed && !unavailable && user && !qualifies && (
                <p className="text-xs text-text-disabled text-center">
                  Spiele Beat the Brewer um die Bedingung zu erfüllen.
                </p>
              )}

              {/* Not logged in hint */}
              {!user && (
                <p className="text-xs text-text-disabled text-center">
                  Melde dich an, um Bounties einzulösen.
                </p>
              )}

              {unavailable && (
                <p className="text-xs text-text-disabled text-center">
                  {expired ? 'Diese Bounty ist abgelaufen.' : 'Alle Rewards wurden vergeben.'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
