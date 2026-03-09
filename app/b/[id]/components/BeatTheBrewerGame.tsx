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
  Target, Gamepad2, Trophy, Award, ThumbsUp, Minus,
  Loader2, AlertTriangle, Swords, Users, RefreshCw, Info,
} from 'lucide-react';
import {
  FLAVOR_DIMENSIONS,
  EMPTY_FLAVOR_PROFILE,
  type FlavorDimensionId,
  type FlavorProfile,
} from '@/lib/flavor-profile-config';
import {
  submitBeatTheBrewer,
  getBrewBTBResult,
  type BeatTheBrewerResult,
  type HistoricalBTBResult,
} from '@/lib/actions/beat-the-brewer-actions';
import { acceptFriendChallenge, type FriendChallenge } from '@/lib/actions/beat-friend-actions';
import { getBrewFlavorProfile } from '@/lib/rating-analytics';
import RadarChart from './RadarChart';
import BeatAFriendShare from './BeatAFriendShare';
import UniversalSlider from './UniversalSlider';

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
  /** QR token for nonce-based anti-replay (Phase 3.2) */
  qrToken?: string | null;
  /** Bottle UUID for nonce validation */
  bottleId?: string | null;
  /** Brewing session UUID — scopes BTB per batch */
  sessionId?: string | null;
}

// ──── Score tier labels ────
type ScoreTier = { label: string; icon: React.ReactNode; color: string };
function getScoreTier(percent: number): ScoreTier {
  if (percent >= 90) return { label: 'Perfekter Gaumen!', icon: <Trophy size={36} />, color: 'text-rating' };
  if (percent >= 75) return { label: 'Biersommelier!',    icon: <Award size={36} />,  color: 'text-brand' };
  if (percent >= 60) return { label: 'Guter Geschmack!', icon: <ThumbsUp size={36} />, color: 'text-success' };
  if (percent >= 40) return { label: 'Nicht schlecht!',  icon: <Minus size={36} />,   color: 'text-text-secondary' };
  return                     { label: 'Daneben getippt!', icon: <Target size={36} />,  color: 'text-error' };
}

