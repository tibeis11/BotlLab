'use client';

import { useSession } from '../SessionContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Scanner from '@/app/components/Scanner';
import BottleScanner from '@/app/components/BottleScanner';
import { TimelineEvent } from '@/lib/types/session-log';
import { calculatePrimingSugar, calculateResidualCO2, platoToSG, calculateWaterProfile, calculateDecoctionEvaporation } from '@/lib/brewing-calculations';
import { useDebouncedCallback } from 'use-debounce';

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
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* Shared UI Components for internal consistency */
const PhaseCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`pt-2 md:p-0 mb-8 ${className}`}>
    {children}
  </div>
);

const PhaseTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">{children}</h2>
);

const PhaseDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-text-muted text-base mb-8 max-w-2xl">{children}</p>
);

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props}
        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand transition text-base font-mono placeholder:text-text-disabled" 
    />
);

// Helper: Scale Function
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

/* --- Helper Components for Guided Experience --- */

const TaskItem = ({ title, completed, onClick, meta }: { title: string, completed: boolean, onClick: () => void, meta?: string }) => (
    <div 
        onClick={!completed ? onClick : undefined}
        className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
            completed 
                ? 'bg-emerald-950/10 border-emerald-500/20 opacity-70' 
                : 'bg-surface border-border hover:border-border hover:bg-surface-hover'
        }`}
    >
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            completed 
                ? 'bg-emerald-500 border-emerald-500 text-black' 
                : 'bg-transparent border-border text-transparent'
        }`}>
            {completed && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
        </div>
        <div className="flex-1">
            <span className={`font-medium text-sm ${completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>{title}</span>
            {meta && <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mt-0.5">{meta}</div>}
        </div>
    </div>
);

function FermentationMonitor({ session }: { session: any }) {
    const { refreshSession } = useSession();
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [date, setDate] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    });
    const [gravity, setGravity] = useState('');
    const [temp, setTemp] = useState('');
    const [note, setNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if(session?.id) {
            fetchMeasurements();
        } else if (session) {
             setLoading(false); 
        }
    }, [session?.id]);

    const fetchMeasurements = async () => {
        if(!session?.id) return;
        
        const { data } = await supabase
            .from('brew_measurements')
            .select('*')
            .eq('session_id', session.id)
            .order('measured_at', { ascending: true });
            
        if (data) setMeasurements(data);
        setLoading(false);
    };
    
    const addMeasurement = async () => {
        if (!gravity && !temp) {
            console.warn("Gravity or Temp required");
            return;
        }

        if(!session?.id) {
            console.error("No Session ID found");
            return;
        }
        
        // Auto-Detect Unit: If gravity > 1.2, assume Plato and convert to SG
        let gravityValue = gravity ? parseFloat(gravity.replace(',', '.')) : null;
        if (gravityValue && gravityValue > 1.5) { // 1.5 is a safe threshold (approx 3 Plato)
             // Check if user accidentally entered a massive SG like 1050 instead of 1.050
             if(gravityValue > 900 && gravityValue < 1200) {
                 gravityValue = gravityValue / 1000;
             } else {
                 // Assume Plato
                 gravityValue = parseFloat(platoToSG(gravityValue).toFixed(4));
             }
        }

        const payload = {
            session_id: session.id,

            measured_at: new Date(date).toISOString(),
            gravity: gravityValue,
            temperature: temp ? parseFloat(temp.replace(',', '.')) : null,
            note: note || null,
            created_by: (await supabase.auth.getUser()).data.user?.id
        };

        console.log("Saving measurement:", payload);

        const { error } = await supabase.from('brew_measurements').insert(payload);
        
        if (error) {
            console.error("Error saving measurement:", error);
            alert("Fehler beim Speichern: " + error.message);
        } else {
            console.log("Measurement saved. Refreshing session context...");
            setGravity('');
            setTemp('');
            setNote('');
            setIsAdding(false);
            if (refreshSession) await refreshSession();
            fetchMeasurements();
        }
    };

    const chartData = measurements.map(m => {
        let g = m.gravity;
        // Auto-fix historical mixed data for chart visualization
        if (g > 1.5 && g < 30) { 
             // Likely Plato
             g = platoToSG(g); 
        } else if (g > 900) {
             // 1050 -> 1.050
             g = g / 1000;
        }
        return {
            ...m,
            gravity: parseFloat(g.toFixed(3))
        };
    });

    if (loading) return <div className="animate-pulse h-20 bg-surface/50 rounded-xl mb-4"></div>;

    return (
        <div className="bg-surface rounded-lg border border-border mb-8 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-background/50 flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <h4 className="text-text-muted font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Gärverlauf & Messwerte
                </h4>
                <div className="flex items-center gap-2">
                     <span className="text-xs font-mono text-text-muted">{measurements.length} Messungen</span>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding); setExpanded(true); }}
                        className="text-[10px] font-bold text-brand hover:text-brand bg-brand/10 border border-brand/20 px-2 py-1 rounded transition-colors ml-2"
                    >
                        {isAdding ? 'Abbrechen' : '+ Neuer Eintrag'}
                    </button>
                </div>
            </div>
            
            {expanded && (
                <div className="p-4 border-t border-border">
                    {isAdding && (
                        <div className="bg-background/50 border border-border rounded-xl p-4 mb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">Datum & Zeit</label>
                                    <input 
                                        type="datetime-local" 
                                        value={date} 
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full bg-background text-text-primary text-sm px-3 py-2 rounded-lg border border-border focus:border-brand outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">Dichte (SG)</label>
                                    <input 
                                        type="number" 
                                        placeholder="1.050 / 12.5"
                                        value={gravity} 
                                        onChange={e => setGravity(e.target.value)}
                                        className="w-full bg-background text-text-primary text-sm px-3 py-2 rounded-lg border border-border focus:border-brand outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">Temp (°C)</label>
                                    <input 
                                        type="number" 
                                        placeholder="20.0"
                                        value={temp} 
                                        onChange={e => setTemp(e.target.value)}
                                        className="w-full bg-background text-text-primary text-sm px-3 py-2 rounded-lg border border-border focus:border-brand outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">Notiz</label>
                                    <input 
                                        type="text"
                                        placeholder="Blubbert stark..."
                                        value={note} 
                                        onChange={e => setNote(e.target.value)}
                                        className="w-full bg-background text-text-primary text-sm px-3 py-2 rounded-lg border border-border focus:border-brand outline-none"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={addMeasurement}
                                className="w-full bg-brand hover:bg-brand/80 text-text-primary font-bold py-2 rounded-lg transition-colors text-sm"
                            >
                                Messwert speichern
                            </button>
                        </div>
                    )}

                    {measurements.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-xl bg-surface/20">
                            <Activity className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                            <p className="text-text-muted text-sm">Noch keine Messwerte eingetragen.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {measurements.length > 1 && (
                                <div className="h-64 w-full bg-background/30 rounded-lg p-4 border border-border/50">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                            <XAxis 
                                                dataKey="measured_at" 
                                                stroke="#52525b" 
                                                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {day: '2-digit', month: '2-digit'})}
                                                tick={{fontSize: 10}}
                                            />
                                            <YAxis yAxisId="left" stroke="#0891b2" domain={['auto', 'auto']} tick={{fontSize: 10}} width={40} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#ea580c" domain={['auto', 'auto']} tick={{fontSize: 10}} width={30} />
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }}
                                                labelFormatter={(label) => new Date(label).toLocaleString()}
                                            />
                                            <Line yAxisId="left" type="monotone" dataKey="gravity" stroke="#0891b2" name="Dichte" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5, strokeWidth: 0}} />
                                            <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#ea580c" name="Temp" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5, strokeWidth: 0}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-separate border-spacing-y-1">
                                    <thead className="text-[10px] uppercase text-text-muted font-bold">
                                        <tr>
                                            <th className="px-3 py-1">Datum</th>
                                            <th className="px-3 py-1 text-right">Dichte</th>
                                            <th className="px-3 py-1 text-right">Temp</th>
                                            <th className="px-3 py-1 w-full pl-6">Notiz</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {measurements.map((m) => (
                                            <tr key={m.id} className="group hover:bg-surface/50 transition-colors">
                                                <td className="px-3 py-2 font-mono text-text-muted whitespace-nowrap bg-background/30 rounded-l">
                                                    {new Date(m.measured_at).toLocaleDateString()} <span className="text-text-disabled text-[10px]">{new Date(m.measured_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </td>
                                                <td className="px-3 py-2 font-mono font-bold text-text-primary text-right bg-background/30">
                                                    {m.gravity || '-'}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-text-secondary text-right bg-background/30">
                                                    {m.temperature ? `${m.temperature}°C` : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-text-muted text-xs pl-6 bg-background/30 rounded-r border-l border-transparent">
                                                    {m.note || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* --- Phase Views --- */

export function PlanningView() {
  const { session, changePhase, addEvent, updateSessionData } = useSession();
  // Using a ref to track if we have initialized from session data
  const initialized = useRef(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<any>('NOTE');

  useEffect(() => {
    if (session?.measurements?.checklist && !initialized.current) {
        setCheckedItems(new Set(session.measurements.checklist));
        initialized.current = true;
    }
  }, [session?.measurements?.checklist]);

  const updateDB = useDebouncedCallback((items: string[]) => {
      if(!session) return;
      updateSessionData({
          measurements: {
              ...(session.measurements || {}),
              checklist: items
          }
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
  const scaleVolume = measurements.target_volume;
  const originalVolume = measurements.original_volume;
  const scaleEfficiency = measurements.target_efficiency;
  const originalEfficiency = measurements.original_efficiency;

  const volFactor = (scaleVolume && originalVolume) ? scaleVolume / originalVolume : 1;
  const effFactor = (scaleEfficiency && originalEfficiency) ? originalEfficiency / scaleEfficiency : 1;
  const maltFactor = volFactor * effFactor;

  // Equipment config from session measurements (saved when session was created from profile)
  const equipmentConfig = {
      boilOffRate:      parseFloat(String(measurements.boil_off_rate      || 3.5)),
      trubLoss:         parseFloat(String(measurements.trub_loss          || 0.5)),
      grainAbsorption:  parseFloat(String(measurements.grain_absorption   || 0.96)),
      coolingShrinkage: parseFloat(String(measurements.cooling_shrinkage  || 0.04)),
      mashThickness:    parseFloat(String(measurements.mash_thickness     || 3.5)),
  };

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
      const amount = parseFloat(scaleAmount(m.amount, maltFactor).replace(',', '.'));
      return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Default calculation (Physics Model) — using equipment config from session
  // Include decoction evaporation if mash_process is decoction
  const decoctionConfig = data.mash_process === 'decoction' && Array.isArray(data.mash_steps)
      ? { ...equipmentConfig, decoctionEvaporation: calculateDecoctionEvaporation(data.mash_steps) }
      : equipmentConfig;
  waterProfile = calculateWaterProfile(
      scaleVolume || 20, 
      totalMaltBase, 
      boilTime,
      decoctionConfig
  );

  // If recipe has explicit water values (from manual entry in editor), use them!
  // BUT we must SCALE them if the session batch size differs from original
  if (data.mash_water_liters && data.sparge_water_liters) {
      const mashBase = parseFloat(String(data.mash_water_liters).replace(',', '.'));
      const spargeBase = parseFloat(String(data.sparge_water_liters).replace(',', '.'));
      const originalBatch = parseFloat(String(data.batch_size_liters || 20).replace(',', '.'));
      
      // Calculate scaling factor for WATER specifically
      // Usually water scales linearly with Batch Size ratio
      const waterScale = (scaleVolume && originalBatch) ? scaleVolume / originalBatch : 1;

      waterProfile.mashWater = parseFloat((mashBase * waterScale).toFixed(1));
      waterProfile.spargeWater = parseFloat((spargeBase * waterScale).toFixed(1));
      waterProfile.totalWater = parseFloat(((mashBase + spargeBase) * waterScale).toFixed(1));
      
      const absorption = totalMaltBase * equipmentConfig.grainAbsorption;
      waterProfile.preBoilVolume = parseFloat((waterProfile.totalWater - absorption).toFixed(1));
  }



  const ChecklistItem = ({ id, name, amount }: { id: string, name: string, amount: string }) => {
      const isChecked = checkedItems.has(id);
      return (
        <div 
            onClick={() => toggleItem(id)}
            className={`flex justify-between items-center px-4 py-3 rounded-lg border transition-all cursor-pointer group ${
                isChecked 
                ? 'bg-surface/50 border-border/50 opacity-50' 
                : 'bg-surface border-border hover:border-border'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isChecked 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' 
                    : 'border-border group-hover:border-border'
                }`}>
                    {isChecked && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>
                <span className={`font-medium text-sm transition-colors ${isChecked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                    {name}
                </span>
            </div>
            <span className={`font-mono text-sm font-bold ${isChecked ? 'text-text-disabled' : 'text-text-muted'}`}>
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
           <p className="text-text-muted text-sm">Prüfe deine Zutaten für <span className="text-brand font-bold">{session?.brew?.name || 'dieses Rezept'}</span></p>
        </div>
      </div>

      {/* Water Profile */}
      <div className="bg-surface/40 border border-border rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Droplets className="w-3 h-3 text-brand" /> Wasser-Planung
            </h3>
            <button
                onClick={() => openModal('MEASUREMENT_VOLUME')}
                className="text-[10px] font-bold text-brand hover:text-brand uppercase tracking-wider flex items-center gap-1 bg-brand/10 px-2 py-1 rounded border border-brand/20 hover:border-brand/50 transition-colors"
            >
                <Plus className="w-3 h-3" />
                Messen
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-background p-3 rounded-lg border border-border/50 flex flex-col items-center text-center">
                    <span className="text-[10px] text-text-muted uppercase font-bold mb-1">Hauptguss</span>
                    <span className="text-xl font-bold text-text-primary">{waterProfile.mashWater} <span className="text-sm text-text-disabled">L</span></span>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border/50 flex flex-col items-center text-center">
                    <span className="text-[10px] text-text-muted uppercase font-bold mb-1">Nachguss</span>
                    <span className="text-xl font-bold text-text-primary">{waterProfile.spargeWater} <span className="text-sm text-text-disabled">L</span></span>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border/50 flex flex-col items-center text-center opacity-70">
                    <span className="text-[10px] text-text-muted uppercase font-bold mb-1">Gesamt</span>
                    <span className="text-lg font-bold text-text-secondary">{waterProfile.totalWater} <span className="text-sm text-text-disabled">L</span></span>
                </div>
                 <div className="bg-background p-3 rounded-lg border border-border/50 flex flex-col items-center text-center opacity-70">
                    <span className="text-[10px] text-text-muted uppercase font-bold mb-1">Pfanne voll</span>
                    <span className="text-lg font-bold text-text-secondary">{waterProfile.preBoilVolume} <span className="text-sm text-text-disabled">L</span></span>
                </div>
          </div>
      </div>

      {/* Ingredient Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Malts */}
          {ingredients.malts.length > 0 && (
              <div>
                  <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-border pb-2">
                      <Wheat className="w-3 h-3" /> Malz & Getreide
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
                  <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-border pb-2">
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
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
             <div className="flex gap-4">
                 <button 
                    onClick={() => openModal('MEASUREMENT_VOLUME')}
                    className="flex-1 py-3 bg-background hover:bg-surface border border-border hover:border-border rounded-lg font-bold text-text-secondary transition-colors flex flex-col items-center gap-1 group"
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
      <div className="flex justify-end pt-6 border-t border-border">
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
  const { session, changePhase, addEvent, removeEvent, updateSessionData } = useSession();
  const [og, setOg] = useState<string>('');
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<any>('NOTE');
  
  // Ref for session to ensure debounced callbacks use latest state
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const updateMashTimer = useDebouncedCallback((timerState: any) => {
      const currentSession = sessionRef.current;
      if (!currentSession) return;
      updateSessionData({
          measurements: {
              ...(currentSession.measurements || {}),
              timers: {
                  ...(currentSession.measurements?.timers || {}),
                  mash: timerState
              }
          }
      });
  }, 2000);

  const updateBoilTimer = useDebouncedCallback((timerState: any) => {
      const currentSession = sessionRef.current;
      if (!currentSession) return;
      updateSessionData({
          measurements: {
              ...(currentSession.measurements || {}),
              timers: {
                  ...(currentSession.measurements?.timers || {}),
                  boil: timerState
              }
          }
      });
  }, 2000);

  const data = session?.brew?.recipe_data || {};

  // Scaling Logic
  const measurements = (session?.measurements as any) || {};
  const scaleVolume = measurements.target_volume;
  const originalVolume = measurements.original_volume;
  const volFactor = (scaleVolume && originalVolume) ? scaleVolume / originalVolume : 1;
  const alphaCorrections = measurements.alpha_corrections || {};
  
  // Normalize Data (unchanged logic)
  const mashSteps = data.mash_steps || data.mash_schedule || data.steps || [];
  const hops = (data.ingredients?.hops || data.hops || [])
    .filter((h: any) => h.type === 'boil' || h.usage === 'Boil' || h.time > 0)
    .map((h: any) => {
        const originalAmount = parseFloat(String(h.amount).replace(',', '.'));
        const recipeAlpha = parseFloat(String(h.alpha).replace(',', '.'));
        const actualAlpha = alphaCorrections[h.name];

        let amount = scaleAmount(h.amount, volFactor);
        let corrected = false;
        
        if (actualAlpha && recipeAlpha && actualAlpha > 0) {
             const scaledOriginal = originalAmount * volFactor;
             const calc = scaledOriginal * (recipeAlpha / actualAlpha);
             
             if (calc < 10) amount = calc.toFixed(2).replace('.', ',');
             else if (calc < 100) amount = calc.toFixed(1).replace('.', ',');
             else amount = Math.round(calc).toString();
             
             corrected = true;
        }

        return {
            ...h,
            amount: amount,
            originalScaled: scaleAmount(h.amount, volFactor),
            isCorrected: corrected,
            actualAlpha: actualAlpha
        };
    });
  
  const [editingAlpha, setEditingAlpha] = useState<string|null>(null);
  const [alphaInput, setAlphaInput] = useState('');

  const submitAlpha = (name: string) => {
      if(!alphaInput) return;
      const val = parseFloat(alphaInput.replace(',', '.'));
      
      updateSessionData({
          measurements: {
              ...measurements,
              alpha_corrections: {
                  ...alphaCorrections,
                  [name]: val
              }
          }
      });
      setEditingAlpha(null);
      setAlphaInput('');
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
  
  const timerMashSteps = useMemo(() => {
      const steps: Array<{ label: string; duration: number; temperature: number }> = [];
      mashSteps.forEach((step: any, i: number) => {
          if (step.step_type === 'decoction') {
              const name = step.name || `Dekoktion ${i + 1}`;
              const temp = parseFloat(step.temperature || step.temp || '0');
              // Pull (confirmation, no timer)
              steps.push({ label: `${name}: Ziehen`, duration: 0, temperature: 0 });
              // Heat (manual, no auto-timer)
              steps.push({ label: `Aufheizen`, duration: 0, temperature: parseFloat(step.decoction_rest_temp || '100') });
              // Optional rest before boil
              if (parseFloat(step.decoction_rest_time || '0') > 0) {
                  steps.push({ label: `Teilmaische-Rast`, duration: parseFloat(step.decoction_rest_time || '0'), temperature: parseFloat(step.decoction_rest_temp || '72') });
              }
              // Boil
              if (parseFloat(step.decoction_boil_time || '0') > 0) {
                  steps.push({ label: `Kochen`, duration: parseFloat(step.decoction_boil_time || '0'), temperature: 100 });
              }
              // Return (confirmation)
              steps.push({ label: `${name}: Zurückführen`, duration: 0, temperature: temp });
              // Main rest at target
              if (parseFloat(step.duration || '0') > 0) {
                  steps.push({ label: `Rast bei ${temp}°C`, duration: parseFloat(step.duration || '0'), temperature: temp });
              }
          } else {
              steps.push({
                  label: step.name || step.step || step.title || `Rast ${i + 1}`,
                  duration: parseFloat(step.duration || '0'),
                  temperature: parseFloat(step.temperature || step.temp)
              });
          }
      });
      return steps;
  }, [mashSteps]);

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
              
              <BrewTimer 
                mode="MASH" 
                steps={timerMashSteps} 
                initialState={session?.measurements?.timers?.mash}
                onStateChange={updateMashTimer}
              />

              <div className="space-y-3">
                  {mashSteps.map((step: any, i: number) => {
                       const name = step.name || step.step || step.title || `Rast ${i+1}`;
                       const temp = step.temperature || step.temp;
                       const stepDuration = parseFloat(step.duration || '0');
                       const isDecoction = step.step_type === 'decoction';
                       const desc = stepDuration > 0
                        ? `${temp}°C für ${stepDuration} min`
                        : `${temp}°C`;
                        
                       const isCompleted = !!findStepEvent(name, desc);

                       const formLabel = step.decoction_form === 'thin' ? 'Dünn'
                           : step.decoction_form === 'liquid' ? 'Kochwasser'
                           : 'Dick';

                       return (
                           <div 
                                key={i}
                                onClick={() => handleMashStep(step)}
                                className={`
                                    relative overflow-hidden rounded-lg border transition-all cursor-pointer group
                                    ${isCompleted 
                                        ? 'bg-surface/30 border-border opacity-60' 
                                        : isDecoction
                                        ? 'bg-surface border-amber-500/20 hover:border-amber-500/50 hover:bg-surface-hover'
                                        : 'bg-surface border-border hover:border-amber-500/50 hover:bg-surface-hover'
                                    }
                                `}
                           >
                                <div className="p-4 flex items-center gap-4 md:gap-6">
                                    <div className={`
                                        w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center transition-all
                                        ${isCompleted 
                                            ? 'bg-emerald-500 border-emerald-500 text-black' 
                                            : 'border-border bg-background/50 group-hover:border-border text-transparent'
                                        }
                                    `}>
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </div>

                                    <div className="flex-1 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border border-border/50 transition-colors ${isDecoction ? 'bg-amber-500/5' : 'bg-background'}`}>
                                                <div className={`text-base font-bold ${isCompleted ? 'text-text-muted' : 'text-amber-500'}`}>{temp}°</div>
                                                <div className="text-[8px] uppercase font-bold text-text-disabled tracking-wider">
                                                    {isDecoction ? 'Ziel' : 'Temp'}
                                                </div>
                                            </div>
                                            <div>
                                                 <div className="flex items-center gap-2 mb-1">
                                                     <span className={`text-sm font-bold uppercase tracking-wide ${isCompleted ? 'text-text-muted' : 'text-text-secondary'}`}>{name}</span>
                                                     {isDecoction && (
                                                         <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">
                                                             🔥 Dekoktion
                                                         </span>
                                                     )}
                                                 </div>
                                                 {isDecoction ? (
                                                     <div className="flex flex-wrap gap-1.5">
                                                         {step.volume_liters && (
                                                             <span className="text-[9px] font-mono text-amber-600">{scaleAmount(step.volume_liters, volFactor)}L {formLabel}</span>
                                                         )}
                                                         {step.decoction_boil_time && (
                                                             <span className="text-[9px] font-mono text-text-muted">· Kochen {step.decoction_boil_time}min</span>
                                                         )}
                                                         {step.decoction_rest_temp && step.decoction_rest_time && (
                                                             <span className="text-[9px] font-mono text-text-muted">· Rast {step.decoction_rest_temp}°C/{step.decoction_rest_time}min</span>
                                                         )}
                                                     </div>
                                                 ) : (
                                                     <div className="text-[10px] text-text-muted hidden md:block">Aufheizen auf {temp}°C</div>
                                                 )}
                                            </div>
                                        </div>

                                        {stepDuration > 0 ? (
                                        <div className="text-right pl-4 border-l border-border/50">
                                            <div className={`text-xl font-bold font-mono ${isCompleted ? 'text-text-muted' : 'text-text-primary'}`}>
                                                {stepDuration}<span className="text-[10px] font-bold text-text-disabled ml-1">min</span>
                                            </div>
                                            <div className="text-[9px] uppercase font-bold text-text-disabled tracking-wider">Halten</div>
                                        </div>
                                        ) : (
                                         <div className="text-right pl-4 border-l border-border/50 opacity-50">
                                            <div className="text-xl font-bold text-text-disabled">-</div>
                                            <div className="text-[8px] uppercase font-bold text-text-disabled tracking-wider">Ziel</div>
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
                            <span className="text-xs font-bold text-text-primary">{data.boil_time}<span className="text-[9px] text-red-500/50 font-bold ml-0.5">MIN</span></span>
                        </div>
                    )}
                </div>
              </div>
              
              <BrewTimer 
                mode="BOIL" 
                steps={timerBoilSteps} 
                totalBoilTime={totalBoilTime} 
                initialState={session?.measurements?.timers?.boil}
                onStateChange={updateBoilTimer}
              />
              
              <div className="space-y-3">
                  {hops.sort((a: any, b: any) => b.time - a.time).map((hop: any, i: number) => {
                       const title = `${hop.name}`;
                       const desc = `${hop.amount}g bei ${hop.time} min`;
                       const isCompleted = !!findStepEvent(hop.name, desc);
                       const isEditing = editingAlpha === hop.name;

                       return (
                           <div 
                                key={i}
                                onClick={(e) => {
                                    if((e.target as HTMLElement).closest('.alpha-control')) return;
                                    handleHopAdd(hop);
                                }}
                                className={`
                                    relative overflow-hidden rounded-lg border transition-all cursor-pointer group
                                    ${isCompleted 
                                        ? 'bg-surface/30 border-border opacity-60' 
                                        : hop.isCorrected ? 'bg-surface border-border hover:border-brand/50 hover:bg-surface-hover' : 'bg-surface border-border hover:border-red-500/50 hover:bg-surface-hover'
                                    }
                                `}
                           >
                                <div className="p-4 flex items-center gap-4 md:gap-6">
                                    {/* 1 Checkbox (Left) */}
                                    <div className={`
                                        w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center transition-all
                                        ${isCompleted 
                                            ? 'bg-emerald-500 border-emerald-500 text-black' 
                                            : 'border-border bg-background/50 group-hover:border-border text-transparent'
                                        }
                                    `}>
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </div>

                                    {/* 2 Time (Focus) */}
                                    <div className="flex-1 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-background rounded-lg border border-border/50 transition-colors">
                                                <div className={`text-base font-bold ${isCompleted ? 'text-text-muted' : 'text-red-500'}`}>{hop.time}</div>
                                                <div className="text-[8px] uppercase font-bold text-text-disabled tracking-wider">Min</div>
                                            </div>
                                            <div>
                                                 <div className={`text-sm font-bold uppercase tracking-wide mb-1 ${isCompleted ? 'text-text-muted' : 'text-text-secondary'}`}>{title}</div>
                                                 <div className="text-[10px] text-text-muted hidden md:block">{hop.usage || 'Boil'} Addition</div>
                                            </div>
                                        </div>
                                        
                                        {/* Alpha Correction Control */}
                                        <div className="alpha-control flex items-center gap-2">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1 bg-background rounded border border-border p-1">
                                                    <input 
                                                        autoFocus
                                                        type="number" 
                                                        className="w-12 bg-transparent text-text-primary text-xs outline-none text-right font-mono"
                                                        value={alphaInput}
                                                        onChange={(e) => setAlphaInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && submitAlpha(hop.name)}
                                                    />
                                                    <span className="text-[9px] text-text-muted">%</span>
                                                    <button onClick={() => submitAlpha(hop.name)} className="text-emerald-500 hover:text-emerald-400"><Check size={12}/></button>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => { setEditingAlpha(hop.name); setAlphaInput(hop.actualAlpha || hop.alpha || ''); }}
                                                    className={`hidden md:flex flex-col items-end px-2 py-1 rounded border hover:border-border transition-colors ${hop.isCorrected ? 'bg-brand/10 border-brand/20' : 'border-transparent'}`}
                                                >
                                                    <span className={`text-[10px] font-bold ${hop.isCorrected ? 'text-brand' : 'text-text-disabled'}`}>
                                                        α {hop.actualAlpha || hop.alpha}%
                                                    </span>
                                                    {hop.isCorrected && <span className="text-[8px] text-brand/70 uppercase tracking-wider">Korrigiert</span>}
                                                </div>
                                            )}
                                        </div>

                                        {/* 3 Amount (Right) */}
                                        <div className="text-right pl-4 border-l border-border/50">
                                            <div className={`text-xl font-mono font-bold flex flex-col items-end ${isCompleted ? 'text-text-muted' : hop.isCorrected ? 'text-brand' : 'text-text-primary'}`}>
                                                <span>{hop.amount}<span className="text-[10px] font-bold text-text-disabled ml-1">g</span></span>
                                                {hop.isCorrected && (
                                                    <span className="text-xs text-text-muted line-through decoration-text-disabled/50">
                                                        {hop.originalScaled}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[9px] uppercase font-bold text-text-disabled tracking-wider">Menge</div>
                                        </div>
                                    </div>
                                </div>
                           </div>
                       );
                  })}
              </div>
          </div>
      )}

      <div className="bg-surface rounded-lg border border-border mb-8 overflow-hidden">
        {/* Header with Quick Actions */}
        <div className="px-4 py-3 border-b border-border bg-background/50 flex justify-between items-center">
            <h4 className="text-text-muted font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-3 h-3" /> Messwerte
            </h4>
            <div className="flex gap-2">
                <button onClick={() => openModal('MEASUREMENT_SG')} className="px-2 py-1 bg-background hover:bg-surface border border-border hover:border-border rounded text-[10px] font-bold text-text-muted transition-colors">
                    + Dichte
                </button>
                <button onClick={() => openModal('MEASUREMENT_PH')} className="px-2 py-1 bg-background hover:bg-surface border border-border hover:border-border rounded text-[10px] font-bold text-text-muted transition-colors">
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
                    type="text"
                    inputMode="decimal"
                    step="0.001" 
                    className="flex-1 bg-background border border-border rounded-lg px-3 text-text-primary font-mono text-sm placeholder:text-text-disabled focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder={lastOgEvent ? `${(lastOgEvent.data as any)?.gravity}` : "1.050"}
                    value={og}
                    onChange={(e) => setOg(e.target.value)}
                />
                <button 
                    onClick={handleLogOG}
                    disabled={!og}
                    className="px-4 bg-surface hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-surface text-text-primary rounded-lg border border-border font-bold transition-all"
                >
                    <Check className="w-4 h-4" />
                </button>
            </div>

            {/* Stats Row */}
            <div className="flex gap-6 text-xs pl-1 mt-3">
                 {/* Target */}
                 {(data.og || data.original_gravity) && (
                    <div className="flex items-center gap-2 text-text-muted">
                        <span className="uppercase font-bold text-[10px] tracking-wider">Ziel</span>
                        <span className="font-mono text-text-secondary border-b border-dashed border-border">
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

      <div className="flex justify-end pt-6 border-t border-border">
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

            {/* Fermentation Monitor */}
            <FermentationMonitor session={session} />

            <AddEventModal 
                isOpen={showMeasureModal} 
                onClose={() => setShowMeasureModal(false)} 
                onSubmit={handleModalSubmit}
                defaultType={modalInitialType}
            />

            <div className="flex justify-end pt-6 border-t border-border">
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
        const v = parseFloat(carbVolume.replace(',', '.')) || 0;
        const t = parseFloat(carbTemp.replace(',', '.')) || 20;
        const co2 = parseFloat(carbTarget.replace(',', '.')) || 5.0;
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
            <div className="bg-surface p-6 rounded-lg border border-border mb-8">
                 <h3 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
                     <Calculator className="w-4 h-4 text-text-muted" /> Karbonisierung (Zucker-Rechner)
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Menge (Liter)</label>
                        <InputField 
                            type="text"
                            inputMode="decimal"
                            step="0.5"
                            value={carbVolume}
                            onChange={(e) => setCarbVolume(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Jungbier Temp (°C)</label>
                        <InputField 
                            type="text"
                            inputMode="decimal"
                            step="1"
                            value={carbTemp}
                            onChange={(e) => setCarbTemp(e.target.value)}
                        />
                        <div className="text-[10px] text-text-disabled mt-1 uppercase tracking-wider font-bold">Höchste Temp. nach Gärung</div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Ziel CO₂ (g/l)</label>
                        <InputField 
                            type="text"
                            inputMode="decimal"
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
                             <div className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Haushaltszucker</div>
                         </div>
                         <div className="text-right">
                             <div className="text-2xl font-black text-emerald-400 font-mono">{sugarResult} <span className="text-sm text-emerald-600">g</span></div>
                             <div className="text-emerald-600/50 text-[10px] font-mono font-bold">{(sugarResult / (parseFloat(carbVolume)||1)).toFixed(1)} g/L</div>
                         </div>
                     </div>
                 ) : (
                     <div className="mt-6 p-4 bg-surface/50 border border-border rounded-lg text-text-muted text-xs font-bold uppercase tracking-widest text-center">
                         Bereit zur Berechnung
                     </div>
                 )}
            </div>

             {/* Conditioning Timer / Plan */}
             <div className="bg-surface p-6 rounded-lg border border-border mb-8">
                 <h3 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
                     <Timer className="w-4 h-4 text-text-muted" /> {conditioningStartEvent ? 'Reifungs-Status' : 'Reifung planen'}
                 </h3>
                 
                 {conditioningStartEvent ? (
                     <div className="bg-background rounded-lg p-5 border border-border flex flex-col md:flex-row gap-6 items-center justify-between">
                         <div className="flex-1">
                             <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Geplantes Ende</div>
                             <div className="text-2xl font-black text-brand font-mono">
                                 {new Date((conditioningStartEvent.data as any).targetDate).toLocaleDateString()}
                             </div>
                             <div className="text-text-muted text-xs font-bold uppercase tracking-wider mt-1">
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
                             <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Dauer (Tage)</label>
                             <div className="flex items-center gap-3">
                                <InputField 
                                    type="number" 
                                    value={days}
                                    onChange={(e) => setDays(parseInt(e.target.value))} 
                                    min="1"
                                />
                                <div className="text-text-muted font-bold whitespace-nowrap text-xs uppercase tracking-wider">
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
                            className="w-full md:w-auto px-6 py-3 bg-surface-hover hover:bg-border font-bold text-text-primary rounded-lg transition-colors border border-border text-sm"
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
            
            <div className="flex justify-end pt-6 border-t border-border">
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
        <PhaseCard className="text-center py-24 bg-surface rounded-lg border border-border border-dashed">
            <div className="w-24 h-24 bg-background rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                <Beer className="w-12 h-12 text-text-disabled" strokeWidth={1} />
            </div>
            <h2 className="text-3xl font-black text-text-primary mb-2">Prost!</h2>
            <p className="text-text-muted text-sm uppercase tracking-widest font-bold">Dieser Sud ist abgeschlossen und archiviert.</p>
        </PhaseCard>
    );
}
