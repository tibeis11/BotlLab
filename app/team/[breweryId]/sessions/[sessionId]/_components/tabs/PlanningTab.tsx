'use client';

import { useSession } from '../../SessionContext';
import { PhaseCard, PhaseTitle, PhaseDescription } from './PhaseLayout';
import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { calculateWaterProfile } from '@/lib/brewing-calculations';
import { AddEventModal } from '../AddEventModal';
import { Check, Droplets, Plus, Wheat, Leaf } from 'lucide-react';
import { BotlGuideTrigger } from '@/app/components/BotlGuideTrigger';

const scaleAmount = (amount: any, factor: number) => {
    if (factor === 1 || !amount) return amount;
    const num = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(num)) return amount;
    
    const result = num * factor;
    // Smart rounding
    if (result < 10) return result.toFixed(2).replace('.', ',');
    if (result < 100) return result.toFixed(1).replace('.', ',');
    return Math.round(result).toString();
};

export function PlanningTab() {
  const { session, addEvent, updateSessionData } = useSession();
  const initialized = useRef(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<any>('NOTE');

  useEffect(() => {
    if ((session?.measurements as any)?.checklist && !initialized.current) {
        setCheckedItems(new Set((session?.measurements as any).checklist));
        initialized.current = true;
    }
  }, [session]);

  const updateDB = useDebouncedCallback((items: string[]) => {
      if(!session) return;
      updateSessionData({
          measurements: {
              ...(session.measurements || {}),
              checklist: items
          } as any
      });
  }, 1000);

  const toggleItem = (id: string) => {
      const next = new Set(checkedItems);
      if (next.has(id)) { next.delete(id); }
      else { next.add(id); }
      setCheckedItems(next);
      updateDB(Array.from(next));
  };

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
  
  // Scaling Logic
  const measurements = (session?.measurements as any) || {};
  const scaleVolume = parseFloat(String(measurements.target_volume || 0));
  const originalVolume = parseFloat(String(measurements.original_volume || 0));
  const scaleEfficiency = parseFloat(String(measurements.target_efficiency || 0));
  const originalEfficiency = parseFloat(String(measurements.original_efficiency || 0));

  const volFactor = (scaleVolume && originalVolume) ? scaleVolume / originalVolume : 1;
  const effFactor = (scaleEfficiency && originalEfficiency) ? originalEfficiency / scaleEfficiency : 1;
  const maltFactor = volFactor * effFactor;

  // Normalize Ingredients
  const ingredients = {
      malts: data.ingredients?.malts || data.malts || [],
      hops: data.ingredients?.hops || data.hops || [],
      yeast: data.ingredients?.yeast || data.yeast || null
  };

  // Calculate Water Profile logic
  let waterProfile;
  const boilTime = parseFloat(String(data.boil_time || 60)) / 60; // hours
  const totalMaltBase = ingredients.malts.reduce((sum: number, m: any) => {
      const raw = scaleAmount(m.amount, maltFactor);
      if (!raw) return sum;
      const amount = parseFloat(String(raw).replace(',', '.'));
      return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Default calculation (Physics Model)
  waterProfile = calculateWaterProfile(
      scaleVolume || 20, 
      totalMaltBase, 
      boilTime
  );

  // If recipe has explicit water values (from manual entry in editor), use them!
  // BUT we must SCALE them if the session batch size differs from original
  if (data.mash_water_liters && data.sparge_water_liters) {
      const mashBase = parseFloat(String(data.mash_water_liters).replace(',', '.'));
      const spargeBase = parseFloat(String(data.sparge_water_liters).replace(',', '.'));
      const originalBatch = parseFloat(String(data.batch_size_liters || 20).replace(',', '.'));
      
      const waterScale = (scaleVolume && originalBatch) ? scaleVolume / originalBatch : 1;

      waterProfile.mashWater = parseFloat((mashBase * waterScale).toFixed(1));
      waterProfile.spargeWater = parseFloat((spargeBase * waterScale).toFixed(1));
      waterProfile.totalWater = parseFloat(((mashBase + spargeBase) * waterScale).toFixed(1));
      
      const absorption = totalMaltBase * 0.96; 
      waterProfile.preBoilVolume = parseFloat((waterProfile.totalWater - absorption).toFixed(1));
  }

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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start mb-8">
        <div>
           <PhaseTitle>Vorbereitung</PhaseTitle>
           <p className="text-zinc-400 text-sm">Prüfe deine Zutaten für <span className="text-cyan-400 font-bold">{session?.brew?.name || 'dieses Rezept'}</span></p>
        </div>
      </div>

      {/* Water Profile */}
      <div className="md:bg-zinc-900/40 md:border md:border-zinc-800 md:rounded-xl md:p-5 mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Droplets className="w-3 h-3 text-cyan-500" /> 
                    Wasser-Planung
                    <BotlGuideTrigger guideKey="wasser.restalkalitaet" />
            </h3>
            <button
                onClick={() => openModal('MEASUREMENT_VOLUME')}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider flex items-center gap-1 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900/50 hover:border-cyan-500/50 transition-colors"
            >
                <Plus className="w-3 h-3" />
                Messen
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50 flex flex-col items-center text-center">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Hauptguss</span>
                    <span className="text-xl font-bold text-white">{waterProfile.mashWater} <span className="text-sm text-zinc-600">L</span></span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50 flex flex-col items-center text-center">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Nachguss</span>
                    <span className="text-xl font-bold text-white">{waterProfile.spargeWater} <span className="text-sm text-zinc-600">L</span></span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50 flex flex-col items-center text-center opacity-70">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Gesamt</span>
                    <span className="text-lg font-bold text-zinc-300">{waterProfile.totalWater} <span className="text-sm text-zinc-600">L</span></span>
                </div>
                 <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50 flex flex-col items-center text-center opacity-70">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Pfanne voll</span>
                    <span className="text-lg font-bold text-zinc-300">{waterProfile.preBoilVolume} <span className="text-sm text-zinc-600">L</span></span>
                </div>
          </div>
      </div>

      {/* Ingredient Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Malts */}
          {ingredients.malts.length > 0 && (
              <div>
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center justify-between border-b border-zinc-800 pb-2">
                       <div className="flex items-center gap-2">
                            <Wheat className="w-3 h-3" /> 
                            Malz & Getreide
                       </div>
                       <BotlGuideTrigger guideKey="effizienz.sudhausausbeute" />
                  </h3>
                  <div className="space-y-2">
                       {ingredients.malts.map((m: any, i: number) => (
                           <ChecklistItem 
                                key={`malt-${i}`}
                                id={`malt-${i}`}
                                name={m.name}
                                amount={`${scaleAmount(m.amount, maltFactor)} ${m.unit || 'kg'}`}
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
                                amount={`${scaleAmount(h.amount, volFactor)} ${h.unit || 'g'}`}
                           />
                       ))}
                  </div>
              </div>
          )}
      </div>
      
      <AddEventModal 
        isOpen={showMeasureModal} 
        onClose={() => setShowMeasureModal(false)} 
        onSubmit={handleModalSubmit}
        defaultType={modalInitialType}
      />
    </div>
  );
}
