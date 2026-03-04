/**
 * BotlGuideBadge
 *
 * The reusable brand pill shown next to every AI-powered button.
 * Communicates the active BotlGuide persona and remaining credits at a glance.
 *
 * Usage (inline button label):
 *   <BotlGuideBadge persona="Copywriter" remaining={remaining} />
 *
 * Usage (standalone):
 *   <BotlGuideBadge persona="Architect" credits={2} remaining={remaining} showPersona />
 */
'use client';

import { Sparkles } from 'lucide-react';
import { PERSONA_DISPLAY } from '@/lib/botlguide/constants';

type Persona = keyof typeof PERSONA_DISPLAY;

interface BotlGuideBadgeProps {
  /** BotlGuide persona — drives colour theming */
  persona?: Persona | 'BotlGuide';
  /** Credit cost for this action (shows as "-N cr" hint) */
  credits?: number;
  /** Remaining credits this month for colour coding */
  remaining?: number | null;
  /** If true, renders the persona name alongside the credit count */
  showPersona?: boolean;
  className?: string;
}

/**
 * Returns tailwind classes based on remaining credit level
 */
function creditColour(remaining: number | null | undefined): string {
  if (remaining === null || remaining === undefined || remaining === Infinity) {
    return 'bg-emerald-500/20 text-emerald-400';
  }
  if (remaining <= 0) return 'bg-red-500/20 text-red-500';
  if (remaining <= 2) return 'bg-amber-500/20 text-amber-400';
  return 'bg-cyan-500/20 text-cyan-400';
}

export function BotlGuideBadge({
  persona = 'BotlGuide',
  credits,
  remaining,
  showPersona = false,
  className = '',
}: BotlGuideBadgeProps) {
  const isUnlimited = remaining === null || remaining === undefined || remaining === Infinity;
  const personaKey = persona in PERSONA_DISPLAY ? (persona as Persona) : null;
  const personaMeta = personaKey ? PERSONA_DISPLAY[personaKey] : null;

  const colourClass = creditColour(remaining);
  const displayRemaining = isUnlimited ? '∞' : remaining;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1.5 ${colourClass} ${className}`}
      title={credits ? `Kostet ${credits} Credit${credits > 1 ? 's' : ''}` : undefined}
    >
      <Sparkles className="w-2 h-2" />
      {showPersona && personaMeta && (
        <span className={`${personaMeta.colour} mr-0.5`}>{personaMeta.short}</span>
      )}
      {credits && !showPersona ? (
        <span>{displayRemaining} · -{credits}</span>
      ) : (
        <span>{displayRemaining}</span>
      )}
    </span>
  );
}

/**
 * Compact BotlGuide wordmark pill for use in section headers and tab labels.
 * Renders: [✦] BotlGuide <short>
 */
export function BotlGuidePersonaPill({
  persona,
  className = '',
}: {
  persona: Persona;
  className?: string;
}) {
  const meta = PERSONA_DISPLAY[persona];
  return (
    <span
      className={`inline-flex items-center gap-1 bg-purple-950/40 border border-purple-500/20 rounded-full px-2.5 py-1 ${className}`}
    >
      <Sparkles className="w-3 h-3 text-purple-400" />
      <span className="text-[11px] font-black uppercase tracking-widest text-purple-300">BotlGuide</span>
      <span className={`text-[9px] font-bold uppercase tracking-widest ${meta.colour}`}>{meta.short}</span>
    </span>
  );
}
