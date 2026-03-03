'use client';

// ============================================================================
// Beat the Brewer — Interactive Game Component (Phase 11.1)
//
// Flow:
// 1. "Beat the Brewer" CTA card (collapsed)
// 2. Player adjusts 5 flavor sliders (brewer's profile is hidden)
// 3. Submit → server calculates match score + awards tasting IQ
// 4. Reveal animation: radar chart shows both profiles overlapping
// 5. Score display: match %, points earned, dimension breakdown
// ============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  FLAVOR_DIMENSIONS,
  EMPTY_FLAVOR_PROFILE,
  type FlavorDimensionId,
  type FlavorProfile,
} from '@/lib/flavor-profile-config';
import {
  submitBeatTheBrewer,
  type BeatTheBrewerResult,
} from '@/lib/actions/beat-the-brewer-actions';
import { acceptFriendChallenge, type FriendChallenge } from '@/lib/actions/beat-friend-actions';
import RadarChart from './RadarChart';
import BeatAFriendShare from './BeatAFriendShare';

interface BeatTheBrewerGameProps {
  brewId: string;
  brewName: string;
  /** Whether the user has already played this brew */
  alreadyPlayed?: boolean;
  /** Whether the user is logged in */
  isLoggedIn?: boolean;
  /** If set: the user is accepting a friend's challenge (token from URL) */
  challengeToken?: string;
  /** Info about the challenger (shown as context above the game) */
  challengerName?: string | null;
  /** Optional: Rating-ID um flavor_profile mit Bewertung zu verknüpfen (Phase 11.6) */
  ratingId?: string | null;
}

// ──── Score tier labels ────
function getScoreTier(percent: number): { label: string; emoji: string; color: string } {
  if (percent >= 90) return { label: 'Perfekter Gaumen!', emoji: '🏆', color: 'text-yellow-400' };
  if (percent >= 75) return { label: 'Biersommelier!', emoji: '🥇', color: 'text-cyan-400' };
  if (percent >= 60) return { label: 'Guter Geschmack!', emoji: '👏', color: 'text-green-400' };
  if (percent >= 40) return { label: 'Nicht schlecht!', emoji: '🍺', color: 'text-zinc-300' };
  return { label: 'Daneben getippt!', emoji: '😅', color: 'text-orange-400' };
}

