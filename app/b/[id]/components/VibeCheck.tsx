'use client';

// ============================================================================
// Vibe Check — Emoji context picker (Phase 11.3)
//
// Quick 1-tap interaction: "Wo trinkst du dieses Bier?"
// Awards 3 Tasting IQ points, shows community results after submission.
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  submitVibeCheck,
  type VibeCheckResult,
} from '@/lib/actions/beat-the-brewer-actions';

// ─── Vibe options ───
const VIBE_OPTIONS = [
  { id: 'bbq', emoji: '🔥', label: 'BBQ / Grillen' },
  { id: 'friends', emoji: '🍻', label: 'Mit Freunden' },
  { id: 'outdoor', emoji: '🌳', label: 'Draußen' },
  { id: 'couch', emoji: '🛋️', label: 'Auf der Couch' },
  { id: 'dinner', emoji: '🍽️', label: 'Zum Essen' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'solo', emoji: '🧘', label: 'Feierabend' },
  { id: 'sports', emoji: '⚽', label: 'Beim Sport' },
  { id: 'date', emoji: '💕', label: 'Date Night' },
  { id: 'beach', emoji: '🏖️', label: 'Strand / See' },
  { id: 'camping', emoji: '⛺', label: 'Camping' },
  { id: 'tasting', emoji: '🍷', label: 'Tasting' },
] as const;

interface VibeCheckProps {
  brewId: string;
  bottleId: string;
  alreadySubmitted?: boolean;
  isLoggedIn?: boolean;
  communityVibes?: { vibe: string; percentage: number }[];
  /** QR token for HMAC validation + nonce-based anti-replay */
  qrToken?: string | null;
  /** Brewing session UUID — scopes nonce per batch */
  sessionId?: string | null;
  /** Called after successful VibeCheck submit — triggers Tier-2 highlight */
  onComplete?: () => void;
}

export default function VibeCheck({
  brewId,
  bottleId,
  alreadySubmitted = false,
  isLoggedIn = false,
  communityVibes: initialVibes,
  qrToken,
  sessionId,
  onComplete,
}: VibeCheckProps) {
  const [phase, setPhase] = useState<'pick' | 'submitting' | 'result'>(
    alreadySubmitted ? 'result' : 'pick',
  );
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<VibeCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use initial community vibes or result vibes
  const communityVibes = result?.communityVibes ?? initialVibes ?? [];

  const toggleVibe = useCallback((vibeId: string) => {
    setSelectedVibes((prev) => {
      const next = new Set(prev);
      if (next.has(vibeId)) {
        next.delete(vibeId);
      } else if (next.size < 3) {
        // Max 3 vibes
        next.add(vibeId);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedVibes.size === 0) return;

    setPhase('submitting');
    setError(null);

    try {
      if (!qrToken) {
        throw new Error('QR-Code erforderlich. Bitte scanne den QR-Code auf der Flasche.');
      }
      const res = await submitVibeCheck({
        brewId,
        bottleId,
        vibes: Array.from(selectedVibes),
        qrToken,
        sessionId: sessionId ?? null,
      });
      setResult(res);
      setPhase('result');

      // Store anonymous session token for post-registration claiming
      if (res.isAnonymous && res.sessionToken) {
        try {
          localStorage.setItem('vibe_pending_token', res.sessionToken);
        } catch { /* localStorage may be unavailable */ }
      }

      onComplete?.();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Senden.');
      setPhase('pick');
    }
  }, [brewId, bottleId, selectedVibes, qrToken, sessionId, onComplete]);

  // ─── Already submitted (no result data) ───
  if (alreadySubmitted && !result) {
    if (communityVibes.length === 0) {
      return (
        <div className="bg-surface/60 border border-border rounded-2xl p-5 text-center space-y-2">
          <span className="text-2xl">&#x2705;</span>
          <p className="text-sm text-text-secondary">Danke für deinen Vibe-Check!</p>
        </div>
      );
    }
    return (
      <VibeCheckCommunityDisplay
        communityVibes={communityVibes}
        title="Vibe Check"
      />
    );
  }

  // ─── Result phase ───
  if (phase === 'result' && result) {
    return (
      <div className="bg-surface/60 border border-border rounded-2xl p-5 space-y-4">
        {/* Points earned */}
        <div className="text-center space-y-2">
          <span className="text-3xl">&#x2705;</span>
          <p className="text-sm font-bold text-text-primary">Vibe Check abgeschlossen!</p>
          {result.isAnonymous ? (
            <p className="text-xs text-text-muted">
              Mit einem Account h&auml;ttest du <span className="font-bold text-green-400">+{result.pointsAwarded} Tasting IQ</span> erhalten.
            </p>
          ) : (
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5">
              <span className="text-green-400 text-sm font-bold">
                +{result.pointsAwarded} Tasting IQ
              </span>
            </div>
          )}
        </div>

        <VibeCheckCommunityDisplay
          communityVibes={result.communityVibes}
          title="Community Vibes"
        />
      </div>
    );
  }

  // ─── Pick phase ───
  return (
    <div className="bg-surface/60 border border-border rounded-2xl p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase font-black tracking-[0.25em] text-brand">
          Vibe Check
        </p>
        <h3 className="text-base font-bold text-text-primary">Wo trinkst du dieses Bier?</h3>
        <p className="text-xs text-text-muted">
          Wähle bis zu 3 Vibes <span className="text-text-disabled">• +3 Tasting IQ</span>
        </p>
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-3 gap-2">
        {VIBE_OPTIONS.map((vibe) => {
          const isSelected = selectedVibes.has(vibe.id);
          return (
            <button
              key={vibe.id}
              onClick={() => toggleVibe(vibe.id)}
              disabled={phase === 'submitting'}
              className={`
                flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all duration-150
                ${isSelected
                  ? 'bg-brand/10 border-brand/40 scale-105'
                  : 'bg-surface-hover/50 border-border/50 hover:bg-surface-hover hover:border-border-hover'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className={`text-xl transition-transform ${isSelected ? 'scale-110' : ''}`}>
                {vibe.emoji}
              </span>
              <span className={`text-[10px] font-medium ${isSelected ? 'text-brand' : 'text-text-muted'}`}>
                {vibe.label}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={selectedVibes.size === 0 || phase === 'submitting'}
        className="w-full bg-brand hover:bg-brand-hover disabled:bg-surface-hover disabled:text-text-disabled text-black font-bold py-3 rounded-xl transition-all duration-200 text-sm"
      >
        {phase === 'submitting' ? 'Wird gesendet...' : `Absenden (${selectedVibes.size}/3)`}
      </button>

      {/* Community vibes preview */}
      {communityVibes.length > 0 && (
        <VibeCheckCommunityDisplay
          communityVibes={communityVibes}
          title="Community sagt"
        />
      )}
    </div>
  );
}

// ─── Community Vibes Display ───
function VibeCheckCommunityDisplay({
  communityVibes,
  title,
}: {
  communityVibes: { vibe: string; percentage: number }[];
  title: string;
}) {
  if (communityVibes.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] uppercase font-black tracking-widest text-text-disabled">{title}</p>
      <div className="space-y-1.5">
        {communityVibes.slice(0, 5).map(({ vibe, percentage }) => {
          const option = VIBE_OPTIONS.find((v) => v.id === vibe);
          if (!option) return null;
          return (
            <div key={vibe} className="flex items-center gap-2">
              <span className="text-base">{option.emoji}</span>
              <span className="text-xs text-text-secondary w-20 truncate">{option.label}</span>
              <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand/40 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-text-disabled font-mono w-8 text-right">
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
