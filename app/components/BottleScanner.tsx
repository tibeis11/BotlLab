'use client';

import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import Scanner from '@/app/components/Scanner';
import { useAuth } from '@/app/context/AuthContext';
import { Camera, CheckCircle2, AlertTriangle, XCircle, Calendar, X } from 'lucide-react';

interface BottleScannerProps {
  sessionId: string;
  breweryId: string;
  brewId: string | null;
  onBottleScanned?: (bottleNumber: number) => void;
  className?: string; // Allow custom styling
  variant?: 'default' | 'clean'; // 'clean' matches the new conditioning tab style
}

const playBeep = (type: 'success' | 'error') => {
    // ... audio code (unchanged logic) ...
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            osc.frequency.setValueAtTime(880, ctx.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch(e) { console.error(e); }
};

export default function BottleScanner({ 
  sessionId, 
  breweryId, 
  brewId,
  onBottleScanned,
  className,
  variant = 'default'
}: BottleScannerProps) {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error', msg: string, id: number } | null>(null);
  const [filledCount, setFilledCount] = useState(0);
  const [lastScannedNumber, setLastScannedNumber] = useState<number | null>(null);
  const [filledAtDate, setFilledAtDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFlash, setShowFlash] = useState<'success' | 'error' | null>(null);

  // Cooldown prevention
  const lastScanTime = useRef<number>(0);

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
  }, [sessionId, supabase]);

  const handleScan = async (decodedText: string) => {
    const now = Date.now();
    if (now - lastScanTime.current < 800) return; // 0.8s cooldown
    if (isProcessing) return;

    let scanId = decodedText;
    let isShortCode = false;

    // 1. Check if input is a URL containing /b/
    if (decodedText.includes('/b/')) {
        const parts = decodedText.split('/b/');
        if (parts.length > 1) {
            scanId = parts[1].split('?')[0]; // Simple cleaning if query params exist
            isShortCode = true;
        }
    } else {
        // 2. Check if it's a UUID
        const idMatch = decodedText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (idMatch) {
            scanId = idMatch[0];
            isShortCode = false;
        } else {
            // 3. Assume Short Code if 8 chars alphanumeric
            if (/^[A-Za-z0-9]{8}$/.test(decodedText)) {
                scanId = decodedText;
                isShortCode = true;
            } else {
                if (now - lastScanTime.current > 2000) {
                    lastScanTime.current = now;
                    playBeep('error');
                    setScanFeedback({ type: 'error', msg: "Ungültiger QR-Code (Keine Flaschen-ID)", id: now });
                }
                return;
            }
        }
    }

    // Prevent duplicate scan spam for same ID
    if (scanFeedback?.type === 'success' && scanFeedback.msg.includes(scanId)) { 
         return; 
    }

    setIsProcessing(true);
    lastScanTime.current = now;

    try {
      if (!user) throw new Error("Nicht eingeloggt. Bitte neu laden.");

      // 1. Check existing status
      let query = supabase
        .from('bottles')
        .select('id, bottle_number, session_id, brewery_id');
      
      if (isShortCode) {
          query = query.eq('short_code', scanId);
      } else {
          query = query.eq('id', scanId);
      }

      const { data: existing, error: checkError } = await query.single();

      if (checkError) throw new Error("Flasche nicht gefunden (DB).");
      
      if (existing.brewery_id !== breweryId) {
        throw new Error("Fremde Flasche! Gehört nicht zur Brauerei.");
      }

      if (existing.session_id === sessionId) {
        setLastScannedNumber(existing.bottle_number);
        playBeep('error');
        setScanFeedback({ type: 'error', msg: `Flasche #${existing.bottle_number} bereits hier erfasst!`, id: Date.now() });
        setShowFlash('error');
        return;
      }

      // 2. Assign bottle (We need the UUID for update regardless of scan method)
      const bottleUuid = existing.id;

      const { data, error } = await supabase
        .from('bottles')
        .update({ 
          session_id: sessionId,
          brew_id: brewId,
          filled_at: new Date(filledAtDate).toISOString(),
          user_id: user?.id 
        })
        .eq('id', bottleUuid)
        .select('bottle_number');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Fehler beim Zuweisen.");
      }
      
      const updatedBottle = data[0];
      
      playBeep('success');
      setShowFlash('success');
      setLastScannedNumber(updatedBottle.bottle_number);
      setScanFeedback({ type: 'success', msg: `Flasche #${updatedBottle.bottle_number} erfasst!`, id: Date.now() });
      setFilledCount(prev => prev + 1);
      
      if (onBottleScanned) onBottleScanned(updatedBottle.bottle_number);
    } catch (e: any) {
      console.error(e);
      playBeep('error');
      setShowFlash('error');
      setScanFeedback({ type: 'error', msg: e.message || "Fehler beim Scannen", id: Date.now() });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setShowFlash(null);
      }, 500);
    }
  };

  const isClean = variant === 'clean';

  return (
    <div className={`border border-zinc-800 ${isClean ? 'bg-zinc-900/30 rounded-xl p-6' : 'bg-zinc-900 rounded-lg overflow-hidden'} ${className || ''}`}>
      {/* Header */}
      <div className={`flex justify-between items-center ${isClean ? 'mb-6' : 'p-4 border-b border-zinc-800 bg-zinc-950/50'}`}>
         <div>
             <h3 className={`font-bold tracking-tight flex items-center gap-2 ${isClean ? 'text-sm text-white' : 'text-zinc-200 text-sm'}`}>
                <Camera className={`w-4 h-4 ${isClean ? 'text-purple-500' : 'text-zinc-400'}`} /> Flaschen scannen
             </h3>
             {!isClean && <p className="text-xs text-zinc-500 mt-0.5">Weise Flaschen diesem Sud zu</p>}
         </div>
         <div className="flex items-center gap-4">
            {lastScannedNumber && (
                <div className="hidden md:block text-right">
                    <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">Zuletzt</div>
                    <div className="text-zinc-300 font-mono font-bold">#{lastScannedNumber}</div>
                </div>
            )}
            <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">Erfasst</div>
                <div className="text-xl font-black text-cyan-400 font-mono leading-none">{filledCount}</div>
            </div>
         </div>
      </div>

      <div className={isClean ? 'space-y-4' : 'p-4 space-y-4'}>
        {/* Date Selector */}
        <div className="relative">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block flex items-center gap-1">
             <Calendar className="w-3 h-3" /> Abfülltatum
          </label>
          <input 
            type="date" 
            value={filledAtDate}
            onChange={(e) => setFilledAtDate(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition text-sm font-mono h-10"
          />
        </div>

        {!showScanner ? (
          <button 
            onClick={() => setShowScanner(true)}
            className="w-full py-4 bg-zinc-950 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg font-bold uppercase tracking-wide flex items-center justify-center gap-3 transition-all group"
          >
            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform group-hover:text-white" /> 
            <span>Scanner starten</span>
          </button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="rounded-lg overflow-hidden border border-zinc-700 relative bg-black aspect-square shadow-2xl max-w-[320px] mx-auto">
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                            <Camera className="w-8 h-8 text-zinc-600" />
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Kamera lädt...</span>
                        </div>
                 </div>
                 
                 <Scanner onScanSuccess={handleScan} autoStart={true} />
                 
                 {/* Visual Flash Overlay */}
                 {showFlash && (
                    <div className={`absolute inset-0 z-20 pointer-events-none animate-out fade-out duration-300 ${
                        showFlash === 'success' ? 'bg-emerald-500/30' : 'bg-red-500/30'
                    }`} />
                 )}

                 {/* Overlay Scanner Frame */}
                 <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none z-10 transition-colors duration-300">
                     <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg -mt-1 -ml-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-zinc-500'}`}></div>
                     <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg -mt-1 -mr-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-zinc-500'}`}></div>
                     <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg -mb-1 -ml-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-zinc-500'}`}></div>
                     <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg -mb-1 -mr-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-zinc-500'}`}></div>
                 </div>
            </div>
            
            {scanFeedback && (
              <div 
                key={scanFeedback.id}
                className={`p-3 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-2 animate-in zoom-in-95 slide-in-from-top-2 duration-300 ${
                scanFeedback.type === 'success' 
                  ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-red-950/30 text-red-400 border border-red-500/20'
              }`}>
                {scanFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {scanFeedback.msg}
              </div>
            )}

            <button 
              onClick={() => setShowScanner(false)}
              className="w-full py-2 text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
