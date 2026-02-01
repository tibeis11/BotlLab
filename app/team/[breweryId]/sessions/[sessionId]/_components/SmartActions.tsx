'use client';

import { useState } from "react";
import { LogEventType } from "@/lib/types/session-log";
import { AddEventModal } from "./AddEventModal";
import { 
    StickyNote, 
    Scale, 
    Droplets, 
    FlaskConical, 
    Leaf, 
    ArrowRightLeft,
    Plus,
    X
} from "lucide-react";

interface SmartActionsProps {
  onAddEvent: (event: any) => void;
  currentPhase: string;
}

export function SmartActions({ onAddEvent, currentPhase }: SmartActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<LogEventType | null>(null);

  const actions = [
    { type: 'NOTE', label: 'Notiz', Icon: StickyNote, phases: ['all'] },
    { type: 'MEASUREMENT_SG', label: 'Dichte messen', Icon: Scale, phases: ['fermenting', 'brewing', 'conditioning'] },
    { type: 'MEASUREMENT_VOLUME', label: 'Volumen messen', Icon: Droplets, phases: ['brewing', 'fermenting'] },
    { type: 'MEASUREMENT_PH', label: 'pH messen', Icon: FlaskConical, phases: ['brewing', 'fermenting'] },
    { type: 'INGREDIENT_ADD', label: 'Zutat hinzufügen', Icon: Leaf, phases: ['brewing', 'fermenting'] },
    { type: 'STATUS_CHANGE', label: 'Status ändern', Icon: ArrowRightLeft, phases: ['all'] },
  ];

  const filteredActions = actions.filter(action => 
    action.phases.includes('all') || action.phases.includes(currentPhase)
  );

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        
        {isOpen && (
          <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {filteredActions.map((action) => (
              <button
                key={action.type}
                onClick={() => {
                  if (['MEASUREMENT_SG', 'MEASUREMENT_VOLUME', 'MEASUREMENT_PH', 'NOTE'].includes(action.type)) {
                      setModalType(action.type as LogEventType);
                  } else {
                      onAddEvent({ type: action.type as LogEventType }); // Legacy fallback
                  }
                  setIsOpen(false);
                }}
                className="bg-black text-zinc-200 px-4 py-3 rounded-lg shadow-xl shadow-black/50 border border-zinc-800 flex items-center gap-3 hover:bg-zinc-900 transition-colors group"
              >
                <action.Icon className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                <span className="font-bold text-sm tracking-wide">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-90 border border-t-zinc-700/50 ${
                isOpen 
                ? 'bg-zinc-900 border-zinc-700 text-zinc-400 rotate-90' 
                : 'bg-gradient-to-br from-zinc-800 to-black border-zinc-800 text-white hover:border-zinc-500'
          }`}
        >
            {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
      
      {modalType && (
        <AddEventModal 
            isOpen={true}
            onClose={() => setModalType(null)}
            onSubmit={(type, data, title, description) => {
                onAddEvent({ type, data, title, description });
            }}
            defaultType={modalType}
        />
      )}
    </>
  );
}
