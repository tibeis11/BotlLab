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
  alreadySubmitted?: boolean;
  isLoggedIn?: boolean;
  communityVibes?: { vibe: string; percentage: number }[];
}

export default function VibeCheck({
  brewId,
  alreadySubmitted = false,
  isLoggedIn = false,
  communityVibes: initialVibes,
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
    if (!isLoggedIn) {
      setError('Bitte melde dich an, um teilzunehmen.');
      return;
    }

    setPhase('submitting');
    setError(null);

    try {
      const res = await submitVibeCheck({
        brewId,
        vibes: Array.from(selectedVibes),
      });
      setResult(res);
      setPhase('result');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Senden.');
      setPhase('pick');
    }
  }, [brewId, selectedVibes, isLoggedIn]);

  // ─── Already submitted (no result data) ───
  if (alreadySubmitted && !result) {
    if (communityVibes.length === 0) {
      return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 text-center space-y-2">
          <span className="text-2xl">&#x2705;</span>
          <p className="text-sm text-zinc-400">Danke für deinen Vibe-Check!</p>
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
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
        {/* Points earned */}
        <div className="text-center space-y-2">
          <span className="text-3xl">✅</span>
          <p className="text-sm font-bold text-white">Vibe Check abgeschlossen!</p>
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5">
            <span className="text-green-400 text-sm font-bold">
              +{result.pointsAwarded} Tasting IQ
            </span>
          </div>
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
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase font-black tracking-[0.25em] text-cyan-500">
          Vibe Check
        </p>
        <h3 className="text-base font-bold text-white">Wo trinkst du dieses Bier?</h3>
        <p className="text-xs text-zinc-500">
          Wähle bis zu 3 Vibes <span className="text-zinc-700">• +3 Tasting IQ</span>
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
                  ? 'bg-cyan-500/10 border-cyan-500/40 scale-105'
                  : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className={`text-xl transition-transform ${isSelected ? 'scale-110' : ''}`}>
                {vibe.emoji}
              </span>
              <span className={`text-[10px] font-medium ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`}>
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
        className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold py-3 rounded-xl transition-all duration-200 text-sm"
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
      <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600">{title}</p>
      <div className="space-y-1.5">
        {communityVibes.slice(0, 5).map(({ vibe, percentage }) => {
          const option = VIBE_OPTIONS.find((v) => v.id === vibe);
          if (!option) return null;
          return (
            <div key={vibe} className="flex items-center gap-2">
              <span className="text-base">{option.emoji}</span>
              <span className="text-xs text-zinc-400 w-20 truncate">{option.label}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500/40 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-600 font-mono w-8 text-right">
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