export default function BeatTheBrewerGame({
  brewId,
  brewName,
  alreadyPlayed = false,
  isLoggedIn = false,
  challengeToken,
  challengerName,
  ratingId,
  qrToken,
  bottleId,
  sessionId,
}: BeatTheBrewerGameProps) {
  // ─── State ───
  const [phase, setPhase] = useState<'cta' | 'playing' | 'submitting' | 'reveal' | 'error'>(
    alreadyPlayed ? 'reveal' : 'cta',
  );
  const [sliders, setSliders] = useState<Record<FlavorDimensionId, number>>({
    sweetness: 0.5,
    bitterness: 0.5,
    body: 0.5,
    roast: 0.5,
    fruitiness: 0.5,
  });
  const [touched, setTouched] = useState<Record<FlavorDimensionId, boolean>>({
    sweetness: false,
    bitterness: false,
    body: false,
    roast: false,
    fruitiness: false,
  });
  const [result, setResult] = useState<BeatTheBrewerResult | null>(null);
  const [historicalResult, setHistoricalResult] = useState<HistoricalBTBResult | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBrewer, setShowBrewer] = useState(false);
  const [acceptedChallenge, setAcceptedChallenge] = useState<FriendChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(!!challengeToken);
  const [communityProfile, setCommunityProfile] = useState<Record<string, number> | null>(null);

  // Cleanup reveal timer on unmount to prevent memory leak
  const showBrewerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (showBrewerTimerRef.current) clearTimeout(showBrewerTimerRef.current); }, []);

  // Phase 3.1: Load historical result for already-played users
  useEffect(() => {
    if (!isLoggedIn) return;
    setHistoricalLoading(true);
    getBrewBTBResult(brewId, sessionId)
      .then((res) => {
        if (res) {
          setHistoricalResult(res);
          setResult(res);
          setSliders({
            sweetness: res.dimensionScores.sweetness.player,
            bitterness: res.dimensionScores.bitterness.player,
            body: res.dimensionScores.body.player,
            roast: res.dimensionScores.roast.player,
            fruitiness: res.dimensionScores.fruitiness.player,
          });
          setPhase('reveal');
          setShowBrewer(true);
        }
      })
      .catch(() => { /* silent — show CTA as fallback */ })
      .finally(() => setHistoricalLoading(false));
  }, [brewId, sessionId, isLoggedIn]);

  // ─── Handlers ───
  const handleSliderChange = useCallback((dim: FlavorDimensionId, value: number) => {
    setSliders((prev) => ({ ...prev, [dim]: value }));
    setTouched((prev) => ({ ...prev, [dim]: true }));
  }, []);

  const handleStart = useCallback(() => {
    setPhase('playing');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setPhase('submitting');
    setError(null);

    try {
      const res = await submitBeatTheBrewer({
        brewId,
        ratingId: ratingId ?? null,
        playerProfile: sliders,
        qrToken: qrToken ?? null,
        bottleId: bottleId ?? null,
        sessionId: sessionId ?? null,
      });
      setResult(res);
      // Sync sliders to the actual result player profile so radar and bars always match.
      // This is critical when the server returns a stored historical result (e.g. anonymous
      // already-played path) instead of echoing back what the user just entered.
      setSliders({
        sweetness:  res.dimensionScores.sweetness.player,
        bitterness: res.dimensionScores.bitterness.player,
        body:       res.dimensionScores.body.player,
        roast:      res.dimensionScores.roast.player,
        fruitiness: res.dimensionScores.fruitiness.player,
      });
      setPhase('reveal');

      // Store anonymous session token for post-registration claiming
      // Phase 6.4: Scope by sessionId (or brewId fallback) so multiple plays don't overwrite
      if (res.isAnonymous && res.sessionToken) {
        try {
          const storageKey = sessionId
            ? `btb_pending_token_${sessionId}`
            : `btb_pending_token_${brewId}`;
          localStorage.setItem(storageKey, res.sessionToken);
        } catch { /* localStorage may be unavailable */ }
      }

      // Phase 3.6: Load community profile for reveal overlay
      getBrewFlavorProfile(brewId)
        .then((cp) => {
          if (cp) {
            const { source, _count, ...profile } = cp as any;
            setCommunityProfile(profile);
          }
        })
        .catch(() => { /* non-fatal */ });

      // If accepting a friend challenge, record the head-to-head result
      if (challengeToken && !res.isAnonymous) {
        setChallengeLoading(true);
        try {
          const challengeResult = await acceptFriendChallenge(
            challengeToken,
            { ...sliders, source: 'manual' } as FlavorProfile,
            res.matchPercent,
          );
          if (challengeResult.success && challengeResult.challenge) {
            setAcceptedChallenge(challengeResult.challenge);
          }
        } finally {
          setChallengeLoading(false);
        }
      }

      // Staggered reveal animation
      showBrewerTimerRef.current = setTimeout(() => setShowBrewer(true), 600);
    } catch (err: any) {
      const msg = err?.message ?? 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
      if (!msg.includes('Als Brauer')) console.error('[beat-the-brewer] submit error:', err);
      setError(msg);
      setPhase('error');
    }
  }, [brewId, sliders, isLoggedIn, challengeToken]);

  // ─── Loading historical result ───
  if (historicalLoading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-3">
        <Loader2 size={28} className="mx-auto text-text-disabled animate-spin" />
        <p className="text-sm font-bold text-text-secondary">Beat the Brewer</p>
        <p className="text-xs text-text-muted">Lade dein Ergebnis…</p>
      </div>
    );
  }

  // ─── Already played (no result data — fallback) ───
  if (alreadyPlayed && !result && !historicalResult) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-3">
        <Gamepad2 size={28} className="mx-auto text-text-disabled" />
        <p className="text-sm font-bold text-text-secondary">Beat the Brewer</p>
        <p className="text-xs text-text-muted">
          Du hast dieses Bier bereits gespielt. Probiere ein anderes!
        </p>
      </div>
    );
  }

  // ─── CTA Card ───
  if (phase === 'cta') {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4 group hover:border-brand/30 transition-all duration-300">
        {/* Challenge context banner */}
        {challengeToken && challengerName && (
          <div className="bg-brand-bg border border-brand/20 rounded-xl px-4 py-3 text-sm text-brand flex items-center justify-center gap-2">
            <Users size={14} />
            <span><span className="font-black">{challengerName}</span> hat dich herausgefordert!</span>
          </div>
        )}

        <Target size={36} className="mx-auto text-brand group-hover:scale-110 transition-transform duration-300" />
        <div className="space-y-1">
          <h3 className="text-lg font-black text-text-primary">Beat the Brewer</h3>
          <p className="text-xs text-text-muted leading-relaxed max-w-[250px] mx-auto">
            Kannst du das Geschmacksprofil von <span className="text-brand font-semibold">{brewName}</span> erraten?
            Stelle die Regler ein und finde heraus, wie gut dein Gaumen ist!
          </p>
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-brand hover:bg-brand-hover text-white font-black py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
        >
          <Gamepad2 size={16} /> Jetzt spielen
        </button>

        <p className="text-[10px] text-text-disabled uppercase font-bold tracking-widest">
          +bis zu 10 Tasting IQ Punkte
        </p>
      </div>
    );
  }

  // ─── Error Phase (3.5) ───
  if (phase === 'error') {
    const isBrewerInfo = error?.includes('Als Brauer');
    return (
      <div className={`bg-surface border rounded-2xl p-6 space-y-5 ${isBrewerInfo ? 'border-border' : 'border-error/20'}`}>
        <div className="text-center space-y-3">
          {isBrewerInfo
            ? <Gamepad2 size={36} className="mx-auto text-text-disabled" />
            : <AlertTriangle size={36} className="mx-auto text-error" />}
          <h3 className="text-lg font-black text-text-primary">
            {isBrewerInfo ? 'Beat the Brewer' : 'Etwas ist schiefgelaufen'}
          </h3>
          <p className="text-sm text-text-muted">
            {error || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'}
          </p>
        </div>
        {!isBrewerInfo && (
          <>
            <button
              onClick={() => { setError(null); setPhase('playing'); }}
              className="w-full bg-brand hover:bg-brand-hover text-white font-black py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Erneut versuchen
            </button>
            <p className="text-[10px] text-text-disabled text-center">
              Deine Einstellungen bleiben erhalten.
            </p>
          </>
        )}
      </div>
    );
  }

  // ─── Playing Phase ───
  if (phase === 'playing' || phase === 'submitting') {
    const isSubmitting = phase === 'submitting';
    const allTouched = FLAVOR_DIMENSIONS.every((dim) => touched[dim.id]);

    return (
      <div className="bg-surface border border-brand/20 rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-[10px] uppercase font-black tracking-[0.25em] text-brand">
            Beat the Brewer
          </p>
          <h3 className="text-lg font-black text-text-primary">
            Wie schmeckt {brewName}?
          </h3>
          <p className="text-xs text-text-muted">
            Stelle ein, wie du das Geschmacksprofil einschätzt.
          </p>
        </div>

        {/* Phase 3.2: Compact dimension dots instead of mini-radar */}
        <div className="flex justify-center gap-2">
          {FLAVOR_DIMENSIONS.map((dim) => (
            <div key={dim.id} className="flex flex-col items-center gap-1">
              <div
                className="w-4 h-4 rounded-full border transition-all duration-150"
                style={{
                  backgroundColor: touched[dim.id] ? dim.hexColor : 'transparent',
                  borderColor: touched[dim.id] ? dim.hexColor : 'rgba(161,161,170,0.3)',
                  opacity: touched[dim.id] ? 0.4 + sliders[dim.id] * 0.6 : 0.3,
                }}
              />
              <span className="text-[8px] text-text-disabled font-bold">{dim.labelShort}</span>
            </div>
          ))}
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
              touched={touched[dim.id]}
            />
          ))}
        </div>

        {/* Phase 3.3: Hint when not all sliders are touched */}
        {!allTouched && (
          <p className="text-[10px] text-text-disabled text-center">
            Tipp: Stelle alle Regler ein für ein genaues Ergebnis.
          </p>
        )}

        {error && (
          <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-sm text-error flex items-center gap-2">
            <AlertTriangle size={14} className="flex-shrink-0" />{error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-brand hover:bg-brand-hover disabled:bg-surface-hover disabled:text-text-disabled text-white font-black py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand/20 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" />Auswertung läuft...</>
          ) : (
            <><Target size={16} />Ergebnis aufdecken</>
          )}
        </button>

        {!isLoggedIn && (
          <p className="text-xs text-text-muted text-center leading-relaxed">
            Auch ohne Account spielbar! Registriere dich um Punkte zu sammeln.
          </p>
        )}
      </div>
    );
  }

  // ─── Reveal Phase ───
  if (phase === 'reveal' && result) {
    const tier = getScoreTier(result.matchPercent);
    const isHistorical = !!(historicalResult as HistoricalBTBResult)?.playedAt;

    return (
      <div className="bg-surface border border-brand/30 rounded-2xl p-6 space-y-6">
        {/* Score Header */}
        <div className="text-center space-y-3">

          {/* Already-played notice — shown for historical, anonymous repeat, and nonce-reused plays */}
          {(isHistorical || result.alreadyPlayed) && (
            <div className="bg-brand-bg border border-brand/20 rounded-xl px-4 py-2.5 text-xs text-brand flex items-center justify-center gap-2">
              <Info size={14} className="flex-shrink-0" />
              <span>
                Du hast dieses Bier bereits gespielt — hier ist dein Ergebnis.
                {isHistorical && (historicalResult as HistoricalBTBResult).playedAt && (
                  <> ({new Date((historicalResult as HistoricalBTBResult).playedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })})</>
                )}
              </span>
            </div>
          )}

          <div className={`flex justify-center ${tier.color}`}>{tier.icon}</div>
          <div className="space-y-1">
            <p className={`text-sm font-black uppercase tracking-widest ${tier.color}`}>
              {tier.label}
            </p>
            <p className="text-5xl font-black text-text-primary tabular-nums">
              {result.matchPercent}
              <span className="text-2xl text-text-disabled">%</span>
            </p>
            <p className="text-xs text-text-muted">Übereinstimmung</p>
          </div>

          {/* Points / CTA */}
          {result.alreadyPlayed ? null : result.isAnonymous ? (
            <div className="space-y-1">
              <p className="text-xs text-text-muted">
                Registriere dich um{' '}
                <span className="font-bold text-brand">+{result.pointsAwarded} Tasting IQ</span>{' '}
                zu sichern.
              </p>
              <a
                href="/login?intent=drink&register=true"
                onClick={(e) => {
                  e.preventDefault();
                  const url = new URL('/login', window.location.origin);
                  url.searchParams.set('intent', 'drink');
                  url.searchParams.set('register', 'true');
                  
                  // Go back to the bottle page after login
                  const callbackUrl = new URL(window.location.href);
                  if (result.sessionToken) {
                    callbackUrl.searchParams.set('claim_token', result.sessionToken);
                  }
                  url.searchParams.set('callbackUrl', callbackUrl.toString());

                  window.location.href = url.toString();
                }}
                className="inline-block text-brand hover:text-brand-hover text-xs font-bold underline underline-offset-2 transition-colors"
              >
                Jetzt Account erstellen →
              </a>
            </div>
          ) : !isHistorical ? (
            <div className="inline-flex items-center gap-2 bg-brand-bg border border-brand/20 rounded-full px-4 py-1.5">
              <span className="text-brand text-sm font-bold">
                +{result.pointsAwarded} Tasting IQ
              </span>
              <span className="text-[10px] text-text-disabled">
                (Gesamt: {result.newTastingIQ})
              </span>
            </div>
          ) : null}
        </div>

        {/* Radar Chart: Player vs Brewer + optional Community overlay (3.6) */}
        <div className="flex justify-center">
          <RadarChart
            playerProfile={sliders}
            brewerProfile={result.brewerProfile}
            communityProfile={communityProfile}
            showBrewer={showBrewer}
            size={280}
          />
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-brand" />
            <span className="text-text-secondary">Deine Einschätzung</span>
          </div>
          <div
            className="flex items-center gap-1.5 transition-opacity duration-700"
            style={{ opacity: showBrewer ? 1 : 0 }}
          >
            <div className="w-3 h-3 rounded-full bg-rating" />
            <span className="text-text-secondary">Brewer&apos;s Profil</span>
          </div>
          {communityProfile && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2 border-text-disabled bg-transparent" />
              <span className="text-text-secondary">Community</span>
            </div>
          )}
        </div>

        {/* Dimension Breakdown — Phase 4.3: two separate bars (no more overlap), Phase 4.4: consistent diff badge */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-black tracking-widest text-text-disabled mb-1">
            Dimension Details
          </p>
          {FLAVOR_DIMENSIONS.map((dim) => {
            const scores = result.dimensionScores[dim.id];
            const diffPercent = Math.round(scores.diff * 100);
            const isClose = diffPercent <= 15;

            return (
              <div key={dim.id} className="space-y-1">
                {/* Label row + diff badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dim.hexColor }} />
                    <span className="text-text-muted text-xs font-medium">{dim.labelShort}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-opacity duration-700 ${
                      isClose ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}
                    style={{ opacity: showBrewer ? 1 : 0 }}
                  >
                    {isClose ? `✓ ±${diffPercent}%` : `△ ±${diffPercent}%`}
                  </span>
                </div>
                {/* Player bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand/60 rounded-full"
                      style={{ width: `${scores.player * 100}%` }}
                    />
                  </div>
                  <span className="text-brand text-[10px] font-mono w-7 text-right flex-shrink-0">
                    {Math.round(scores.player * 100)}%
                  </span>
                </div>
                {/* Brewer bar (revealed) */}
                <div
                  className="flex items-center gap-2 transition-opacity duration-700"
                  style={{ opacity: showBrewer ? 1 : 0 }}
                >
                  <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rating/60 rounded-full"
                      style={{ width: `${scores.brewer * 100}%` }}
                    />
                  </div>
                  <span className="text-rating text-[10px] font-mono w-7 text-right flex-shrink-0">
                    {Math.round(scores.brewer * 100)}%
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

        {/* Phase 3.4: Challenge skeleton or head-to-head */}
        {challengeToken && (
          challengeLoading
            ? <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse h-40" />
            : acceptedChallenge && <FriendHeadToHead challenge={acceptedChallenge} myScore={result.matchPercent} />
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
    <div className="bg-surface border border-rating/30 rounded-2xl p-5 space-y-4">
      <div className="text-center space-y-1">
        <div className="flex justify-center">
          {iWin
            ? <Trophy size={24} className="text-rating" />
            : diff === 0
              ? <Swords size={24} className="text-text-muted" />
              : <Award size={24} className="text-text-muted" />
          }
        </div>
        <p className="text-[10px] uppercase font-black tracking-[0.25em] text-rating">
          Head-to-Head
        </p>
        <p className="text-lg font-black text-text-primary">
          {iWin
            ? 'Du gewinnst!'
            : diff === 0
              ? 'Unentschieden!'
              : `${challenge.challengerDisplayName ?? 'Dein Freund'} gewinnt`}
        </p>
      </div>

      {/* Score comparison */}
      <div className="grid grid-cols-3 gap-3 items-center text-center">
        <div className="bg-brand-bg border border-brand/20 rounded-xl p-3">
          <p className="text-2xl font-black text-brand">{myScore}%</p>
          <p className="text-[10px] text-text-disabled mt-0.5">Du</p>
        </div>
        <div className="text-text-disabled font-black text-lg">VS</div>
        <div className="bg-surface-hover border border-border rounded-xl p-3">
          <p className="text-2xl font-black text-rating">{challenge.challengerScore}%</p>
          <p className="text-[10px] text-text-disabled mt-0.5">
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
            <div className="w-2.5 h-2.5 rounded-full bg-brand" />
            <span className="text-text-secondary">Du</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rating" />
            <span className="text-text-secondary">{challenge.challengerDisplayName ?? 'Freund'}</span>
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
  touched?: boolean;
}

function FlavorGameSlider({ dim, value, onChange, disabled, touched = true }: FlavorGameSliderProps) {
  const percent = Math.round(value * 100);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-text-primary flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-150"
            style={{ backgroundColor: touched ? dim.hexColor : 'rgba(161,161,170,0.4)' }}
          />
          {dim.label}
          <button
            type="button"
            className="text-text-disabled hover:text-text-muted transition-colors"
            onClick={() => setShowTooltip((v) => !v)}
            aria-label={`Info: ${dim.label}`}
          >
            <Info size={12} />
          </button>
        </label>
        <span className={`text-xs font-mono ${touched ? 'text-brand' : 'text-text-disabled'}`}>
          {touched ? `${percent}%` : '—'}
        </span>
      </div>

      {showTooltip && (
        <p className="text-[11px] text-text-muted leading-snug -mt-0.5 mb-0.5 pl-[18px]">
          {dim.description}
        </p>
      )}

      <UniversalSlider
        value={touched ? value : undefined}
        onChange={(v) => onChange(v)}
        min={0}
        max={1}
        step={0.01}
        color={dim.hexColor}
        minLabel={dim.minLabel}
        maxLabel={dim.maxLabel}
        disabled={disabled}
      />
    </div>
  );
}
