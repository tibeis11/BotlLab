'use client';

import { useSession } from '../SessionContext';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Scanner from '@/app/components/Scanner';
import BottleScanner from '@/app/components/BottleScanner';
import { TimelineEvent } from '@/lib/types/session-log';
import { calculatePrimingSugar, calculateResidualCO2, platoToSG } from '@/lib/brewing-calculations';

// Lucide Icons
import { 
    Check, 
    Wheat, 
    Leaf, 
    Droplets, 
    Flame, 
    Thermometer, 
    Clock, 
    Scale, 
    Activity, 
    Plus, 
    Dna, 
    Snowflake, 
    Calculator, 
    Calendar,
    ArrowRight,
    Beer,
    Timer,
    CheckCircle2
} from 'lucide-react';

import { AddEventModal } from './AddEventModal';
import BrewTimer from './BrewTimer';

/* Shared UI Components for internal consistency */
const PhaseCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`pt-2 md:p-0 mb-8 ${className}`}>
    {children}
  </div>
);

const PhaseTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{children}</h2>
);

const PhaseDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-zinc-400 text-base mb-8 max-w-2xl">{children}</p>
);

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition text-base font-mono placeholder:text-zinc-700" 
    />
);


/* --- Helper Components for Guided Experience --- */

const TaskItem = ({ title, completed, onClick, meta }: { title: string, completed: boolean, onClick: () => void, meta?: string }) => (
    <div 
        onClick={!completed ? onClick : undefined}
        className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
            completed 
                ? 'bg-emerald-950/10 border-emerald-500/20 opacity-70' 
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
        }`}
    >
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            completed 
                ? 'bg-emerald-500 border-emerald-500 text-black' 
                : 'bg-transparent border-zinc-700 text-transparent'
        }`}>
            {completed && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
        </div>
        <div className="flex-1">
            <span className={`font-medium text-sm ${completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{title}</span>
            {meta && <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">{meta}</div>}
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
            className={`flex justify-between items-center px-4 py-3 rounded-lg border transition-all cursor-pointer group ${
                isChecked 
                ? 'bg-zinc-900/50 border-zinc-800/50 opacity-50' 
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isChecked 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' 
                    : 'border-zinc-700 group-hover:border-zinc-500'
                }`}>
                    {isChecked && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>
                <span className={`font-medium text-sm transition-colors ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
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
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <Wheat className="w-3 h-3" /> Malz & Getreide
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
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <Leaf className="w-3 h-3" /> Hopfen
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
             <div className="flex gap-4">
                 <button 
                    onClick={() => openModal('MEASUREMENT_VOLUME')}
                    className="flex-1 py-3 bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg font-bold text-zinc-300 transition-colors flex flex-col items-center gap-1 group"
                 >
                     <Droplets className="w-5 h-5 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
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
      <div className="flex justify-end pt-6 border-t border-zinc-900">
        <button 
            onClick={() => changePhase('brewing')} 
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-bold rounded-lg transition-all shadow-lg active:scale-95"
        >
            <Flame className="w-4 h-4 text-orange-500" /> 
            <span>Brautag starten</span>
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
  
  // Normalize Data (unchanged logic)
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
      const stepName = step.name || step.step || step.title;
      const duration = parseFloat(step.duration || '0');
      const desc = duration > 0 
        ? `${step.temperature || step.temp}°C für ${step.duration} min`
        : `${step.temperature || step.temp}°C erreicht`;
        
      const existingEvent = findStepEvent(stepName, desc);

      if (existingEvent) {
          await removeEvent(existingEvent.id);
      } else {
          await addEvent({
              type: 'STATUS_CHANGE', 
              title: `Maischschritt: ${stepName}`,
              description: desc,
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
  
  const timerMashSteps = useMemo(() => mashSteps.map((step: any, i: number) => ({
      label: step.name || step.step || step.title || `Rast ${i+1}`,
      duration: parseFloat(step.duration || '0'), 
      temperature: parseFloat(step.temperature || step.temp)
  })), [mashSteps]);

  const timerBoilSteps = useMemo(() => hops.map((hop: any) => ({
      label: `${hop.name} (${hop.amount}g)`,
      duration: 0,
      timePoint: parseFloat(hop.time)
  })), [hops]);
  
  const totalBoilTime = useMemo(() => parseFloat(data.boil_time || "60"), [data.boil_time]);

  const lastOgEvent = session?.timeline
      .filter(e => e.type === 'MEASUREMENT_OG')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const handleLogOG = async () => {
    if (!og) return;
    const gravity = parseFloat(og.replace(',', '.'));
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
              <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Flame className="w-3 h-3" /> Maischplan
              </h3>
              
              <BrewTimer mode="MASH" steps={timerMashSteps} />

              <div className="space-y-3">
                  {mashSteps.map((step: any, i: number) => {
                       const name = step.name || step.step || step.title || `Rast ${i+1}`;
                       const temp = step.temperature || step.temp; // Support both
                       const stepDuration = parseFloat(step.duration || '0');
                       const desc = stepDuration > 0
                        ? `${temp}°C für ${stepDuration} min`
                        : `${temp}°C`;
                        
                       const isCompleted = !!findStepEvent(name, desc);

                       return (
                           <div 
                                key={i}
                                onClick={() => handleMashStep(step)}
                                className={`
                                    relative overflow-hidden rounded-lg border transition-all cursor-pointer group
                                    ${isCompleted 
                                        ? 'bg-zinc-900/30 border-zinc-800 opacity-60' 
                                        : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800'
                                    }
                                `}
                           >
                                <div className="p-4 flex items-center gap-4 md:gap-6">
                                    <div className={`
                                        w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center transition-all
                                        ${isCompleted 
                                            ? 'bg-emerald-500 border-emerald-500 text-black' 
                                            : 'border-zinc-700 bg-black/50 group-hover:border-zinc-500 text-transparent'
                                        }
                                    `}>
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </div>

                                    <div className="flex-1 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-zinc-950 rounded-lg border border-zinc-800/50 transition-colors">
                                                <div className={`text-base font-bold ${isCompleted ? 'text-zinc-500' : 'text-amber-500'}`}>{temp}°</div>
                                                <div className="text-[8px] uppercase font-bold text-zinc-600 tracking-wider">Temp</div>
                                            </div>
                                            <div>
                                                 <div className={`text-sm font-bold uppercase tracking-wide mb-1 ${isCompleted ? 'text-zinc-500' : 'text-zinc-300'}`}>{name}</div>
                                                 <div className="text-[10px] text-zinc-500 hidden md:block">Aufheizen auf {temp}°C</div>
                                            </div>
                                        </div>

                                        {stepDuration > 0 ? (
                                        <div className="text-right pl-4 border-l border-zinc-800/50">
                                            <div className={`text-xl font-bold font-mono ${isCompleted ? 'text-zinc-500' : 'text-white'}`}>
                                                {stepDuration}<span className="text-[10px] font-bold text-zinc-600 ml-1">min</span>
                                            </div>
                                            <div className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">Halten</div>
                                        </div>
                                        ) : (
                                         <div className="text-right pl-4 border-l border-zinc-800/50 opacity-50">
                                            <div className="text-xl font-bold text-zinc-600">-</div>
                                            <div className="text-[8px] uppercase font-bold text-zinc-700 tracking-wider">Ziel</div>
                                         </div>
                                        )}
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
                <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <Thermometer className="w-3 h-3" /> Kochplan
                </h3>
                <div className="flex items-center gap-2">
                    {data.boil_time && (
                        <div className="flex items-center gap-2 bg-red-950/20 px-2 py-1 rounded border border-red-500/20">
                            <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">Gesamtzeit</span>
                            <span className="text-xs font-bold text-white">{data.boil_time}<span className="text-[9px] text-red-500/50 font-bold ml-0.5">MIN</span></span>
                        </div>
                    )}
                </div>
              </div>
              
              <BrewTimer mode="BOIL" steps={timerBoilSteps} totalBoilTime={totalBoilTime} />
              
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
                                    relative overflow-hidden rounded-lg border transition-all cursor-pointer group
                                    ${isCompleted 
                                        ? 'bg-zinc-900/30 border-zinc-800 opacity-60' 
                                        : 'bg-zinc-900 border-zinc-800 hover:border-red-500/50 hover:bg-zinc-800'
                                    }
                                `}
                           >
                                <div className="p-4 flex items-center gap-4 md:gap-6">
                                    {/* 1 Checkbox (Left) */}
                                    <div className={`
                                        w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center transition-all
                                        ${isCompleted 
                                            ? 'bg-emerald-500 border-emerald-500 text-black' 
                                            : 'border-zinc-700 bg-black/50 group-hover:border-zinc-500 text-transparent'
                                        }
                                    `}>
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </div>

                                    {/* 2 Time (Focus) */}
                                    <div className="flex-1 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-zinc-950 rounded-lg border border-zinc-800/50 transition-colors">
                                                <div className={`text-base font-bold ${isCompleted ? 'text-zinc-500' : 'text-red-500'}`}>{hop.time}</div>
                                                <div className="text-[8px] uppercase font-bold text-zinc-600 tracking-wider">Min</div>
                                            </div>
                                            <div>
                                                 <div className={`text-sm font-bold uppercase tracking-wide mb-1 ${isCompleted ? 'text-zinc-500' : 'text-zinc-300'}`}>{title}</div>
                                                 <div className="text-[10px] text-zinc-500 hidden md:block">{hop.usage || 'Boil'} Addition</div>
                                            </div>
                                        </div>

                                        {/* 3 Amount (Right) */}
                                        <div className="text-right pl-4 border-l border-zinc-800/50">
                                            <div className={`text-xl font-mono font-bold ${isCompleted ? 'text-zinc-500' : 'text-white'}`}>
                                                {hop.amount}<span className="text-[10px] font-bold text-zinc-600 ml-1">g</span>
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

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 mb-8 overflow-hidden">
        {/* Header with Quick Actions */}
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
            <h4 className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-3 h-3" /> Messwerte
            </h4>
            <div className="flex gap-2">
                <button onClick={() => openModal('MEASUREMENT_SG')} className="px-2 py-1 bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                    + Dichte
                </button>
                <button onClick={() => openModal('MEASUREMENT_PH')} className="px-2 py-1 bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                    + pH
                </button>
            </div>
        </div>

        {/* Primary Action: Log OG */}
        <div className="p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 block">
                Anstellwürze (Stammwürze)
            </label>
            
            <div className="flex items-stretch gap-2 h-10 mb-2">
                <input 
                    type="number" 
                    step="0.001" 
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 text-white font-mono text-sm placeholder:text-zinc-700 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder={lastOgEvent ? `${(lastOgEvent.data as any)?.gravity}` : "1.050"}
                    value={og}
                    onChange={(e) => setOg(e.target.value)}
                />
                <button 
                    onClick={handleLogOG}
                    disabled={!og}
                    className="px-4 bg-zinc-900 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-zinc-900 text-white rounded-lg border border-zinc-800 font-bold transition-all"
                >
                    <Check className="w-4 h-4" />
                </button>
            </div>

            {/* Stats Row */}
            <div className="flex gap-6 text-xs pl-1 mt-3">
                 {/* Target */}
                 {(data.og || data.original_gravity) && (
                    <div className="flex items-center gap-2 text-zinc-500">
                        <span className="uppercase font-bold text-[10px] tracking-wider">Ziel</span>
                        <span className="font-mono text-zinc-300 border-b border-dashed border-zinc-700">
                             {(() => {
                                const val = parseFloat(data.og || data.original_gravity);
                                if (val >= 1.5) {
                                    return platoToSG(val).toFixed(3);
                                }
                                return val.toFixed(3);
                             })()}
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

      <div className="flex justify-end pt-6 border-t border-zinc-900">
        <button 
            onClick={finishDay} 
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-bold rounded-lg transition-all shadow-lg active:scale-95"
        >
            <Dna className="w-4 h-4 text-purple-600" />
            <span>Hefe anstellen (Phase Gärung)</span>
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
               <div className="px-3 py-1 bg-emerald-950/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded border border-emerald-500/20">
                   Aktiv
               </div>
            </div>

            {/* Compact Measurements Widget */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 mb-8 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
                    <h4 className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                        <Scale className="w-3 h-3" /> Messwerte & Kontrolle
                    </h4>
                    <div className="flex gap-2">
                        <button onClick={() => openModal('MEASUREMENT_VOLUME')} className="px-2 py-1 bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                            + Volumen
                        </button>
                        <button onClick={() => openModal('MEASUREMENT_PH')} className="px-2 py-1 bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] font-bold text-zinc-400 transition-colors">
                            + pH
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 block">
                        Aktuelle Dichte (SG)
                    </label>
                    
                    <div className="flex items-stretch gap-2 h-10 mb-2">
                        <input 
                            type="number" 
                            step="0.001" 
                            className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 text-white font-mono text-sm placeholder:text-zinc-700 focus:border-emerald-500 focus:outline-none transition-colors"
                            placeholder="1.xxx"
                            value={sg}
                            onChange={(e) => setSg(e.target.value)}
                        />
                        <button 
                            onClick={handleLogSG}
                            disabled={!sg}
                            className="px-4 bg-zinc-800 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 font-bold transition-all"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    </div>

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

            <div className="flex justify-end pt-6 border-t border-zinc-900">
                <button 
                    onClick={() => changePhase('conditioning')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-bold rounded-lg transition-all shadow-lg active:scale-95"
                >
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    <span>Cold Crash / Abfüllen</span>
                </button>
            </div>
        </PhaseCard>
    );
}

export function ConditioningView() {
    const { session, changePhase, addEvent } = useSession();
    
    // Carbonation Calculator State
    const [carbVolume, setCarbVolume] = useState(''); 
    const [carbTemp, setCarbTemp] = useState('20');
    const [carbTarget, setCarbTarget] = useState('5.0');
    const [sugarResult, setSugarResult] = useState(0);

    // Conditioning Timer State
    const [days, setDays] = useState(14);

    useEffect(() => {
        const batchSize = session?.brew?.recipe_data?.batch_size_liters;
        if(batchSize && !carbVolume) {
            setCarbVolume(batchSize.toString());
        }
    }, [session?.brew]);

    useEffect(() => {
        const v = parseFloat(carbVolume) || 0;
        const t = parseFloat(carbTemp) || 20;
        const co2 = parseFloat(carbTarget) || 5.0;
        const res = calculatePrimingSugar(v, t, co2);
        setSugarResult(res);
    }, [carbVolume, carbTemp, carbTarget]);
    
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

    return (
        <PhaseCard>
            <PhaseTitle>Reifung & Karbonisierung</PhaseTitle>
            <PhaseDescription>Flaschengärung vorbereiten, Zucker berechnen und Reifung überwachen.</PhaseDescription>

            {/* Carbonation Calculator */}
            <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 mb-8">
                 <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                     <Calculator className="w-4 h-4 text-zinc-400" /> Karbonisierung (Zucker-Rechner)
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
                        <div className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider font-bold">Höchste Temp. nach Gärung</div>
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
                     <div className="mt-6 p-4 bg-emerald-950/10 border border-emerald-500/10 rounded-lg flex items-center justify-between">
                         <div>
                             <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">Benötigter Zucker</div>
                             <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Haushaltszucker</div>
                         </div>
                         <div className="text-right">
                             <div className="text-2xl font-black text-emerald-400 font-mono">{sugarResult} <span className="text-sm text-emerald-600">g</span></div>
                             <div className="text-emerald-600/50 text-[10px] font-mono font-bold">{(sugarResult / (parseFloat(carbVolume)||1)).toFixed(1)} g/L</div>
                         </div>
                     </div>
                 ) : (
                     <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-500 text-xs font-bold uppercase tracking-widest text-center">
                         Bereit zur Berechnung
                     </div>
                 )}
            </div>

             {/* Conditioning Timer / Plan */}
             <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 mb-8">
                 <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                     <Timer className="w-4 h-4 text-zinc-400" /> {conditioningStartEvent ? 'Reifungs-Status' : 'Reifung planen'}
                 </h3>
                 
                 {conditioningStartEvent ? (
                     <div className="bg-zinc-950 rounded-lg p-5 border border-zinc-800 flex flex-col md:flex-row gap-6 items-center justify-between">
                         <div className="flex-1">
                             <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Geplantes Ende</div>
                             <div className="text-2xl font-black text-cyan-400 font-mono">
                                 {new Date((conditioningStartEvent.data as any).targetDate).toLocaleDateString()}
                             </div>
                             <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mt-1">
                                 {(conditioningStartEvent.data as any).days} Tage Reifezeit
                             </div>
                         </div>
                         <div className="text-center md:text-right">
                             {new Date() > new Date((conditioningStartEvent.data as any).targetDate) ? (
                                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                                     <Check className="w-4 h-4" /> <span className="font-bold text-xs uppercase tracking-wider">Abgeschlossen</span>
                                 </div>
                             ) : (
                                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg">
                                     <Activity className="w-4 h-4 animate-pulse" /> <span className="font-bold text-xs uppercase tracking-wider">Reift noch...</span>
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
                                <div className="text-zinc-400 font-bold whitespace-nowrap text-xs uppercase tracking-wider">
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
                            className="w-full md:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 font-bold text-white rounded-lg transition-colors border border-zinc-700 text-sm"
                         >
                             Plan Starten
                         </button>
                     </div>
                 )}
             </div>

             {/* Bottle Scanner - Refactored Component */}
             {session && (
                 <div className="mb-8">
                    <BottleScanner 
                        sessionId={session.id}
                        breweryId={session.brewery_id}
                        brewId={session.brew_id}
                    />
                 </div>
             )}
            
            <div className="flex justify-end pt-6 border-t border-zinc-900">
                <button 
                    onClick={() => changePhase('completed')} 
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fertig zum Trinken</span>
                </button>
            </div>
        </PhaseCard>
    );
}

export function CompletedView() {
     return (
        <PhaseCard className="text-center py-24 bg-zinc-900 rounded-lg border border-zinc-800 border-dashed">
            <div className="w-24 h-24 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                <Beer className="w-12 h-12 text-zinc-700" strokeWidth={1} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Prost!</h2>
            <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Dieser Sud ist abgeschlossen und archiviert.</p>
        </PhaseCard>
    );
}
