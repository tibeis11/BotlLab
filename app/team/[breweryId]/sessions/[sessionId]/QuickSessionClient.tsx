'use client';

import { useSession } from './SessionContext';
import BottleScanner from '@/app/components/BottleScanner';

export default function QuickSessionClient() {
  const { session, loading, deleteSession } = useSession();

  if (loading) {
    return <div className="text-white p-8 animate-pulse">Laden...</div>;
  }

  if (!session) {
    return <div className="text-white p-8">Session nicht gefunden.</div>;
  }

  return (
    <div className="w-full pb-32">
      {/* Header with Session Type Badge & Delete Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white">
            {session.batch_code || "Quick Session"}
          </h1>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-900/30 text-blue-300 border border-blue-500/20">
            ⚡ Quick Session
          </span>
        </div>

        <button 
          onClick={() => {
            if (confirm('Bist du sicher? Alle Flaschenzuweisungen für diesen Sud werden gelöscht.')) {
              deleteSession();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-xl border border-zinc-800 hover:border-red-500/20 transition-all font-bold text-sm h-fit self-end md:self-auto"
        >
          <span>🗑️</span>
          <span>Session löschen</span>
        </button>
      </div>

      {/* Recipe Info */}
      {session.brew && (
        <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <h3 className="font-semibold text-white">{session.brew.name}</h3>
          {session.brew.style && (
            <p className="text-sm text-zinc-400">{session.brew.style}</p>
          )}
        </div>
      )}

      {/* Measurements Card */}
      <div className="mb-8">
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
          <h2 className="text-lg font-bold text-white mb-4">Messwerte</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                OG (Stammwürze)
              </p>
              <p className="text-2xl font-black text-white">
                {session.measurements?.og || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                FG (Endvergärung)
              </p>
              <p className="text-2xl font-black text-white">
                {session.measurements?.fg || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Alkohol (%)
              </p>
              <p className="text-2xl font-black text-white">
                {session.measurements?.abv ? `${session.measurements.abv}%` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Volumen (Liter)
              </p>
              <p className="text-2xl font-black text-white">
                {session.measurements?.volume
                  ? `${session.measurements.volume}L`
                  : "N/A"}
              </p>
            </div>
          </div>
          {session.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Notizen
              </p>
              <p className="text-zinc-300 text-sm">{session.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottle Scanner */}
      <BottleScanner
        sessionId={session.id}
        breweryId={session.brewery_id}
        brewId={session.brew_id}
      />
    </div>
  );
}
