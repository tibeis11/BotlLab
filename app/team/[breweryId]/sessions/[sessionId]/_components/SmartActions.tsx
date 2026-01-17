'use client';

import { useState } from "react";
import { LogEventType } from "@/lib/types/session-log";
import { AddEventModal } from "./AddEventModal"; // Helper Modal

interface SmartActionsProps {
  onAddEvent: (event: any) => void; // Update type if needed, but we pass data now
  currentPhase: string;
}

export function SmartActions({ onAddEvent, currentPhase }: SmartActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<LogEventType | null>(null);

  const actions = [
    { type: 'NOTE', label: 'Notiz', icon: '📝', phases: ['all'] },
    { type: 'MEASUREMENT_SG', label: 'Dichte', icon: '🌡️', phases: ['fermenting', 'brewing', 'conditioning'] },
    { type: 'MEASUREMENT_VOLUME', label: 'Volumen', icon: '💧', phases: ['brewing', 'fermenting'] },
    { type: 'MEASUREMENT_PH', label: 'pH', icon: '🧪', phases: ['brewing', 'fermenting'] },
    { type: 'INGREDIENT_ADD', label: 'Zutat', icon: '🌿', phases: ['brewing', 'fermenting'] },
    { type: 'STATUS_CHANGE', label: 'Status ändern', icon: '🔄', phases: ['all'] },
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
                className="bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-3xl transition-transform duration-200 ${isOpen ? 'rotate-45 bg-gray-800 text-white' : 'bg-amber-500 text-white hover:scale-110'}`}
        >
          +
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
