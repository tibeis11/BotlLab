'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Scanner from '@/app/components/Scanner';

interface BottleScannerProps {
  sessionId: string;
  breweryId: string;
  brewId: string | null;
  onBottleScanned?: (bottleNumber: number) => void;
}

export default function BottleScanner({ 
  sessionId, 
  breweryId, 
  brewId,
  onBottleScanned 
}: BottleScannerProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [filledCount, setFilledCount] = useState(0);
  const [lastScannedNumber, setLastScannedNumber] = useState<number | null>(null);
  const [filledAtDate, setFilledAtDate] = useState(new Date().toISOString().split('T')[0]);

  // Load existing bottle count
  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('bottles')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId);
      
      if (!error && count !== null) setFilledCount(count);
    };
    fetchCount();
  }, [sessionId]);

  const handleScan = async (decodedText: string) => {
    if (isProcessing) return;

    // Match UUID
    const idMatch = decodedText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!idMatch) {
      setScanFeedback({ type: 'error', msg: "❌ Ungültiger Code" });
      return;
    }

    const bottleId = idMatch[0];
    setIsProcessing(true);

    try {
      // 1. Check existing status
      const { data: existing, error: checkError } = await supabase
        .from('bottles')
        .select('id, bottle_number, session_id, brewery_id')
        .eq('id', bottleId)
        .single();

      if (checkError) throw new Error("Flasche nicht gefunden.");
      
      // Check ownership
      if (existing.brewery_id !== breweryId) {
        throw new Error("Fremde Flasche! Gehört nicht zur Brauerei.");
      }

      // Check duplicate scan
      if (existing.session_id === sessionId) {
        setLastScannedNumber(existing.bottle_number);
        setScanFeedback({ type: 'error', msg: `⚠️ Flasche #${existing.bottle_number} bereits hier erfasst!` });
        return;
      }

      // 2. Assign bottle
      const { data, error } = await supabase
        .from('bottles')
        .update({ 
          session_id: sessionId,
          brew_id: brewId,
          filled_at: new Date(filledAtDate).toISOString()
        })
        .eq('id', bottleId)
        .select('bottle_number');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Fehler beim Zuweisen.");
      }
      
      const updatedBottle = data[0];
      setLastScannedNumber(updatedBottle.bottle_number);
      setScanFeedback({ type: 'success', msg: `✅ Flasche #${updatedBottle.bottle_number} erfasst!` });
      setFilledCount(prev => prev + 1);
      
      if (onBottleScanned) onBottleScanned(updatedBottle.bottle_number);
    } catch (e: any) {
      setScanFeedback({ type: 'error', msg: "Fehler: " + e.message });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setScanFeedback(null); 
      }, 1500);
    }
  };

  return (
    <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Flaschen scannen</h3>
          <p className="text-zinc-500 text-sm">Flaschen diesem Sud zuweisen</p>
        </div>
        <div className="flex items-center gap-6 text-right">
          {lastScannedNumber && (
            <div className="hidden md:block">
              <div className="text-xl font-black text-white">#{lastScannedNumber}</div>
              <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest">Zuletzt</div>
            </div>
          )}
          <div>
            <div className="text-2xl font-black text-cyan-400">{filledCount}</div>
            <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest">Erfasst</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
            Abgefüllt am
          </label>
          <input 
            type="date" 
            value={filledAtDate}
            onChange={(e) => setFilledAtDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-600 transition text-lg font-mono"
          />
        </div>

        {!showScanner ? (
          <button 
            onClick={() => setShowScanner(true)}
            className="w-full py-4 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 text-zinc-300 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-cyan-900/10 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">📷</span> Scanner starten
          </button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="rounded-2xl overflow-hidden border-2 border-zinc-800 relative bg-black aspect-square shadow-inner max-w-[320px] mx-auto">
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                            <span className="text-4xl animate-pulse">📷</span>
                            <span className="text-xs font-mono text-zinc-500">Kamera wird vorbereitet...</span>
                        </div>
                 </div>
                 
                 <Scanner onScanSuccess={handleScan} autoStart={true} />
                 
                 {/* Overlay Scanner Frame - Like in Inventory */}
                 <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-10">
                     <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-500 rounded-tl-xl -mt-1 -ml-1"></div>
                     <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-500 rounded-tr-xl -mt-1 -mr-1"></div>
                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-500 rounded-bl-xl -mb-1 -ml-1"></div>
                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-500 rounded-br-xl -mb-1 -mr-1"></div>
                 </div>
            </div>
            
            {scanFeedback && (
              <div className={`p-4 rounded-xl text-center font-bold text-sm animate-in zoom-in-95 ${
                scanFeedback.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-900/10' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-lg shadow-red-900/10'
              }`}>
                {scanFeedback.msg}
              </div>
            )}

            <button 
              onClick={() => setShowScanner(false)}
              className="w-full py-2 text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              Abbrechen / Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
