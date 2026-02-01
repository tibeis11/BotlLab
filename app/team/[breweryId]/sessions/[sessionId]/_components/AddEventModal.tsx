'use client';

import { useState } from 'react';
import { LogEventType, MeasurementData } from '@/lib/types/session-log';
import { X, Scale, Droplets, FlaskConical, StickyNote, Save } from 'lucide-react';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: LogEventType, data: any, title?: string, description?: string) => void;
  defaultType?: LogEventType;
}

export function AddEventModal({ isOpen, onClose, onSubmit, defaultType = 'NOTE' }: AddEventModalProps) {
  const [activeType, setActiveType] = useState<LogEventType>(defaultType);
  
  // Form States
  const [gravity, setGravity] = useState<string>('1.050');
  const [gravityUnit, setGravityUnit] = useState<'sg' | 'plato'>('sg');
  const [temperature, setTemperature] = useState<string>('20');
  const [volume, setVolume] = useState<string>('20.0');
  const [ph, setPh] = useState<string>('5.2');
  const [note, setNote] = useState<string>('');
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let submitData: any = {};
    let title = '';
    let description = '';

    if (activeType.startsWith('MEASUREMENT_OG') || activeType.startsWith('MEASUREMENT_SG') || activeType.startsWith('MEASUREMENT_FG')) {
      // Calculate SG from Plato if needed
      let sg = parseFloat(gravity);
      let originalVal = parseFloat(gravity);
      
      if (gravityUnit === 'plato') {
         // Plato to SG: SG = 259 / (259 - Plato) for simple conversion
         sg = 259 / (259 - parseFloat(gravity));
      }

      const measData: MeasurementData = {
        gravity: sg,
        unit: gravityUnit,
        originalValue: originalVal,
        temperature: parseFloat(temperature)
      };
      
      submitData = measData;
      title = activeType === 'MEASUREMENT_OG' ? 'Stammwürze gemessen' : (activeType === 'MEASUREMENT_FG' ? 'Restextrakt gemessen' : 'Messung');
      description = `${originalVal.toFixed(gravityUnit === 'sg' ? 3 : 1)} ${gravityUnit === 'sg' ? 'SG' : '°P'} @ ${temperature}°C`;
    
    } else if (activeType === 'MEASUREMENT_VOLUME') {
        const vol = parseFloat(volume);
        submitData = { volume: vol, temperature: parseFloat(temperature) };
        title = 'Volumen gemessen';
        description = `${vol} Liter @ ${temperature}°C`;

    } else if (activeType === 'MEASUREMENT_PH') {
        const phVal = parseFloat(ph);
        submitData = { ph: phVal, temperature: parseFloat(temperature) };
        title = 'pH-Wert gemessen';
        description = `pH ${phVal} @ ${temperature}°C`;

    } else if (activeType === 'NOTE') {
        submitData = {};
        title = 'Notiz';
        description = note;
    }

    onSubmit(activeType, submitData, title, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <h3 className="font-bold text-white text-base">Ereignis hinzufügen</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2 p-4 overflow-x-auto border-b border-zinc-800 bg-zinc-950/50 scrollbar-hide">
           <TabButton 
               active={['MEASUREMENT_SG', 'MEASUREMENT_OG', 'MEASUREMENT_FG'].includes(activeType)} 
               onClick={() => {
                   if (defaultType === 'MEASUREMENT_OG') setActiveType('MEASUREMENT_OG');
                   else if (defaultType === 'MEASUREMENT_FG') setActiveType('MEASUREMENT_FG');
                   else setActiveType('MEASUREMENT_SG');
               }} 
               Icon={Scale}
               label="Dichte" 
           />
           <TabButton active={activeType === 'MEASUREMENT_VOLUME'} onClick={() => setActiveType('MEASUREMENT_VOLUME')} Icon={Droplets} label="Volumen" />
           <TabButton active={activeType === 'MEASUREMENT_PH'} onClick={() => setActiveType('MEASUREMENT_PH')} Icon={FlaskConical} label="pH" />
           <TabButton active={activeType === 'NOTE'} onClick={() => setActiveType('NOTE')} Icon={StickyNote} label="Notiz" />
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
            
            {/* Gravity Inputs */}
            {['MEASUREMENT_SG', 'MEASUREMENT_OG', 'MEASUREMENT_FG'].includes(activeType) && (
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Wert</label>
                             <div className="relative">
                                <input 
                                    type="number" 
                                    step={gravityUnit === 'sg' ? "0.001" : "0.1"} 
                                    value={gravity} 
                                    onChange={e => setGravity(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-xl font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-zinc-800"
                                    placeholder={gravityUnit === 'sg' ? "1.050" : "12.5"}
                                />
                             </div>
                         </div>
                         <div className="space-y-2">
                             <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Einheit</label>
                             <div className="flex bg-black rounded-lg p-1 border border-zinc-800">
                                 <button type="button" onClick={() => setGravityUnit('sg')} className={`flex-1 py-2 rounded-md text-xs font-bold transition ${gravityUnit === 'sg' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>SG</button>
                                 <button type="button" onClick={() => setGravityUnit('plato')} className={`flex-1 py-2 rounded-md text-xs font-bold transition ${gravityUnit === 'plato' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>°P</button>
                             </div>
                         </div>
                     </div>
                     
                     <div className="space-y-2">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temperatur (°C)</label>
                         <input 
                            type="number" 
                            step="0.1" 
                            value={temperature} 
                            onChange={e => setTemperature(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-base font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                        />
                     </div>
                </div>
            )}

            {/* Volume Inputs */}
            {activeType === 'MEASUREMENT_VOLUME' && (
                <div className="space-y-4">
                     <div className="space-y-2">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gemessenes Volumen (Liter)</label>
                         <input 
                            type="number" 
                            step="0.1" 
                            value={volume} 
                            onChange={e => setVolume(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-xl font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                        />
                     </div>
                     <div className="space-y-2">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temperatur (°C) <span className="text-zinc-600 font-normal normal-case">(für Ausdehnungskorrektur)</span></label>
                         <input 
                            type="number" 
                            step="0.1" 
                            value={temperature} 
                            onChange={e => setTemperature(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-base font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                        />
                     </div>
                </div>
            )}

           {/* pH Inputs */}
            {activeType === 'MEASUREMENT_PH' && (
                <div className="space-y-4">
                     <div className="space-y-2">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">pH-Wert</label>
                         <input 
                            type="number" 
                            step="0.01" 
                            value={ph} 
                            onChange={e => setPh(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-xl font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                        />
                     </div>
                     <div className="space-y-2">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temperatur (°C)</label>
                         <input 
                            type="number" 
                            step="0.1" 
                            value={temperature} 
                            onChange={e => setTemperature(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-base font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                        />
                     </div>
                </div>
            )}

            {/* Note Inputs */}
            {activeType === 'NOTE' && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notiz</label>
                    <textarea 
                        rows={4}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-base focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none transition-all placeholder:text-zinc-700"
                        placeholder="Was ist passiert?"
                    />
                </div>
            )}

            <button type="submit" className="w-full py-3 bg-zinc-100 hover:bg-white text-black font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transform transition active:scale-95">
                <Save className="w-4 h-4" />
                <span>Speichern</span>
            </button>
        </form>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, Icon, label }: { active: boolean, onClick: () => void, Icon: any, label: string }) {
    return (
        <button 
            type="button"
            onClick={onClick} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all border ${
                active 
                ? 'bg-zinc-800 border-zinc-700 text-white shadow-sm' 
                : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
        >
            <Icon className="w-4 h-4" />
            <span className="font-medium text-xs uppercase tracking-wide">{label}</span>
        </button>
    )
}
