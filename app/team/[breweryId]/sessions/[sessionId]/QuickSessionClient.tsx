'use client';

import { useSession } from './SessionContext';
import BottleScanner from '@/app/components/BottleScanner';
import { Zap, Trash2, FlaskConical } from 'lucide-react';

export default function QuickSessionClient() {
  const { session, loading, deleteSession } = useSession();

  if (loading) {
    return <div className="text-text-primary p-8 animate-pulse">Laden...</div>;
  }

  if (!session) {
    return <div className="text-text-primary p-8">Session nicht gefunden.</div>;
  }

  return (
    <div className="w-full pb-32">
      {/* Header with Session Type Badge & Delete Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-text-primary">
            {session.batch_code || "Quick Session"}
          </h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Quick Session
          </span>
        </div>

        <button 
          onClick={() => {
            if (confirm('Bist du sicher? Alle Flaschenzuweisungen für diesen Sud werden gelöscht.')) {
              deleteSession();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-red-500/10 text-text-muted hover:text-red-400 rounded-xl border border-border hover:border-red-500/20 transition-all font-bold text-sm h-fit self-end md:self-auto"
        >
          <Trash2 className="w-4 h-4" />
          <span>Session löschen</span>
        </button>
      </div>

      {/* Recipe Info */}
      {session.brew && (
        <div className="mb-6 p-4 bg-surface border border-border rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center shrink-0 text-text-muted">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{session.brew.name}</p>
            {session.brew.style && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{session.brew.style}</p>
            )}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">Messwerte</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">OG</p>
              <p className="text-2xl font-black tabular-nums text-text-primary">
                {session.measurements?.og || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">FG</p>
              <p className="text-2xl font-black tabular-nums text-text-primary">
                {session.measurements?.fg || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">ABV</p>
              <p className="text-2xl font-black tabular-nums text-text-primary">
                {session.measurements?.abv ? `${session.measurements.abv}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Volumen</p>
              <p className="text-2xl font-black tabular-nums text-text-primary">
                {session.measurements?.volume ? `${session.measurements.volume}L` : "—"}
              </p>
            </div>
          </div>
          {session.notes && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Notizen</p>
              <p className="text-sm text-text-secondary leading-relaxed">{session.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottle Scanner */}
      <BottleScanner
        sessionId={session.id}
        breweryId={session.brewery_id}
        brewId={session.brew_id}
        variant="clean"
      />
    </div>
  );
}
