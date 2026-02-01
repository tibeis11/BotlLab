'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Wine, Tag, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

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
            .select('id, bottle_number, created_at, filled_at')
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md flex flex-col max-h-[80vh] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-900 bg-zinc-950/50 flex justify-between items-center relative gap-4">
             <div>
                <h3 className="text-zinc-200 font-bold text-sm tracking-tight flex items-center gap-2">
                   <Wine className="w-4 h-4 text-zinc-400" /> Inventar
                </h3>
                <p className="text-zinc-500 text-xs truncate max-w-[280px]">
                   Inhalt: <span className="text-cyan-400 font-bold">{brewName}</span>
                </p>
             </div>
             
             <button 
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition"
             >
                <X className="w-5 h-5" />
             </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 relative min-h-[200px]">
            {error ? (
                <div className="py-8 text-center px-4">
                    <div className="text-red-400 mb-2 font-bold text-sm flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Fehler beim Laden
                    </div>
                    <div className="text-xs text-zinc-500 bg-black/30 p-2 rounded border border-red-500/10 mb-4 font-mono break-all">
                        {error}
                    </div>
                    <button 
                        onClick={() => loadBottles()}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 font-bold uppercase tracking-wider transition border border-zinc-700"
                    >
                        Erneut versuchen
                    </button>
                </div>
            ) : loading ? (
                <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-wider">Lade Flaschen...</p>
                </div>
            ) : (
                <>
                    {bottles.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30 flex flex-col items-center gap-2">
                            <Tag className="w-8 h-8 text-zinc-700 mb-2" strokeWidth={1} />
                            <div className="text-zinc-400 font-medium text-sm">Keine Flaschen gefunden.</div>
                            <p className="text-[10px] text-zinc-600 max-w-[200px] leading-relaxed">
                                Scanne einen QR-Code auf einer Flasche, um sie diesem Sud zuzuordnen.
                            </p>
                            <button 
                                onClick={() => loadBottles()}
                                className="mt-4 flex items-center gap-1.5 text-[10px] uppercase font-bold text-cyan-500 hover:text-cyan-400 transition"
                            >
                                <RefreshCw className="w-3 h-3" /> Aktualisieren
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bottles.map((bottle) => (
                                <div key={bottle.id} className="bg-zinc-950 border border-zinc-900 hover:border-zinc-700 p-2.5 rounded-lg flex items-center justify-between group transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center font-mono font-bold text-zinc-300 text-xs">
                                            {bottle.bottle_number}
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-300 text-sm">Flasche #{bottle.bottle_number}</p>
                                            <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500 uppercase font-medium tracking-wide">
                                                <span>Erstellt: {new Date(bottle.created_at).toLocaleDateString()}</span>
                                                {bottle.filled_at && <span className="text-emerald-500/70">Abgefüllt: {new Date(bottle.filled_at).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div> 
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-zinc-900 bg-zinc-950 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Gesamtanzahl</span>
            <span className="font-mono font-bold text-white text-base">{bottles.length}</span>
        </div>
      </div>
    </div>
  );
}
