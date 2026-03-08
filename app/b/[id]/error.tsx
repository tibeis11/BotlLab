'use client';

// ============================================================================
// Phase 6.5 — Error Boundary for /b/[id]
//
// Shown when an unhandled error bubbles up from the bottle-label page.
// Provides a friendly message and a "try again" action.
// ============================================================================

import { useEffect } from 'react';
import Logo from '../../components/Logo';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BottleLabelError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[b/[id]] unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo />

      <div className="space-y-3">
        <p className="text-4xl">😵</p>
        <h1 className="text-2xl font-black text-text-primary">Hoppla, etwas ist schiefgelaufen</h1>
        <p className="text-text-secondary max-w-sm text-sm leading-relaxed">
          Das Etikett konnte leider nicht geladen werden.
          Versuch es nochmal oder scanne den QR-Code erneut.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="w-full bg-brand hover:bg-brand-hover active:scale-95 text-black font-black text-sm rounded-xl py-3 transition-all"
        >
          Erneut versuchen
        </button>
        <p className="text-text-disabled text-xs">
          Scanne den QR-Code nochmal, falls das Problem anhält.
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre className="text-left text-[10px] text-red-400 bg-surface border border-border rounded-xl p-4 max-w-sm w-full overflow-x-auto whitespace-pre-wrap">
          {error.message}
        </pre>
      )}
    </div>
  );
}
