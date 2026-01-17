'use client';

import { useSession } from '../SessionContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Scanner from '@/app/components/Scanner';
import { TimelineEvent } from '@/lib/types/session-log';
import { calculatePrimingSugar, calculateResidualCO2 } from '@/lib/brewing-calculations';

import { AddEventModal } from './AddEventModal';

/* Shared UI Components for internal consistency */
const PhaseCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 md:p-8 mb-8 ${className}`}>
    {children}
  </div>
);

const PhaseTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{children}</h2>
);

const PhaseDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-2xl">{children}</p>
);

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-600 transition text-lg font-mono placeholder:text-zinc-700" 
    />
);


/* --- Helper Components for Guided Experience --- */

const TaskItem = ({ title, completed, onClick, meta }: { title: string, completed: boolean, onClick: () => void, meta?: string }) => (
    <div 
        onClick={!completed ? onClick : undefined}
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
            completed 
                ? 'bg-emerald-950/20 border-emerald-500/30 opacity-70' 
                : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
        }`}
    >
        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
            completed 
                ? 'bg-emerald-500 border-emerald-500 text-black' 
                : 'bg-zinc-900 border-zinc-700 text-transparent'
        }`}>
            {completed && <span className="text-sm font-bold">✓</span>}
        </div>
        <div className="flex-1">
            <span className={`font-medium ${completed ? 'text-emerald-400 line-through' : 'text-zinc-300'}`}>{title}</span>
            {meta && <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mt-1">{meta}</div>}
        </div>
    </div>
);

/* --- Phase Views --- */

export function PlanningView() {
  const { session, changePhase, addEvent } = useSession();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<any>('NOTE');

  const openModal = (type: string) => {
      setModalInitialType(type);
      setShowMeasureModal(true);
  };

  const handleModalSubmit = (type: any, data: any, title?: string, desc?: string) => {
      addEvent({
          type,
          data,
          title, 
          description: desc
      });
  };

  const data = session?.brew?.recipe_data || {};
  
  // Normalize Ingredients
  const ingredients = {
      malts: data.ingredients?.malts || data.malts || [],
      hops: data.ingredients?.hops || data.hops || [],
      yeast: data.ingredients?.yeast || data.yeast || null
  };

  const toggleItem = (id: string) => {
      const next = new Set(checkedItems);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setCheckedItems(next);
  };

  const ChecklistItem = ({ id, name, amount }: { id: string, name: string, amount: string }) => {
      const isChecked = checkedItems.has(id);
      return (
        <div 
            onClick={() => toggleItem(id)}
            className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-all cursor-pointer group ${
                isChecked 
                ? 'bg-zinc-900/50 border-zinc-800/50 opacity-50' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isChecked 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' 
                    : 'border-zinc-700 group-hover:border-zinc-500'
                }`}>
                    {isChecked && <span className="text-xs font-bold">✓</span>}
                </div>
                <span className={`font-medium transition-colors ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {name}
                </span>
            </div>
            <span className={`font-mono text-sm font-bold ${isChecked ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {amount}
            </span>
        </div>
      );
  };

  return (
    <PhaseCard>
      <div className="flex justify-between items-start mb-8">
        <div>
           <PhaseTitle>Vorbereitung</PhaseTitle>
           <p className="text-zinc-400 text-sm">Prüfe deine Zutaten für <span className="text-cyan-400 font-bold">{session?.brew?.name || 'dieses Rezept'}</span></p>
        </div>
      </div>

      {/* Ingredient Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Malts */}
          {ingredients.malts.length > 0 && (
              <div>
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <span>🌾</span> Malz & Getreide
                  </h3>
                  <div className="space-y-2">
                       {ingredients.malts.map((m: any, i: number) => (
                           <ChecklistItem 
                                key={`malt-${i}`}
                                id={`malt-${i}`}
                                name={m.name}
                                amount={`${m.amount} ${m.unit || 'kg'}`}
                           />
                       ))}
                  </div>
              </div>
          )}

          {/* Hops */}
            {ingredients.hops.length > 0 && (
              <div>
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <span>🌿</span> Hopfen
                  </h3>
                  <div className="space-y-2">
                       {ingredients.hops.map((h: any, i: number) => (
                           <ChecklistItem 
                                key={`hop-${i}`}
                                id={`hop-${i}`}
                                name={h.name}
                                amount={`${h.amount} ${h.unit || 'g'}`}
                           />
                       ))}
                  </div>
              </div>
          )}
      </div>
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-4">
             <div className="flex gap-4">
                 <button 
                    onClick={() => openModal('MEASUREMENT_VOLUME')}
                    className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl font-bold text-zinc-300 transition-colors flex flex-col items-center gap-1"
                 >
                     <span className="text-xl">💧</span>
                     <span className="text-xs uppercase tracking-wide">Brauwasser messen</span>
                 </button>
             </div>
      </div>
      
      <AddEventModal 
        isOpen={showMeasureModal} 
        onClose={() => setShowMeasureModal(false)} 
        onSubmit={handleModalSubmit}
        defaultType={modalInitialType}
      />
      <div className="flex justify-end pt-6 border-t border-zinc-800">
        <button 
            onClick={() => changePhase('brewing')} 
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20 active:scale-95"
        >
            <span>🔥</span> Brautag starten
        </button>
      </div>
    </PhaseCard>
  );
}

