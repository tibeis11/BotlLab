'use client';

import { useState } from 'react';
import { AlertTriangle, CheckSquare, Square, X, Upload } from 'lucide-react';

interface LegalConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'label' | 'cap' | null;
}

export default function LegalConsentModal({ isOpen, onClose, onConfirm, type }: LegalConsentModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-amber-900/20 border-b border-amber-900/30 p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 text-amber-500">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Rechtlicher Hinweis</h2>
          <p className="text-amber-200/80 text-sm">
            Bitte bestätige die Rechte an deinem {type === 'label' ? 'Etikett' : 'Kronkorken'}-Bild.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-zinc-300 text-sm leading-relaxed space-y-4">
            <p>
              Um die Sicherheit unserer Community zu gewährleisten und Urheberrechtsverletzungen zu vermeiden, 
              musst du vor dem Upload folgende Punkte bestätigen:
            </p>
            
            <ul className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
              <li className="flex gap-3 text-zinc-300">
                <span className="text-green-500 font-bold">✓</span>
                Ich besitze die vollen Nutzungsrechte an diesem Bild.
              </li>
              <li className="flex gap-3 text-zinc-300">
                <span className="text-green-500 font-bold">✓</span>
                Das Bild enthält keine illegalen, pornografischen oder gewaltverherrlichenden Inhalte.
              </li>
              <li className="flex gap-3 text-zinc-300">
                <span className="text-green-500 font-bold">✓</span>
                Ich stimme zu, dass illegale Inhalte zur sofortigen Sperrung meines Accounts führen.
              </li>
            </ul>
          </div>

          <label 
            className="flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/5 transition border border-transparent hover:border-white/10 group select-none relative"
            onClick={(e) => {
               e.preventDefault();
               setIsConfirmed(!isConfirmed); 
            }}
          >
            <div className={`mt-0.5 transition-colors ${isConfirmed ? 'text-cyan-500' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
              {isConfirmed ? <CheckSquare className="fill-cyan-500/10" /> : <Square />}
            </div>
            <span className={`text-sm font-medium transition-colors ${isConfirmed ? 'text-white' : 'text-zinc-400'}`}>
              Hiermit bestätige ich oben genannte Punkte und übernehme die Verantwortung für diesen Upload.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setIsConfirmed(false);
                onClose();
              }}
              className="px-4 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium transition"
            >
              Abbrechen
            </button>
            <button
              onClick={() => {
                if (isConfirmed) {
                    onConfirm();
                    setIsConfirmed(false); // Reset for next time
                }
              }}
              disabled={!isConfirmed}
              className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-black font-bold transition flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              Jetzt hochladen
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
