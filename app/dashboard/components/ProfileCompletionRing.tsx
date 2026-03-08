'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProfileCompletionRingProps {
  completed: number;
  total: number;
  size?: number;
  label?: string;
  pendingLabels?: string[];
  variant?: 'card' | 'inline';
  showPending?: boolean;
}

export default function ProfileCompletionRing({
  completed,
  total,
  size = 80,
  label = 'Profil vollständig',
  pendingLabels = [],
  variant = 'card',
  showPending = true,
}: ProfileCompletionRingProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const angle = Math.min(100, Math.max(0, pct)) * 3.6;

  const ringStyle: React.CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `conic-gradient(var(--color-brand) ${angle}deg, var(--color-border) ${angle}deg 360deg)`,
  };

  const isComplete = pct === 100;

  const content = (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div className="rounded-full" style={ringStyle} />
        <div
          className="absolute rounded-full bg-surface flex items-center justify-center"
          style={{ inset: Math.round(size * 0.1) }}
        >
          <span className={`text-sm font-black ${ isComplete ? 'text-brand' : 'text-text-primary' }`}>
            {pct}%
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary mb-0.5">{label}</p>
        <p className="text-xs text-text-muted mb-2">
          {isComplete ? 'Dein Profil ist vollständig ✔' : `${completed} von ${total} Angaben ausgefüllt`}
        </p>
        {showPending && pendingLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingLabels.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border text-text-muted bg-surface-hover"
              >
                <Circle className="w-2.5 h-2.5 shrink-0" />
                {p}
              </span>
            ))}
          </div>
        )}
        {isComplete && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-brand/30 text-brand bg-brand-bg text-xs font-bold">
            <CheckCircle2 className="w-3 h-3" /> Vollständig
          </span>
        )}
      </div>
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4">
      {content}
    </div>
  );
}
