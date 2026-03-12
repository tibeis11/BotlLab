'use client';

import { useState } from 'react';
import { updateBottleDrinkingStatus } from '@/lib/actions/bottle-status-actions';
import { toast } from 'sonner';
import { Lock, Beer, PartyPopper } from 'lucide-react';

interface BottleStatusSliderProps {
  bottleId: string;
  initialStatus?: boolean | null;
  isQrVerified: boolean;
}

export default function BottleStatusSlider({ bottleId, initialStatus = false, isQrVerified }: BottleStatusSliderProps) {
  const [isDrinking, setIsDrinking] = useState<boolean>(!!initialStatus);
  const [loading, setLoading] = useState(false);

  const handleSetState = async (newState: boolean) => {
    if (loading || !isQrVerified) return;
    if (newState === isDrinking) return;
    
    // Optimistic update
    setIsDrinking(newState);
    setLoading(true);

    try {
      const res = await updateBottleDrinkingStatus(bottleId, newState);
      if (!res.success) {
        setIsDrinking(!newState);
        toast.error('Status konnte nicht aktualisiert werden ("' + (res.error || 'Unbekannter Fehler') + '")');
      } else {
        toast.success(newState ? 'Cheers! Lass es dir schmecken! 🍻' : 'Alles klar, Status auf verschlossen! 🔒');
      }
    } catch (err) {
      setIsDrinking(!newState);
      toast.error('Verbindungsfehler beim Aktualisieren.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-surface border border-border/50 rounded-[28px] p-5 mb-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
      {/* Playful Background Highlights */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-brand/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="text-center mb-5 relative z-10">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center justify-center gap-2">
          <PartyPopper className="w-4 h-4 text-brand" /> Trink-Status
        </h3>
        <p className="text-[11px] text-text-muted mt-1.5 font-medium">Was passiert gerade mit dieser Flasche?</p>
      </div>

      <div className="relative w-full bg-background border border-border/80 rounded-full p-1.5 flex items-center shadow-inner h-14 cursor-pointer focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-surface">
         {/* Sliding Active Pill */}
         <div 
           style={{ transform: isDrinking ? 'translateX(100%)' : 'translateX(0)' }}
           className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-brand rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_2px_10px_rgba(234,88,12,0.3)]"
         />

         {/* Button: Noch zu */}
         <button 
           type="button"
           onClick={() => handleSetState(false)}
           disabled={loading || !isQrVerified}
           className={`flex-1 h-full relative z-10 flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-300 ${
             !isDrinking ? 'text-background scale-105 drop-shadow-sm' : 'text-text-muted hover:text-text-primary'
           }`}
         >
           <Lock className="w-3.5 h-3.5" />
           Im Keller 🍾
         </button>

         {/* Button: Im Glas */}
         <button 
           type="button"
           onClick={() => handleSetState(true)}
           disabled={loading || !isQrVerified}
           className={`flex-1 h-full relative z-10 flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-300 ${
             isDrinking ? 'text-background scale-105 drop-shadow-sm' : 'text-text-muted hover:text-text-primary'
           }`}
         >
           <Beer className="w-3.5 h-3.5" />
           Im Glas 🍻
         </button>
      </div>

      {/* Lock Overlay if NOT QR Verified */}
      {!isQrVerified && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-[28px] transition-all">
          <div className="bg-surface px-4 py-2 rounded-xl shadow-xl border border-border flex items-center gap-2 text-xs font-bold text-text-primary translate-y-1">
            <Lock className="w-4 h-4 text-brand" />
            Nur mit QR-Scan
          </div>
        </div>
      )}
    </div>
  );
}