export function BrewingView() {
  const { session, changePhase, addEvent, removeEvent } = useSession();
  const [og, setOg] = useState<string>('');
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<any>('NOTE');
  
  const data = session?.brew?.recipe_data || {};
  
  // Normalize Data
  const mashSteps = data.mash_steps || data.mash_schedule || data.steps || [];
  const hops = (data.ingredients?.hops || data.hops || []).filter((h: any) => h.type === 'boil' || h.usage === 'Boil' || h.time > 0);
  
  const openModal = (type: string) => {
      setModalInitialType(type);
      setShowMeasureModal(true);
  };

  const handleModalSubmit = (type: any, data: any, title?: string, desc?: string) => {
      addEvent({
          type,
          data,
          title, 
          description: desc
      });
  };
  
  // Helper to find existing event for a step
  const findStepEvent = (stepName: string, descriptionIncludes?: string) => {
      return session?.timeline.find(e => {
          const nameMatch = (e.title && e.title.includes(stepName));
          if (!nameMatch) return false;
          
          if (descriptionIncludes) {
              return e.description && e.description.includes(descriptionIncludes);
          }
          return true;
      });
  };
  
  const handleMashStep = async (step: any) => {
      // Normalize name for checking
      const stepName = step.name || step.step || step.title;
      const desc = `${step.temperature || step.temp}°C für ${step.duration} min`;
      const existingEvent = findStepEvent(stepName, desc);

      if (existingEvent) {
          // Toggle OFF: Remove event
          await removeEvent(existingEvent.id);
      } else {
          // Toggle ON: Add event
          await addEvent({
              type: 'STATUS_CHANGE', // Or Note
              title: `Maischschritt: ${stepName}`,
              description: desc + " erledigt.",
              data: { newStatus: 'mashing', previousStatus: 'mashing', stepName }
          });
      }
  };

  const handleHopAdd = async (hop: any) => {
      const desc = `${hop.amount}g bei ${hop.time} min`;
      const existingEvent = findStepEvent(hop.name, desc);
      
      if (existingEvent) {
          await removeEvent(existingEvent.id);
      } else {
          await addEvent({
              type: 'INGREDIENT_ADD',
              title: `Hopfengabe: ${hop.name}`,
              description: desc,
              data: { name: hop.name, amount: hop.amount, unit: 'g', additionType: 'boil' }
          });
      }
  };

  const lastOgEvent = session?.timeline
      .filter(e => e.type === 'MEASUREMENT_OG')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const handleLogOG = async () => {
    if (!og) return;
    const gravity = parseFloat(og.replace(',', '.'));
    
    // If we have a measurement from *today* (or very recent), assume correction and remove old?
    // For now, simpler: Just add new measurement. It supersedes the old one in "Latest" view.
    
    await addEvent({
      type: 'MEASUREMENT_OG',
      title: 'Stammwürze gemessen',
      data: { gravity, unit: 'sg', originalValue: gravity }
    });
    setOg('');
  };

  const finishDay = async () => {
      await addEvent({
          type: 'STATUS_CHANGE',
          title: 'Gärung gestartet',
          description: 'Hefe angestellt, ab in den Gärschrank',
          data: { newStatus: 'fermenting', previousStatus: 'brewing' }
      });
      await changePhase('fermenting');
  };

  return (
    <PhaseCard>
      <PhaseTitle>Brautag</PhaseTitle>
      
      {/* 1. Mash Schedule */}
      {mashSteps.length > 0 && (
          <div className="mb-8">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Maischplan
              </h3>
              <div className="space-y-3">
                  {mashSteps.map((step: any, i: number) => {
                       // Normalize properties
                       const name = step.name || step.step || step.title || `Rast ${i+1}`;
                       const temp = step.temperature || step.temp; // Support both
                       const desc = `${temp}°C für ${step.duration} min`;
                       const isCompleted = !!findStepEvent(name, desc);

                       return (
                           <div 
                                key={i}
                                onClick={() => handleMashStep(step)}
                                className={`
                                    relative overflow-hidden rounded-2xl border transition-all cursor-pointer group
                                    ${isCompleted 
                                        ? 'bg-zinc-900/30 border-zinc-800 opacity-60' 
                                        : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/10'
                                    }
                                `}
                           >
                                {/* Progress Bar Background (Optional idea: fill based on time? For now simplified) */}
                                {isCompleted && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>}

                                <div className="p-4 flex items-center gap-4 md:gap-6">
                                    {/* 1 Checkbox */}
                                    <div className={`
                                        w-8 h-8 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all
                                        ${isCompleted 
                                            ? 'bg-emerald-500 border-emerald-500 text-black scale-110' 
                                            : 'border-zinc-700 bg-black/50 group-hover:border-zinc-500 text-transparent'
                                        }
                                    `}>
                                        <span className="text-sm font-bold">✓</span>
                                    </div>

                                    {/* 2 Temp (Focus) */}
                                    <div className="flex-1 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-zinc-950 rounded-xl border border-zinc-800/50 group-hover:border-amber-500/30 transition-colors">
                                                <div className={`text-xl font-black ${isCompleted ? 'text-zinc-500' : 'text-amber-500'}`}>{temp}°</div>
                                                <div className="text-[8px] uppercase font-bold text-zinc-600 tracking-wider">Temp</div>
                                            </div>
                                            <div>
                                                 <div className={`text-sm font-bold uppercase tracking-wide mb-1 ${isCompleted ? 'text-zinc-500' : 'text-zinc-300'}`}>{name}</div>
                                                 <div className="text-xs text-zinc-500 hidden md:block">Aufheizen auf {temp}°C</div>
                                            </div>
                                        </div>

                                        {/* 3 Duration (Time) */}
                                        <div className="text-right pl-4 border-l border-zinc-800/50">
                                            <div className={`text-2xl font-black ${isCompleted ? 'text-zinc-500' : 'text-white'}`}>
                                                {step.duration}<span className="text-xs font-bold text-zinc-600 ml-1">min</span>
                                            </div>
                                            <div className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">Halten</div>
                                        </div>
                                    </div>
                                </div>
                           </div>
                       );
                  })}
              </div>
          </div>
      )}

      {/* 2. Boil Schedule */}
      {hops.length > 0 && (
          <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Kochplan
                </h3>
                {data.boil_time && (
                    <div className="flex items-center gap-2 bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-500/20">
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Gesamtzeit</span>
                        <span className="text-sm font-black text-white">{data.boil_time}<span className="text-[10px] text-red-500/50 font-bold ml-0.5">MIN</span></span>
                    </div>
                )}
              </div>
              <div className="space-y-3">
                  {hops.sort((a: any, b: any) => b.time - a.time).map((hop: any, i: number) => {
                       const title = `${hop.name}`;
                       const desc = `${hop.amount}g bei ${hop.time} min`;
                       const isCompleted = !!findStepEvent(hop.name, desc);

                       return (
                           <div 
                                key={i}
                                onClick={() => handleHopAdd(hop)}
                                className={`
                                    relative overflow-hidden rounded-2xl border transition-all cursor-pointer group
                                    ${isCompleted 
                                        ? 'bg-zinc-900/30 border-zinc-800 opacity-60' 
                                        : 'bg-zinc-900 border-zinc-800 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-900/10'
                                    }
                                `}
                           >
                                {/* Progress Bar Background */}
                                {isCompleted && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>}

                                <div className="p-4 flex items-center gap-4 md:gap-6">
                                    {/* 1 Checkbox (Left) */}
                                    <div className={`
                                        w-8 h-8 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all
                                        ${isCompleted 
                                            ? 'bg-emerald-500 border-emerald-500 text-black scale-110' 
                                            : 'border-zinc-700 bg-black/50 group-hover:border-zinc-500 text-transparent'
                                        }
                                    `}>
                                        <span className="text-sm font-bold">✓</span>
                                    </div>

                                    {/* 2 Time (Focus) */}
                                    <div className="flex-1 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-zinc-950 rounded-xl border border-zinc-800/50 group-hover:border-red-500/30 transition-colors">
                                                <div className={`text-xl font-black ${isCompleted ? 'text-zinc-500' : 'text-red-500'}`}>{hop.time}</div>
                                                <div className="text-[8px] uppercase font-bold text-zinc-600 tracking-wider">Min</div>
                                            </div>
                                            <div>
                                                 <div className={`text-sm font-bold uppercase tracking-wide mb-1 ${isCompleted ? 'text-zinc-500' : 'text-zinc-300'}`}>{title}</div>
                                                 <div className="text-xs text-zinc-500 hidden md:block">{hop.usage || 'Boil'} Addition</div>
                                            </div>
                                        </div>

                                        {/* 3 Amount (Right) */}
                                        <div className="text-right pl-4 border-l border-zinc-800/50">
                                            <div className={`text-2xl font-black ${isCompleted ? 'text-zinc-500' : 'text-white'}`}>
                                                {hop.amount}<span className="text-xs font-bold text-zinc-600 ml-1">g</span>
                                            </div>
                                            <div className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">Menge</div>
                                        </div>
                                    </div>
                                </div>
                           </div>
                       );
                  })}
              </div>
          </div>
      )}

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 mb-8 overflow-hidden">
        {/* Header with Quick Actions */}
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
            <h4 className="text-zinc-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <span>📏</span> Messwerte
            </h4>
            <div className="flex gap-2">
                <button onClick={() => openModal('MEASUREMENT_SG')} className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                    + Dichte
                </button>
                <button onClick={() => openModal('MEASUREMENT_PH')} className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                    + pH
                </button>
            </div>
        </div>

        {/* Primary Action: Log OG */}
        <div className="p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 block">
                Anstellwürze (Stammwürze)
            </label>
            
            <div className="flex items-stretch gap-2 h-12 mb-2">
                <input 
                    type="number" 
                    step="0.001" 
                    className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 text-white font-mono text-lg placeholder:text-zinc-700 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder={lastOgEvent ? `${(lastOgEvent.data as any)?.gravity}` : "1.050"}
                    value={og}
                    onChange={(e) => setOg(e.target.value)}
                />
                <button 
                    onClick={handleLogOG}
                    disabled={!og}
                    className="px-5 bg-zinc-800 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 font-bold transition-all text-xl"
                >
                    ✓
                </button>
            </div>

            {/* Stats Row */}
            <div className="flex gap-6 text-xs pl-1">
                 {/* Target */}
                 {(data.og || data.original_gravity) && (
                    <div className="flex items-center gap-2 text-zinc-500">
                        <span className="uppercase font-bold text-[10px] tracking-wider">Ziel</span>
                        <span className="font-mono text-zinc-300 border-b border-dashed border-zinc-700">
                             {(() => {
                                const val = parseFloat(data.og || data.original_gravity);
                                if (val > 20) {
                                    return (1 + (val / 1000)).toFixed(3);
                                }
                                return val;
                             })()}
                        </span>
                    </div>
                 )}
                 
                 {/* Last Measured */}
                 {lastOgEvent && (
                    <div className="flex items-center gap-2 text-emerald-500/80">
                        <span className="uppercase font-bold text-[10px] tracking-wider">Aktuell</span>
                        <span className="font-mono text-emerald-400 bg-emerald-950/30 px-1 rounded">
                            {(lastOgEvent.data as any)?.gravity}
                        </span>
                    </div>
                 )}
            </div>
        </div>
      </div>

      <AddEventModal 
        isOpen={showMeasureModal} 
        onClose={() => setShowMeasureModal(false)} 
        onSubmit={handleModalSubmit}
        defaultType={modalInitialType}
      />

      <div className="flex justify-end pt-6 border-t border-zinc-800">
        <button 
            onClick={finishDay} 
            className="flex items-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
        >
            <span>🧬</span> Hefe anstellen (Phase Gärung)
        </button>
      </div>
    </PhaseCard>
  );
}


