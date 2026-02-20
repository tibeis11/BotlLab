'use client';

import { useSession } from '../../SessionContext';
import { PhaseTitle } from './PhaseLayout';
import { useState, useEffect, useMemo } from 'react';
import { 
    Calculator, 
    Timer, 
    Check, 
    Activity,
    ArrowRight,
    Thermometer,
    Wind,
    Scale,
    Calendar,
    QrCode
} from 'lucide-react';
import { calculatePrimingSugar } from '@/lib/brewing-calculations';
import BottleScanner from '@/app/components/BottleScanner';
import { BotlGuideTrigger } from '@/app/components/BotlGuideTrigger';
import { BotlGuideKey } from '@/lib/botlguide/BotlGuideContext';
import { differenceInDays, addDays, format } from 'date-fns';
import { de } from 'date-fns/locale';

const MetricCard = ({ label, value, unit, subtext, color = 'zinc', guideKey }: { label: string, value: string | number | null, unit?: string, subtext?: string, color?: 'zinc' | 'cyan' | 'emerald' | 'orange' | 'blue' | 'purple', guideKey?: BotlGuideKey }) => {
    const colorMap = {
        zinc: 'text-white',
        cyan: 'text-cyan-400',
        emerald: 'text-emerald-400',
        orange: 'text-orange-400',
        blue: 'text-blue-400',
        purple: 'text-purple-400'
    };
    
    return (
        <div className="flex flex-col justify-between h-full md:bg-zinc-900/50 md:border md:border-zinc-800 md:rounded-lg md:p-4 py-2 px-1 border-b border-zinc-800/50 md:border-b-0 last:border-0">
            <div>
                <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{label}</div>
                    {guideKey && <BotlGuideTrigger guideKey={guideKey} className="scale-75 opacity-50 hover:opacity-100" />}
                </div>
                <div className={`text-2xl font-mono font-bold tracking-tight flex items-baseline gap-1 ${colorMap[color]}`}>
                    {value !== null && value !== undefined && value !== '' ? value : '—'} 
                    {value && unit && <span className="text-xs text-zinc-600 font-bold ml-1">{unit}</span>}
                </div>
            </div>
            {subtext && <div className="text-[10px] text-zinc-600 font-medium mt-1 md:mt-2 md:pt-2 md:border-t md:border-zinc-800/50">{subtext}</div>}
        </div>
    );
};

