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
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md flex flex-col max-h-[80vh] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface-sunken/50 flex justify-between items-center gap-4">
          <div>
            <h3 className="text-text-primary font-bold text-sm tracking-tight flex items-center gap-2">
              <Wine className="w-4 h-4 text-text-muted" /> Inventar
            </h3>
            <p className="text-text-muted text-xs truncate max-w-[280px]">
              Inhalt: <span className="text-brand font-bold">{brewName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 relative min-h-[200px]">
          {error ? (
            <div className="py-8 text-center px-4">
              <div className="text-error mb-2 font-bold text-sm flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> Fehler beim Laden
              </div>
              <div className="text-xs text-text-muted bg-surface-sunken p-2 rounded-lg border border-error/20 mb-4 font-mono break-all">
                {error}
              </div>
              <button
                onClick={() => loadBottles()}
                className="px-4 py-2 bg-surface hover:bg-surface-hover rounded-xl text-xs text-text-primary font-bold uppercase tracking-wider transition border border-border"
              >
                Erneut versuchen
              </button>
            </div>
          ) : loading ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Lade Flaschen...</p>
            </div>
          ) : (
            <>
              {bottles.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
                  <Tag className="w-8 h-8 text-text-disabled mb-2" strokeWidth={1} />
                  <div className="text-text-secondary font-medium text-sm">Keine Flaschen gefunden.</div>
                  <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
                    Scanne einen QR-Code auf einer Flasche, um sie diesem Sud zuzuordnen.
                  </p>
                  <button
                    onClick={() => loadBottles()}
                    className="mt-4 flex items-center gap-1.5 text-[10px] uppercase font-bold text-brand hover:text-brand-hover transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Aktualisieren
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {bottles.map((bottle) => (
                    <div key={bottle.id} className="bg-background border border-border hover:border-border-hover p-2.5 rounded-xl flex items-center gap-3 transition">
                      <div className="w-8 h-8 bg-surface border border-border rounded-lg flex items-center justify-center font-mono font-bold text-text-primary text-xs shrink-0">
                        {bottle.bottle_number}
                      </div>
                      <div>
                        <p className="font-bold text-text-primary text-sm">Flasche #{bottle.bottle_number}</p>
                        <div className="flex flex-col gap-0.5 text-[10px] text-text-muted uppercase font-medium tracking-wide">
                          <span>Erstellt: {new Date(bottle.created_at).toLocaleDateString('de-DE')}</span>
                          {bottle.filled_at && (
                            <span className="text-success">Abgefüllt: {new Date(bottle.filled_at).toLocaleDateString('de-DE')}</span>
                          )}
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
        <div className="p-3 border-t border-border bg-surface-sunken/50 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Gesamtanzahl</span>
          <span className="font-mono font-bold text-text-primary text-base">{bottles.length}</span>
        </div>
      </div>
    </div>
  );
}
