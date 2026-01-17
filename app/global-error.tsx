'use client';

import { useEffect } from 'react';

// Global Error fängt Fehler im Root Layout ab
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body className="bg-black text-white">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <span className="text-6xl mb-6">🔥</span>
            <h2 className="text-3xl font-black mb-4">Kritischer Systemfehler</h2>
            <p className="text-zinc-500 mb-8">Das System musste gestoppt werden.</p>
            <button 
                onClick={() => reset()}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-xl transition"
            >
                System neu starten
            </button>
        </div>
      </body>
    </html>
  );
}