export function ConditioningTab() {
    const { session, addEvent } = useSession();
    
    // Carbonation Calculator State
    const [carbVolume, setCarbVolume] = useState(''); 
    const [carbTemp, setCarbTemp] = useState('20');
    const [carbTarget, setCarbTarget] = useState('5.0');
    const [sugarTotal, setSugarTotal] = useState<number | null>(null);

    // Conditioning Timer State
    const [durationDays, setDurationDays] = useState('14');

    // Load defaults
    useEffect(() => {
        const batchSize = session?.brew?.recipe_data?.batch_size_liters;
        if(batchSize && !carbVolume) {
            setCarbVolume(batchSize.toString());
        }
    }, [session?.brew]);

    // Live Calculation
    useEffect(() => {
        const v = parseFloat(carbVolume.replace(',', '.')) || 0;
        const t = parseFloat(carbTemp.replace(',', '.')) || 20;
        const targetGL = parseFloat(carbTarget.replace(',', '.')) || 5.0;
        
        // 1 Vol CO2 approx 1.96 g/L
        const targetVols = targetGL / 1.96;
        
        if (v > 0 && targetGL > 0) {
             const res = calculatePrimingSugar(v, t, targetVols);
             setSugarTotal(res);
        } else {
            setSugarTotal(null);
        }
    }, [carbVolume, carbTemp, carbTarget]);
    
    const conditioningStartEvent = session?.timeline?.find(e => e.title === 'Reifung gestartet' || (e.data as any)?.type === 'CONDITIONING_TIMER');
    
    // Derived Status
    const statusData = useMemo(() => {
        if (!conditioningStartEvent) return null;
        
        const data = conditioningStartEvent.data as any;
        const startDate = new Date(conditioningStartEvent.date); // or data.startDate if available
        const target = data.targetDate ? new Date(data.targetDate) : addDays(startDate, data.days || 14);
        const daysTotal = data.days || 14;
        
        const now = new Date();
        const daysLeft = differenceInDays(target, now);
        const progress = Math.min(100, Math.max(0, ((daysTotal - daysLeft) / daysTotal) * 100));
        
        return {
            targetDate: target,
            daysLeft,
            progress,
            isComplete: daysLeft <= 0
        };
    }, [conditioningStartEvent]);


    const handleStartConditioning = async () => {
        const d = parseInt(durationDays) || 14;
        const targetDate = addDays(new Date(), d);
        
        await addEvent({
            title: 'Reifung gestartet',
            description: `Reifung für ${d} Tage geplant. Ende: ${format(targetDate, 'dd.MM.yyyy')}`,
            data: { 
                targetDate: targetDate.toISOString(), 
                days: d,
                type: 'CONDITIONING_TIMER' 
            },
            type: 'NOTE' // Using NOTE typ temporarily or create specific type
        });
    };

    const sugarPerLiter = sugarTotal && carbVolume ? (sugarTotal / parseFloat(carbVolume)).toFixed(1) : null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Reifung & Karbonisierung</h2>
                <p className="text-zinc-500 text-sm">Flaschengärung und Reifeprozess für <span className="font-mono text-zinc-400">#{session?.batch_code || session?.brew?.name}</span></p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    label="Ziel CO₂" 
                    value={carbTarget} 
                    unit="g/L"
                    color="cyan"
                    subtext="Karbonisierung"
                    guideKey="reifung.karbonisierung"
                />
                <MetricCard 
                    label="Zucker" 
                    value={sugarPerLiter || '—'} 
                    unit="g/L" 
                    color="emerald"
                    subtext={sugarTotal ? `Gesamt: ${sugarTotal}g` : 'Berechnung...'}
                />
                 <MetricCard 
                    label="Status" 
                    value={statusData ? (statusData.isComplete ? 'Fertig' : `${statusData.daysLeft} Tage`) : '—'} 
                    unit={statusData && !statusData.isComplete ? 'übrig' : ''}
                    color={statusData?.isComplete ? 'emerald' : 'orange'}
                    subtext={statusData ? `Bis ${format(statusData.targetDate, 'dd.MM.')}` : 'Nicht geplant'}
                />
                <MetricCard 
                    label="Temperatur" 
                    value={carbTemp} 
                    unit="°C" 
                    subtext="Jungbier-Temp"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main: Carbonation Calculator */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-emerald-500" /> Karbonisierungs-Rechner
                            </h3>
                            <BotlGuideTrigger guideKey="reifung.karbonisierung" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {/* Inputs */}
                             <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800/50">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block flex items-center gap-2">
                                    <Scale className="w-3 h-3" /> Abfüllmenge (L)
                                </label>
                                <input 
                                    type="number" inputMode="decimal" step="0.5"
                                    value={carbVolume} onChange={e => setCarbVolume(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none"
                                />
                             </div>
                             
                             <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800/50">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block flex items-center gap-2">
                                    <Thermometer className="w-3 h-3" /> Jungbier (°C)
                                </label>
                                <input 
                                    type="number" inputMode="decimal" step="1"
                                    value={carbTemp} onChange={e => setCarbTemp(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none"
                                />
                             </div>

                             <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800/50">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block flex items-center gap-2">
                                    <Wind className="w-3 h-3" /> Ziel CO₂ (g/L)
                                </label>
                                <input 
                                    type="number" inputMode="decimal" step="0.1"
                                    value={carbTarget} onChange={e => setCarbTarget(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none"
                                />
                             </div>
                        </div>

                        {/* Result Banner */}
                        <div className="mt-6 bg-emerald-950/10 border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-emerald-400">Speisezucker benötigt</div>
                                    <div className="text-xs text-emerald-600/70 table-nums">Basierend auf {carbVolume}L bei {carbTemp}°C</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-mono font-black text-white">{sugarTotal || 0}<span className="text-base font-bold text-zinc-500 ml-1">g</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Bottle Scanner */}
                     {session && session.id && (
                        <BottleScanner 
                            sessionId={session.id}
                            breweryId={session.brewery_id}
                            brewId={session.brew_id || ''}
                            variant="clean"
                        />
                    )}
                </div>

                {/* Sidebar: Planning */}
                <div className="space-y-6">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 h-full">
                         <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-6">
                            <Calendar className="w-4 h-4 text-orange-500" /> Zeitplan
                        </h3>

                        {statusData ? (
                            <div className="space-y-6">
                                <div className="text-center py-6 border border-zinc-800 rounded-xl bg-zinc-950/50">
                                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${statusData.isComplete ? 'bg-emerald-900/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-orange-900/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]'}`}>
                                        {statusData.isComplete ? <Check className="w-8 h-8" strokeWidth={3} /> : <Timer className="w-8 h-8 animate-pulse" />}
                                    </div>
                                    <div className="text-3xl font-mono font-bold text-white mb-1">
                                        {statusData.isComplete ? 'Fertig' : statusData.daysLeft}
                                    </div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                                        {statusData.isComplete ? 'Reifung beendet' : 'Tage verbleibend'}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs border-b border-zinc-800 pb-2">
                                        <span className="text-zinc-500">Startdatum</span>
                                        <span className="text-zinc-300 font-mono">
                                            {conditioningStartEvent ? format(new Date(conditioningStartEvent.date), 'dd.MM.yyyy') : 'Unbekannt'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs border-b border-zinc-800 pb-2">
                                        <span className="text-zinc-500">Zielatum</span>
                                        <span className="text-zinc-300 font-mono">
                                            {format(statusData.targetDate, 'dd.MM.yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Fortschritt</span>
                                        <span className="text-zinc-300 font-mono">{statusData.progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${statusData.progress}%` }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Planen Sie die Reifezeit für diesen Sud. BotlLab erinnert Sie, wenn die Reifung abgeschlossen ist.
                                </p>
                                
                                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Dauer (Tage)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={durationDays}
                                            onChange={(e) => setDurationDays(e.target.value)} 
                                            className="w-20 bg-black border border-zinc-800 rounded px-2 py-1.5 text-white font-mono focus:border-zinc-600 outline-none text-center"
                                        />
                                        <span className="text-zinc-600 text-xs">Empfohlen: 14</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleStartConditioning}
                                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2 group"
                                >
                                    Plan starten <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
