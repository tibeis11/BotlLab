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

  // Generation State
  const [view, setView] = useState<'list' | 'generate'>('list');
  const [genCount, setGenCount] = useState<number>(10);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'zip' | 'png'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

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

  async function handleGenerate() {
      setIsGenerating(true);
      try {
          // 1. Get max bottle number to continue numbering
          const { data: maxContent } = await supabase
            .from('bottles')
            .select('bottle_number')
            .eq('brew_id', brewId)
            .order('bottle_number', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          let startNum = (maxContent?.bottle_number || 0) + 1;
          
          // 2. Create database entries
          const newBottles = Array.from({ length: genCount }).map((_, i) => ({
              brew_id: brewId,
              bottle_number: startNum + i,
              // QR Content is usually generated from ID later, or we insert a UID here if table has it.
              // For now we rely on ID or defaults.
          }));
          
          const { error: insertError } = await supabase.from('bottles').insert(newBottles);
          if (insertError) throw insertError;
          
          // 3. Trigger "Download" (Simulation)
          // In a real app, this would call an API route to generate the PDF/ZIP stream
          console.log(`Generating ${downloadFormat.toUpperCase()} for ${genCount} bottles...`);
          
          // Small delay to simulate processing
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          alert(`Erfolg! ${genCount} neue Flaschen wurden angelegt.\nDer Download im Format ${downloadFormat.toUpperCase()} startet jetzt.`);
          
          // 4. Return to list
          setView('list');
          loadBottles();

      } catch (e: any) {
          console.error(e);
          alert('Fehler beim Generieren: ' + e.message);
      } finally {
          setIsGenerating(false);
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

        <div className="mb-6 pr-8 flex items-center justify-between">
            <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>{view === 'generate' ? '📦' : '🍾'}</span> 
                    {view === 'generate' ? 'Neue Flaschen' : 'Inventar'}
                </h3>
                <p className="text-zinc-500 text-sm truncate max-w-[200px]">
                    {view === 'generate' ? 'QR-Codes erstellen' : <>Inhalt: <span className="text-cyan-400 font-bold">{brewName}</span></>}
                </p>
            </div>
            {view === 'list' && (
                <button 
                    onClick={() => setView('generate')}
                    className="bg-cyan-500 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold hover:scale-110 transition shadow-lg shadow-cyan-500/20"
                    title="Neue Flaschen generieren"
                >
                    +
                </button>
            )}
            {view === 'generate' && (
                <button 
                    onClick={() => setView('list')}
                    className="bg-zinc-800 text-zinc-300 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-zinc-700 transition"
                    title="Zurück zur Liste"
                >
                    ←
                </button>
            )}
        </div>

        {view === 'generate' ? (
             <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* Count Input */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-cyan-500">
                        <label>Anzahl</label>
                        <span className="text-zinc-600">Max 100</span>
                    </div>
                    <div className="bg-zinc-950 border-2 border-zinc-800 rounded-2xl flex items-center justify-center p-4 focus-within:border-cyan-500 transition-colors">
                        <input 
                            type="number" 
                            min={1} 
                            max={100}
                            value={genCount} 
                            onChange={(e) => setGenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                            className="bg-transparent text-center text-3xl font-black text-white outline-none w-full tabular-nums"
                        />
                    </div>
                </div>

                {/* Format Dropdown */}
                <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-cyan-500">
                        Format
                    </label>
                    <div className="relative">
                        <select 
                            value={downloadFormat}
                            onChange={(e) => setDownloadFormat(e.target.value as any)}
                            className="w-full appearance-none bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                        >
                            <option value="pdf">📄 PDF (Druckoptimiert)</option>
                            <option value="zip">📦 ZIP (Einzelne PNGs)</option>
                            <option value="png">🖼️ PNG (Ein großes Bild)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                        {downloadFormat === 'pdf' && 'Erzeugt ein A4 PDF mit QR-Codes zum direkten Ausdrucken.'}
                        {downloadFormat === 'zip' && 'Lädt ein Archiv mit einzelnen Bilddateien für jeden Code herunter.'}
                        {downloadFormat === 'png' && 'Erstellt ein Übersichtsbild mit allen Codes.'}
                    </p>
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            <span>Generiere...</span>
                        </>
                    ) : (
                        <>
                            <span>GENERIEREN & DRUCKEN</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                            </svg>
                        </>
                    )}
                </button>

                <p className="text-center text-xs text-zinc-500">
                    Erstellt neue Datenbank-Einträge und generiert die Dateien lokal.
                </p>

             </div>
        ) : error ? (
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
