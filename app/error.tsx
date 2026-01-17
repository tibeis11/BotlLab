'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hier könnte man den Fehler an einen Logging-Service senden (z.B. Sentry)
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <span className="text-6xl mb-6">⚠️</span>
      <h2 className="text-2xl font-black mb-2">Ein Fehler ist aufgetreten!</h2>
      <p className="text-zinc-500 max-w-md mx-auto mb-8 text-sm">
        Entschuldige, da ist etwas schiefgelaufen. Unser Code hat sich verschluckt.
        <br />
        <span className="font-mono text-xs opacity-50 mt-2 block">{error.message}</span>
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl transition"
        >
          Erneut versuchen
        </button>
        <a 
          href="/"
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl transition border border-zinc-700"
        >
          Zur Startseite
        </a>
      </div>
    </div>
  );
}
