/**
 * BotlGuideResponse
 *
 * Standardised display card for all AI-generated text output.
 * Replaces ad-hoc inline response styling scattered across the codebase.
 *
 * Usage:
 *   <BotlGuideResponse
 *     text={aiText}
 *     persona="BotlGuide Architect"
 *     suggestions={suggestions}           // for architect.optimize
 *     onFeedback={(vote) => ...}
 *     onRetry={() => ...}
 *   />
 */
'use client';

import ReactMarkdown from 'react-markdown';
import { ThumbsUp, ThumbsDown, RefreshCw, Loader2, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { BotlGuidePersonaPill } from './BotlGuideBadge';
import type { PERSONA_DISPLAY } from '@/lib/botlguide/constants';

type Persona = keyof typeof PERSONA_DISPLAY;

interface BotlGuideResponseProps {
  /** Free-form markdown text output */
  text?: string | null;
  /** Structured suggestion list (architect.optimize) */
  suggestions?: string[];
  /** BotlGuide persona that generated this */
  persona?: Persona;
  /** Show skeleton loading state */
  isLoading?: boolean;
  /** Error state — shows upgrade CTA when upgradeRequired is true */
  error?: string | null;
  upgradeRequired?: boolean;
  isFree?: boolean;
  /** Credits used for this generation */
  creditsUsed?: number;
  /** BotlGuide capability that generated this (e.g. 'coach.analyze_fermentation').
   *  When provided, thumbs feedback is automatically sent to /api/botlguide/feedback */
  capability?: string;
  onFeedback?: (vote: 'up' | 'down') => void;
  onRetry?: () => void;
  className?: string;
}

export function BotlGuideResponse({
  text,
  suggestions,
  persona = 'BotlGuide Coach',
  isLoading = false,
  error = null,
  upgradeRequired = false,
  isFree = false,
  creditsUsed,
  capability,
  onFeedback,
  onRetry,
  className = '',
}: BotlGuideResponseProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleFeedback = (vote: 'up' | 'down') => {
    setFeedback(vote);
    onFeedback?.(vote);
    if (capability) {
      fetch('/api/botlguide/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextKey: capability, capability, feedback: vote }),
      }).catch(() => {/* non-fatal */});
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-zinc-500 space-y-3 bg-zinc-900/30 rounded-xl border border-zinc-800 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="text-xs font-medium animate-pulse">BotlGuide analysiert…</span>
      </div>
    );
  }

  // ── Error / Upgrade ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex flex-col items-center text-center space-y-2 ${className}`}>
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <span className="text-sm text-red-200 font-medium">
          {upgradeRequired
            ? isFree ? 'Teaser-Credits aufgebraucht' : 'AI-Limit erreicht'
            : 'Fehler'}
        </span>
        <p className="text-xs text-red-300/70 max-w-xs">
          {upgradeRequired
            ? isFree
              ? 'Deine 5 kostenlosen Teaser-Credits sind für diesen Monat aufgebraucht. Upgrade auf Brewer für 50 Credits.'
              : 'Du hast dein monatliches AI-Kontingent erreicht. Upgrade für mehr Credits.'
            : error}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {upgradeRequired && (
            <a
              href="/pricing"
              className="text-xs bg-red-900/50 hover:bg-red-900 text-white px-3 py-1.5 rounded-md font-bold transition-colors"
            >
              {isFree ? 'Jetzt upgraden' : 'Zum Pricing'}
            </a>
          )}
          {onRetry && !upgradeRequired && (
            <button
              onClick={onRetry}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Erneut versuchen
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!text && (!suggestions || suggestions.length === 0)) return null;

  // ── Suggestions (architect.optimize) ──────────────────────────────────────
  if (suggestions && suggestions.length > 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <BotlGuidePersonaPill persona={persona} />
          {creditsUsed && (
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
              {creditsUsed} Credit{creditsUsed > 1 ? 's' : ''} verwendet
            </span>
          )}
        </div>
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="bg-black border border-zinc-800 hover:border-blue-900/50 rounded-lg p-4 flex gap-3 transition-colors"
          >
            <Lightbulb className="text-blue-500 w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300 leading-relaxed">{s}</p>
          </div>
        ))}
        {(onFeedback || capability) && (
          <div className="flex items-center justify-end gap-3 pt-1">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Hilfreich?</span>
            <button
              onClick={() => handleFeedback('up')}
              className={`transition-colors ${feedback === 'up' ? 'text-emerald-400' : 'text-zinc-600 hover:text-emerald-400'}`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className={`transition-colors ${feedback === 'down' ? 'text-red-400' : 'text-zinc-600 hover:text-red-400'}`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold mt-2 flex items-center gap-1 opacity-60">
          <Sparkles className="w-2.5 h-2.5" /> Generiert von BotlGuide AI · Überprüfe Werte immer manuell
        </div>
      </div>
    );
  }

  // ── Text (markdown) ────────────────────────────────────────────────────────
  return (
    <div className={`bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 animate-in fade-in zoom-in-95 duration-300 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <BotlGuidePersonaPill persona={persona} />
        {creditsUsed && (
          <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
            {creditsUsed} Credit verwendet
          </span>
        )}
      </div>
      <div className="text-sm text-purple-100 leading-relaxed prose prose-invert prose-sm prose-p:my-1.5 prose-strong:text-purple-200 prose-strong:font-bold max-w-none">
        <ReactMarkdown>{text ?? ''}</ReactMarkdown>
      </div>
      {(onFeedback || capability) && (
        <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-purple-500/10 pt-3 mt-3">
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold opacity-70">
            <Sparkles className="w-2.5 h-2.5" /> KI-Generiert · Werte immer manuell prüfen
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleFeedback('up')}
              className={`transition-colors ${feedback === 'up' ? 'text-emerald-400' : 'hover:text-emerald-400'}`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className={`transition-colors ${feedback === 'down' ? 'text-red-400' : 'hover:text-red-400'}`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {(!onFeedback && !capability) && (
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold mt-3 pt-2 border-t border-purple-500/10 flex items-center gap-1 opacity-60">
          <Sparkles className="w-2.5 h-2.5" /> Generiert von BotlGuide AI · Überprüfe Werte immer manuell
        </div>
      )}
    </div>
  );
}
