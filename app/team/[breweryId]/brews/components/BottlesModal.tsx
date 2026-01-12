'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BottlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  brewId: string;
  brewName: string;
}

export default function BottlesModal({ isOpen, onClose, brewId, brewName }: BottlesModalProps) {
  const [loading, setLoading] = useState(true);
  const [bottles, setBottles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && brewId) {
        loadBottles();
    }
  }, [isOpen, brewId]);

  async function loadBottles() {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
            .from('bottles')
            .select('id, bottle_number, created_at')
            .eq('brew_id', brewId)
            .order('bottle_number', { ascending: true });
        
        if (fetchError) {
            console.error('Error fetching bottles:', fetchError, JSON.stringify(fetchError));
            setError(fetchError.message || JSON.stringify(fetchError));
        } else {
            setBottles(data || []);
        }
      } catch (e: any) {
          console.error('Exception fetching bottles:', e);
          setError(e.message || 'Unbekannter Fehler');
      } finally {
          setLoading(false);
      }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl flex flex-col max-h-[80vh]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition z-10"
        >
          ✕
        </button>

        <div className="mb-6 pr-8">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>🍾</span> Inventar
            </h3>
            <p className="text-zinc-500 text-sm truncate">
                Inhalt: <span className="text-cyan-400 font-bold">{brewName}</span>
            </p>
        </div>

        {error ? (
            <div className="py-8 text-center px-4">
                <div className="text-red-500 mb-2 font-bold">Fehler beim Laden</div>
                <div className="text-xs text-zinc-500 bg-black/30 p-2 rounded border border-red-500/20 mb-4 font-mono break-all">
                    {error}
                </div>
                <button 
                    onClick={() => loadBottles()}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white font-medium transition"
                >
                    Erneut versuchen
                </button>
            </div>
        ) : loading ? (
            <div className="py-12 text-center text-zinc-500 animate-pulse flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p>Lade Flaschen...</p>
            </div>
        ) : (
            <>
                <div className="flex-1 overflow-y-auto min-h-[200px] space-y-2 pr-2 custom-scrollbar">
                    {bottles.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50 flex flex-col items-center gap-2">
                            <span className="text-3xl opacity-50">🏷️</span>
                            <div className="text-zinc-500 font-medium">Keine Flaschen gefunden.</div>
                            <p className="text-xs text-zinc-600 max-w-[200px]">
                                Scanne einen QR-Code auf einer Flasche, um sie diesem Sud zuzuordnen.
                            </p>
                            <button 
                                onClick={() => loadBottles()}
                                className="mt-2 text-xs text-cyan-500 hover:text-cyan-400 underline"
                            >
                                Aktualisieren
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {bottles.map((bottle) => (
                                <div key={bottle.id} className="bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700 p-3 rounded-xl flex items-center justify-between group transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center font-black text-white shadow-inner">
                                            {bottle.bottle_number}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Flasche #{bottle.bottle_number}</p>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <span>Erstellt: {new Date(bottle.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Future actions */}
                                    </div>
                                </div> 
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Gesamt</span>
                    <span className="font-black text-white text-lg tabular-nums">{bottles.length}</span>
                </div>
            </>
        )}
      </div>
    </div>
  );
}