export function FermentingView() {
    const { session, changePhase, addEvent } = useSession();
    const [sg, setSg] = useState<string>('');
    const [showMeasureModal, setShowMeasureModal] = useState(false);
    const [modalInitialType, setModalInitialType] = useState<any>('NOTE');

    const openModal = (type: string) => {
        setModalInitialType(type);
        setShowMeasureModal(true);
    };

    const handleModalSubmit = (type: any, data: any, title?: string, desc?: string) => {
        addEvent({
            type,
            data,
            title, 
            description: desc
        });
    };

    const handleLogSG = async () => {
        if (!sg) return;
        const gravity = parseFloat(sg.replace(',', '.'));
        await addEvent({
          type: 'MEASUREMENT_SG',
          title: 'Messung (SG)',
          description: `${gravity.toFixed(3)} SG`,
          data: { gravity, unit: 'sg', originalValue: gravity }
        });
        setSg('');
    };

    const lastSgEvent = session?.timeline
        .filter(e => e.type === 'MEASUREMENT_SG')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return (
        <PhaseCard>
            <div className="flex justify-between items-center mb-6">
               <PhaseTitle>Hauptgärung</PhaseTitle>
               <div className="px-3 py-1 bg-emerald-950/30 text-emerald-400 text-xs font-black uppercase tracking-widest rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                   Aktiv
               </div>
            </div>

            {/* Compact Measurements Widget */}
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 mb-8 overflow-hidden">
                {/* Header with Quick Actions */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
                    <h4 className="text-zinc-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>📏</span> Messwerte & Kontrolle
                    </h4>
                    <div className="flex gap-2">
                        <button onClick={() => openModal('MEASUREMENT_VOLUME')} className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                            + Volumen
                        </button>
                        <button onClick={() => openModal('MEASUREMENT_PH')} className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                            + pH
                        </button>
                    </div>
                </div>

                {/* Primary Action: Log SG */}
                <div className="p-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 block">
                        Aktuelle Dichte (SG)
                    </label>
                    
                    <div className="flex items-stretch gap-2 h-12 mb-2">
                        <input 
                            type="number" 
                            step="0.001" 
                            className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 text-white font-mono text-lg placeholder:text-zinc-700 focus:border-emerald-500 focus:outline-none transition-colors"
                            placeholder="1.xxx"
                            value={sg}
                            onChange={(e) => setSg(e.target.value)}
                        />
                        <button 
                            onClick={handleLogSG}
                            disabled={!sg}
                            className="px-5 bg-zinc-800 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 font-bold transition-all text-xl"
                        >
                            ✓
                        </button>
                    </div>

                     {/* Last Measured */}
                     {lastSgEvent && (
                        <div className="flex items-center gap-2 text-emerald-500/80 mt-2 text-xs pl-1">
                            <span className="uppercase font-bold text-[10px] tracking-wider">Letzte Messung</span>
                            <span className="font-mono text-emerald-400 bg-emerald-950/30 px-1 rounded">
                                {(lastSgEvent.data as any)?.gravity}
                            </span>
                             <span className="text-zinc-600">
                                ({new Date(lastSgEvent.date).toLocaleDateString()})
                            </span>
                        </div>
                     )}
                </div>
            </div>

            <AddEventModal 
                isOpen={showMeasureModal} 
                onClose={() => setShowMeasureModal(false)} 
                onSubmit={handleModalSubmit}
                defaultType={modalInitialType}
            />

            <div className="flex justify-end pt-6 border-t border-zinc-800">
                <button 
                    onClick={() => changePhase('conditioning')}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                >
                    <span>❄️</span> Cold Crash / Abfüllen
                </button>
            </div>
        </PhaseCard>
    );
}

export function ConditioningView() {
    const { session, changePhase, addEvent } = useSession();
    const [showScanner, setShowScanner] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<{type: 'success' | 'error', msg: string} | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filledAtDate, setFilledAtDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // Carbonation Calculator State
    const [carbVolume, setCarbVolume] = useState(''); 
    const [carbTemp, setCarbTemp] = useState('20');
    const [carbTarget, setCarbTarget] = useState('5.0');
    const [sugarResult, setSugarResult] = useState(0);

    // Initial Load - Set defaults if not set
    useEffect(() => {
        const batchSize = session?.brew?.recipe_data?.batch_size_liters;
        if(batchSize && !carbVolume) {
            setCarbVolume(batchSize.toString());
        }
    }, [session?.brew]);

    // Live Calculation
    useEffect(() => {
        const v = parseFloat(carbVolume) || 0;
        const t = parseFloat(carbTemp) || 20;
        const co2 = parseFloat(carbTarget) || 5.0;
        const res = calculatePrimingSugar(v, t, co2);
        setSugarResult(res);
    }, [carbVolume, carbTemp, carbTarget]);
    
    // Bottle Stats
    const [filledCount, setFilledCount] = useState(0);
    const [lastScannedNumber, setLastScannedNumber] = useState<number | null>(null);
    
    // Conditioning Timer State
    const [days, setDays] = useState(14);
    
    // Init: Load existing bottle count
    useEffect(() => {
        if (!session?.id) return;
        const fetchCount = async () => {
             const { count, error } = await supabase
                 .from('bottles')
                 .select('id', { count: 'exact', head: true })
                 .eq('session_id', session.id);
             
             if (!error && count !== null) setFilledCount(count);
        };
        fetchCount();
    }, [session?.id]);

    const conditioningStartEvent = session?.timeline
        .find(e => e.type === 'NOTE' && e.title === 'Reifung gestartet');

    const handleStartConditioning = async () => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        
        await addEvent({
            type: 'NOTE',
            title: 'Reifung gestartet',
            description: `Reifung für ${days} Tage geplant. Voraussichtliches Ende: ${targetDate.toLocaleDateString()}`,
            data: { 
                targetDate: targetDate.toISOString(), 
                days,
                type: 'CONDITIONING_TIMER' 
            }
        });
    };

    const handleScan = async (decodedText: string) => {
        if (isProcessing || !session) return;

        // Match UUID
        const idMatch = decodedText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (!idMatch) {
             setScanFeedback({ type: 'error', msg: "❌ Ungültiger Code" });
             return;
        }

        const bottleId = idMatch[0];
        setIsProcessing(true);

        try {
             // 1. Check existing status first to prevent duplicates
             const { data: existing, error: checkError } = await supabase
                .from('bottles')
                .select('id, bottle_number, session_id, brewery_id')
                .eq('id', bottleId)
                .single();

             if (checkError) throw new Error("Flasche nicht gefunden.");
             
             // Check ownership
             if (existing.brewery_id !== session.brewery_id) {
                 throw new Error("Fremde Flasche! Gehört nicht zur Brauerei.");
             }

             // Check duplicate scan
             if (existing.session_id === session.id) {
                 setLastScannedNumber(existing.bottle_number);
                 setScanFeedback({ type: 'error', msg: `⚠️ Flasche #${existing.bottle_number} bereits hier erfasst!` });
                 return; // Exit: do not increment count
             }

             // 2. Assign bottle
             const { data, error } = await supabase
                .from('bottles')
                .update({ 
                    session_id: session.id,
                    brew_id: session.brew_id,
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
        } catch (e: any) {
             setScanFeedback({ type: 'error', msg: "Fehler: " + e.message });
        } finally {
             // Debounce/Delay next scan
             setTimeout(() => {
                 setIsProcessing(false);
                 setScanFeedback(null); 
             }, 1500);
        }
    };

    return (
        <PhaseCard>
            <PhaseTitle>Reifung & Karbonisierung</PhaseTitle>
            <PhaseDescription>Flaschengärung vorbereiten, Zucker berechnen und Reifung überwachen.</PhaseDescription>

            {/* Carbonation Calculator */}
            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mb-8">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <span>🍬</span> Karbonisierung (Zucker-Rechner)
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Menge (Liter)</label>
                        <InputField 
                            type="number" 
                            step="0.5"
                            value={carbVolume}
                            onChange={(e) => setCarbVolume(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Jungbier Temp (°C)</label>
                        <InputField 
                            type="number" 
                            step="1"
                            value={carbTemp}
                            onChange={(e) => setCarbTemp(e.target.value)}
                        />
                        <div className="text-[10px] text-zinc-600 mt-1">Höchste Temp. nach Gärung</div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Ziel CO₂ (g/l)</label>
                        <InputField 
                            type="number" 
                            step="0.1"
                            value={carbTarget}
                            onChange={(e) => setCarbTarget(e.target.value)}
                        />
                    </div>
                 </div>
                 
                 {sugarResult > 0 ? (
                     <div className="mt-6 p-4 bg-gradient-to-r from-emerald-900/20 to-zinc-900 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                         <div>
                             <div className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-1">Benötigter Zucker</div>
                             <div className="text-zinc-400 text-xs">Haushaltszucker (Saccharose)</div>
                         </div>
                         <div className="text-right">
                             <div className="text-3xl font-black text-emerald-400">{sugarResult} <span className="text-lg text-emerald-600">g</span></div>
                             <div className="text-emerald-600/50 text-xs font-mono font-bold">{(sugarResult / (parseFloat(carbVolume)||1)).toFixed(1)} g/L</div>
                         </div>
                     </div>
                 ) : (
                     <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 text-sm text-center">
                         Keine Zuckerzugabe nötig oder ungültige Werte.
                     </div>
                 )}
            </div>

             {/* Conditioning Timer / Plan */}
             <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mb-8">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <span>⏳</span> {conditioningStartEvent ? 'Reifungs-Status' : 'Reifung planen'}
                 </h3>
                 
                 {conditioningStartEvent ? (
                     <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex flex-col md:flex-row gap-6 items-center justify-between">
                         <div className="flex-1">
                             <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Geplantes Ende</div>
                             <div className="text-2xl font-black text-cyan-400">
                                 {new Date((conditioningStartEvent.data as any).targetDate).toLocaleDateString()}
                             </div>
                             <div className="text-zinc-500 text-sm mt-1">
                                 ({(conditioningStartEvent.data as any).days} Tage Reifezeit)
                             </div>
                         </div>
                         <div className="text-center md:text-right">
                             {new Date() > new Date((conditioningStartEvent.data as any).targetDate) ? (
                                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                                     <span>✅</span> <span className="font-bold">Reifung abgeschlossen</span>
                                 </div>
                             ) : (
                                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg">
                                     <span className="animate-pulse">●</span> <span className="font-bold">Reift noch...</span>
                                 </div>
                             )}
                         </div>
                     </div>
                 ) : (
                     <div className="flex flex-col md:flex-row gap-4 items-end">
                         <div className="flex-1 w-full">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Dauer (Tage)</label>
                             <div className="flex items-center gap-3">
                                <InputField 
                                    type="number" 
                                    value={days}
                                    onChange={(e) => setDays(parseInt(e.target.value))} 
                                    min="1"
                                />
                                <div className="text-zinc-400 font-bold whitespace-nowrap">
                                    ➝ {(() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + (days || 0));
                                        return d.toLocaleDateString();
                                    })()}
                                </div>
                             </div>
                         </div>
                         <button 
                            onClick={handleStartConditioning}
                            className="w-full md:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 font-bold text-white rounded-xl transition-colors border border-zinc-700"
                         >
                             Plan Starten
                         </button>
                     </div>
                 )}
             </div>

             <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mb-8">
                 <div className="flex justify-between items-center mb-4">
                     <div>
                         <h3 className="text-lg font-bold text-white">Abfüllen & Scannen</h3>
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
                         <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Abgefüllt am</label>
                         <InputField 
                             type="date" 
                             value={filledAtDate}
                             onChange={(e) => setFilledAtDate(e.target.value)} 
                         />
                     </div>

                     {!showScanner ? (
                         <button 
                            onClick={() => setShowScanner(true)}
                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-zinc-700"
                        >
                             <span>📷</span> Scanner starten
                         </button>
                     ) : (
                         <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                             <div className="rounded-xl overflow-hidden border border-zinc-700 relative bg-black aspect-square max-w-[300px] mx-auto">
                                  <Scanner onScanSuccess={handleScan} />
                                  <div className="absolute inset-0 pointer-events-none border-[30px] border-black/50"></div>
                             </div>
                             
                             {scanFeedback && (
                                <div className={`p-4 rounded-xl text-center font-bold text-sm ${
                                    scanFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                    {scanFeedback.msg}
                                </div>
                             )}

                             <button 
                                onClick={() => setShowScanner(false)}
                                className="w-full py-2 text-zinc-500 text-sm hover:text-white transition-colors"
                             >
                                 Scanner schließen
                             </button>
                         </div>
                     )}
                 </div>
             </div>
            
            <div className="flex justify-end pt-6 border-t border-zinc-800">
                <button 
                    onClick={() => changePhase('completed')} 
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                >
                    <span>✅</span> Fertig zum Trinken (Archivieren)
                </button>
            </div>
        </PhaseCard>
    );
}

export function CompletedView() {
     return (
        <PhaseCard className="text-center py-12">
            <div className="text-7xl mb-6">🍻</div>
            <h2 className="text-3xl font-black text-white mb-2">Prost!</h2>
            <p className="text-zinc-400 text-lg">Dieser Sud ist abgeschlossen und archiviert.</p>
        </PhaseCard>
    );
}