export default function BeatTheBrewerGame({
  brewId,
  brewName,
  alreadyPlayed = false,
  isLoggedIn = false,
  challengeToken,
  challengerName,
  ratingId,
}: BeatTheBrewerGameProps) {
  // ─── State ───
  const [phase, setPhase] = useState<'cta' | 'playing' | 'submitting' | 'reveal'>(
    alreadyPlayed ? 'reveal' : 'cta',
  );
  const [sliders, setSliders] = useState<Record<FlavorDimensionId, number>>({
    sweetness: 0.5,
    bitterness: 0.5,
    body: 0.5,
    roast: 0.5,
    fruitiness: 0.5,
  });
  const [result, setResult] = useState<BeatTheBrewerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBrewer, setShowBrewer] = useState(false);
  const [acceptedChallenge, setAcceptedChallenge] = useState<FriendChallenge | null>(null);

  // Cleanup reveal timer on unmount to prevent memory leak
  const showBrewerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (showBrewerTimerRef.current) clearTimeout(showBrewerTimerRef.current); }, []);

  // ─── Handlers ───
  const handleSliderChange = useCallback((dim: FlavorDimensionId, value: number) => {
    setSliders((prev) => ({ ...prev, [dim]: value }));
  }, []);

  const handleStart = useCallback(() => {
    setPhase('playing');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      setError('Bitte melde dich an, um Beat the Brewer zu spielen.');
      return;
    }

    setPhase('submitting');
    setError(null);

    try {
      const res = await submitBeatTheBrewer({
        brewId,
        ratingId: ratingId ?? null,
        playerProfile: sliders,
      });
      setResult(res);
      setPhase('reveal');

      // If accepting a friend challenge, record the head-to-head result
      if (challengeToken) {
        const challengeResult = await acceptFriendChallenge(
          challengeToken,
          { ...sliders, source: 'manual' } as FlavorProfile,
          res.matchPercent,
        );
        if (challengeResult.success && challengeResult.challenge) {
          setAcceptedChallenge(challengeResult.challenge);
        }
      }

      // Staggered reveal animation
      showBrewerTimerRef.current = setTimeout(() => setShowBrewer(true), 600);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Senden.');
      setPhase('playing');
    }
  }, [brewId, sliders, isLoggedIn, challengeToken]);

  // ─── Already played (no result data) ───
  if (alreadyPlayed && !result) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
        <div className="text-3xl">🎮</div>
        <p className="text-sm font-bold text-zinc-300">Beat the Brewer</p>
        <p className="text-xs text-zinc-500">
          Du hast dieses Bier bereits gespielt. Probiere ein anderes!
        </p>
      </div>
    );
  }

  // ─── CTA Card ───
  if (phase === 'cta') {
    return (
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center space-y-4 group hover:border-cyan-500/30 transition-all duration-300">
        {/* Challenge context banner */}
        {challengeToken && challengerName && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-cyan-300">
            <span className="font-black">{challengerName}</span> hat dich herausgefordert! 🤝
          </div>
        )}

        <div className="text-4xl group-hover:scale-110 transition-transform duration-300">🎯</div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white">Beat the Brewer</h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-[250px] mx-auto">
            Kannst du das Geschmacksprofil von <span className="text-cyan-400 font-semibold">{brewName}</span> erraten?
            Stelle die Regler ein und finde heraus, wie gut dein Gaumen ist!
          </p>
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-cyan-500/20"
        >
          🎮 Jetzt spielen
        </button>

        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
          +bis zu 10 Tasting IQ Punkte
        </p>
      </div>
    );
  }

  // ─── Playing Phase ───
  if (phase === 'playing' || phase === 'submitting') {
    const isSubmitting = phase === 'submitting';

    return (
      <div className="bg-zinc-900 border border-cyan-500/20 rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-[10px] uppercase font-black tracking-[0.25em] text-cyan-500">
            Beat the Brewer
          </p>
          <h3 className="text-lg font-black text-white">
            Wie schmeckt {brewName}?
          </h3>
          <p className="text-xs text-zinc-500">
            Stelle ein, wie du das Geschmacksprofil einschätzt.
          </p>
        </div>

        {/* Mini radar preview */}
        <div className="flex justify-center">
          <RadarChart
            playerProfile={sliders}
            size={200}
            className="opacity-80"
          />
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {FLAVOR_DIMENSIONS.map((dim) => (
            <FlavorGameSlider
              key={dim.id}
              dim={dim}
              value={sliders[dim.id]}
              onChange={(v) => handleSliderChange(dim.id, v)}
              disabled={isSubmitting}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-black py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin">⏳</span>
              Auswertung läuft...
            </>
          ) : (
            <>
              🎯 Ergebnis aufdecken
            </>
          )}
        </button>

        {!isLoggedIn && (
          <p className="text-xs text-zinc-500 text-center">
            ⚠️ Du musst angemeldet sein, um Punkte zu erhalten.
          </p>
        )}
      </div>
    );
  }

  // ─── Reveal Phase ───
  if (phase === 'reveal' && result) {
    const tier = getScoreTier(result.matchPercent);

    return (
      <div className="bg-zinc-900 border border-cyan-500/30 rounded-2xl p-6 space-y-6">
        {/* Score Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl">{tier.emoji}</div>
          <div className="space-y-1">
            <p className={`text-sm font-black uppercase tracking-widest ${tier.color}`}>
              {tier.label}
            </p>
            <p className="text-5xl font-black text-white tabular-nums">
              {result.matchPercent}
              <span className="text-2xl text-zinc-500">%</span>
            </p>
            <p className="text-xs text-zinc-500">Übereinstimmung</p>
          </div>

          {/* Points earned */}
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5">
            <span className="text-cyan-400 text-sm font-bold">
              +{result.pointsAwarded} Tasting IQ
            </span>
            <span className="text-[10px] text-zinc-500">
              (Gesamt: {result.newTastingIQ})
            </span>
          </div>
        </div>

        {/* Radar Chart: Player vs Brewer */}
        <div className="flex justify-center">
          <RadarChart
            playerProfile={sliders}
            brewerProfile={result.brewerProfile}
            showBrewer={showBrewer}
            size={280}
          />
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span className="text-zinc-400">Deine Einschätzung</span>
          </div>
          <div
            className="flex items-center gap-1.5 transition-opacity duration-700"
            style={{ opacity: showBrewer ? 1 : 0 }}
          >
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-zinc-400">Brewer&apos;s Profil</span>
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600 mb-3">
            Dimension Details
          </p>
          {FLAVOR_DIMENSIONS.map((dim) => {
            const scores = result.dimensionScores[dim.id];
            const diffPercent = Math.round(scores.diff * 100);
            const isClose = diffPercent <= 15;

            return (
              <div
                key={dim.id}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-5 text-center">{dim.icon}</span>
                <span className="text-zinc-400 w-24 text-xs font-medium">{dim.label}</span>
                <div className="flex-1 flex items-center gap-2">
                  {/* Player value */}
                  <span className="text-cyan-400 text-xs font-mono w-10 text-right">
                    {Math.round(scores.player * 100)}%
                  </span>
                  {/* Visual bar comparison */}
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-cyan-500/60 rounded-full"
                      style={{ width: `${scores.player * 100}%` }}
                    />
                    <div
                      className="absolute top-0 left-0 h-full bg-amber-500/60 rounded-full transition-all duration-700"
                      style={{
                        width: showBrewer ? `${scores.brewer * 100}%` : '0%',
                      }}
                    />
                  </div>
                  {/* Brewer value */}
                  <span
                    className="text-amber-400 text-xs font-mono w-10 transition-opacity duration-700"
                    style={{ opacity: showBrewer ? 1 : 0 }}
                  >
                    {Math.round(scores.brewer * 100)}%
                  </span>
                  {/* Diff badge */}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-opacity duration-700 ${
                      isClose
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-orange-500/10 text-orange-400'
                    }`}
                    style={{ opacity: showBrewer ? 1 : 0 }}
                  >
                    {isClose ? '✓' : `Δ${diffPercent}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Beat a Friend share button */}
        {isLoggedIn && !challengeToken && (
          <BeatAFriendShare
            brewId={brewId}
            playerProfile={{ ...sliders, source: 'manual' } as FlavorProfile}
            matchScore={result.matchPercent}
          />
        )}

        {/* Head-to-head reveal when accepting a challenge */}
        {acceptedChallenge && (
          <FriendHeadToHead challenge={acceptedChallenge} myScore={result.matchPercent} />
        )}
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FriendHeadToHead — Shows head-to-head score comparison after challenge
// ─────────────────────────────────────────────────────────────────────────────

function FriendHeadToHead({
  challenge,
  myScore,
}: {
  challenge: FriendChallenge;
  myScore: number;
}) {
  const iWin = myScore >= challenge.challengerScore;
  const diff = Math.abs(myScore - challenge.challengerScore);

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-amber-500/30 rounded-2xl p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase font-black tracking-[0.25em] text-amber-500">
          Head-to-Head
        </p>
        <p className="text-lg font-black text-white">
          {iWin ? '🏆 Du gewinnst!' : diff === 0 ? '🤝 Unentschieden!' : `💪 ${challenge.challengerDisplayName ?? 'Dein Freund'} gewinnt`}
        </p>
      </div>

      {/* Score comparison */}
      <div className="grid grid-cols-3 gap-3 items-center text-center">
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
          <p className="text-2xl font-black text-cyan-400">{myScore}%</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Du</p>
        </div>
        <div className="text-zinc-600 font-black text-lg">VS</div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-2xl font-black text-amber-400">{challenge.challengerScore}%</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {challenge.challengerDisplayName ?? 'Freund'}
          </p>
        </div>
      </div>

      {/* Radar overlay */}
      <div className="flex flex-col items-center space-y-3">
        {challenge.challengedProfile && (
        <RadarChart
          playerProfile={challenge.challengedProfile}
          brewerProfile={challenge.challengerProfile}
          showBrewer={true}
          size={220}
        />
        )}
        <div className="flex gap-5 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="text-zinc-400">Du</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-zinc-400">{challenge.challengerDisplayName ?? 'Freund'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlavorGameSlider — Slider for a single flavor dimension in game mode
// ─────────────────────────────────────────────────────────────────────────────

interface FlavorGameSliderProps {
  dim: (typeof FLAVOR_DIMENSIONS)[number];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function FlavorGameSlider({ dim, value, onChange, disabled }: FlavorGameSliderProps) {
  const percent = Math.round(value * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>{dim.icon}</span>
          <span>{dim.label}</span>
        </label>
        <span className="text-xs font-mono text-cyan-400">{percent}%</span>
      </div>

      <div className="relative h-8 flex items-center">
        {/* Custom track */}
        <div className="absolute w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${percent}%`,
              backgroundColor: dim.color,
              opacity: 0.6,
            }}
          />
        </div>

        {/* Native range input */}
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={percent}
          onChange={(e) => onChange(parseInt(e.target.value) / 100)}
          disabled={disabled}
          className="w-full h-full absolute z-10 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Custom thumb */}
        <div
          className="pointer-events-none absolute w-5 h-5 rounded-full shadow-md border-2 z-[5] transition-all duration-75"
          style={{
            left: `calc(${percent}% - 10px)`,
            backgroundColor: dim.color,
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        />
      </div>

      <div className="flex justify-between px-0.5">
        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">
          {dim.minLabel}
        </span>
        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">
          {dim.maxLabel}
        </span>
      </div>
    </div>
  );
}
