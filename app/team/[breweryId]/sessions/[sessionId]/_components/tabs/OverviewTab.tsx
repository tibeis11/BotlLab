'use client';

import { useSession } from '../../SessionContext';
import { PhaseCard, PhaseTitle, PhaseDescription } from './PhaseLayout';
import { FermentationGraph } from '../FermentationGraph';
import { 
    LayoutDashboard, 
    ArrowRight, 
    Activity, 
    FlaskConical,
    Flame,
    CheckCircle2,
    Trash2,
    Clock,
    Calendar,
    StickyNote,
    RefreshCcw,
    Leaf,
    MapPin,
    Droplets,
    Scale
} from 'lucide-react';
import { useState } from 'react';
import { calculateABVFromSG, platoToSG } from '@/lib/brewing-calculations';
import { useRouter } from 'next/navigation';
import { BotlGuideTrigger } from '@/app/components/BotlGuideTrigger';
import { BotlGuideKey } from '@/lib/botlguide/BotlGuideContext';
import { TimelineEvent } from '@/lib/types/session-log';

const MetricCard = ({ label, value, unit, subtext, color = 'zinc', guideKey }: { label: string, value: string | number | null, unit?: string, subtext?: string, color?: 'zinc' | 'cyan' | 'emerald' | 'orange', guideKey?: BotlGuideKey }) => {
    const colorMap = {
        zinc: 'text-white',
        cyan: 'text-cyan-400',
        emerald: 'text-emerald-400',
        orange: 'text-orange-400'
    };
    
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between h-full min-w-0">
            <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider truncate" title={label}>{label}</div>
                    {guideKey && <div className="shrink-0"><BotlGuideTrigger guideKey={guideKey} className="scale-75 opacity-50 hover:opacity-100" /></div>}
                </div>
                <div className={`text-2xl font-mono font-bold tracking-tight flex items-baseline gap-1 ${colorMap[color]} truncate`}>
                    {value !== null && value !== undefined ? value : '—'} 
                    {value && unit && <span className="text-xs text-zinc-600 font-bold ml-1">{unit}</span>}
                </div>
            </div>
            {subtext && <div className="text-[10px] text-zinc-600 font-medium mt-2 pt-2 border-t border-zinc-800/50 truncate" title={subtext}>{subtext}</div>}
        </div>
    );
};

const RecentActivityList = ({ events }: { events: TimelineEvent[] }) => {
    if (!events?.length) return <div className="text-zinc-500 text-sm p-4 italic">Keine Aktivitäten vorhanden.</div>;

    const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-1">
            {sortedEvents.slice(0, 8).map((event) => {
                const date = new Date(event.date);
                const isToday = new Date().toDateString() === date.toDateString();
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                
                let icon = Activity;
                let color = 'text-zinc-400';
                
                if (event.type.startsWith('MEASUREMENT')) {
                    icon = Scale;
                    color = 'text-cyan-400';
                } else if (event.type === 'STATUS_CHANGE') {
                    icon = RefreshCcw;
                    color = 'text-purple-400';
                } else if (event.type === 'NOTE') {
                    icon = StickyNote;
                    color = 'text-yellow-400';
                } else if (event.type === 'INGREDIENT_ADD') {
                    icon = Leaf;
                    color = 'text-emerald-400';
                }

                const Icon = icon;

                return (
                    <div key={event.id} className="flex items-start gap-3 p-2 hover:bg-zinc-800/30 rounded-lg transition-colors group">
                        <div className={`mt-0.5 p-1.5 rounded-md bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 ${color}`}>
                            <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-zinc-200 font-medium truncate">{event.title}</span>
                                <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                                    {isToday ? timeStr : `${dateStr} ${timeStr}`}
                                </span>
                             </div>
                             {event.description && (
                                <div className="text-xs text-zinc-500 truncate mt-0.5">{event.description}</div>
                             )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export function OverviewTab({ setActiveTab }: { setActiveTab: (tab: any) => void }) {
    const { session, measurements, updateSessionData, deleteSession } = useSession();
    // Removed notes state
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirm("Möchtest du diesen Sud wirklich unwiderruflich löschen?")) {
            setIsDeleting(true);
            try {
                await deleteSession();
                router.push(`/team/${session?.brewery_id}/sessions`);
            } catch (e) {
                alert("Fehler beim Löschen.");
                setIsDeleting(false);
            }
        }
    };

    if (!session) return null;

    // Metrics Calculation (Simplified Live View)
    // Attempt to get target OG from recipe if measurement is missing
    const targetOgRaw = session.brew?.recipe_data?.Stammwuerze || session.brew?.recipe_data?.stammwuerze || session.brew?.recipe_data?.og;
    const targetOg = targetOgRaw ? (parseFloat(targetOgRaw) > 2 ? platoToSG(parseFloat(targetOgRaw)) : parseFloat(targetOgRaw)) : null;

    const og = session.measured_og || targetOg;
    const isTargetOg = !session.measured_og && !!targetOg;

    const current = measurements.length > 0 ? measurements[measurements.length - 1].gravity : null;
    
    let abv = '0.0';
    let att = '0';
    
    if (og && current) {
         abv = calculateABVFromSG(og, current).toFixed(1);
         att = (((og - current) / (og - 1)) * 100).toFixed(0);
    }
    
    const vol = session.measure_volume || session.brew?.recipe_data?.Ausschlagwuerze || session.brew?.recipe_data?.batch_size;
    const isTargetVol = !session.measure_volume && !!(session.brew?.recipe_data?.Ausschlagwuerze || session.brew?.recipe_data?.batch_size);

    // Phase Card Logic
    const phaseConfig: Record<string, { label: string, action: string, icon: any, targetTab: string, color: string }> = {
        'planning': { label: 'Planung', action: 'Zutaten vorbereiten', icon: FlaskConical, targetTab: 'planning', color: 'text-purple-400' },
        'brewing': { label: 'Brautag', action: 'Brautag fortsetzen', icon: Flame, targetTab: 'brewing', color: 'text-orange-400' },
        'fermenting': { label: 'Gärung', action: 'Messwert eintragen', icon: Activity, targetTab: 'fermentation', color: 'text-cyan-400' },
        'conditioning': { label: 'Reifung', action: 'Details prüfen', icon: Activity, targetTab: 'conditioning', color: 'text-blue-400' },
        'completed': { label: 'Abgeschlossen', action: 'Zusammenfassung', icon: CheckCircle2, targetTab: 'completed', color: 'text-emerald-400' },
    };
    
    const currentPhase = phaseConfig[session.phase] || phaseConfig['planning'];
    const PhaseIcon = currentPhase.icon;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Übersicht</h2>
                    <p className="text-zinc-500 text-sm">Statusbericht für Sud <span className="font-mono text-zinc-400">#{session.batch_code || session.brew?.name}</span></p>
                 </div>
                 
                 {/* Active Phase CTA */}
                 <button 
                    onClick={() => setActiveTab(currentPhase.targetTab)}
                    className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 p-1 pl-4 pr-2 rounded-full transition-all group"
                 >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Aktuelle Phase</span>
                        <div className={`flex items-center gap-2 font-bold ${currentPhase.color}`}>
                            <PhaseIcon className="w-4 h-4" />
                            {currentPhase.label}
                        </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-zinc-950 flex items-center justify-center group-hover:bg-black group-hover:text-white text-zinc-400 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                 </button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    label="Stammwürze (OG)" 
                    value={og ? og.toFixed(3) : null} 
                    unit="SG" 
                    subtext={og ? `${(259-(259/og)).toFixed(1)}°P${isTargetOg ? ' (Ziel)' : ''}` : 'Nicht gemessen'}
                    guideKey="brautag.og_messen"
                />
                <MetricCard 
                    label="Aktuell (SG)" 
                    value={current ? current.toFixed(3) : null} 
                    unit="SG" 
                    color="cyan"
                    subtext={measurements.length > 0 ? `${measurements.length} Messungen` : 'Warte auf Start'}
                    guideKey="gaerung.sg_eingabe"
                />
                <MetricCard 
                    label="Alkohol (ABV)" 
                    value={abv} 
                    unit="%" 
                    color={parseFloat(abv) > 0 ? 'emerald' : 'zinc'}
                    subtext={`Vergärung: ${att}%`}
                    guideKey="gaerung.endverwaerungsgrad"
                />

                <MetricCard 
                    label="Volumen" 
                    value={vol} 
                    unit="L" 
                    subtext={isTargetVol ? 'Geplant (Rezept)' : 'Im Gärfass'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Graph (if fermenting or later) */}
                    {(session.phase === 'fermenting' || session.phase === 'conditioning' || session.phase === 'completed') && measurements.length > 0 ? (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-cyan-500" /> Gärverlauf
                                </h3>
                            </div>
                            <FermentationGraph height={300} />
                        </div>
                    ) : (
                         <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                            <Activity className="w-8 h-8 text-zinc-700 mb-2" />
                            <p className="text-zinc-500 text-sm">Gärverlauf wird verfügbar sobald Messwerte vorhanden sind.</p>
                         </div>
                    )}
                </div>

                {/* Sidebar Content (1/3) */}
                <div className="space-y-6">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Letzte Aktivitäten
                            </label>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[400px] pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            <RecentActivityList events={session.timeline || []} />
                        </div>
                    </div>
                </div>
            </div>
            
             {/* Danger Zone */}
             <div className="mt-12 border-t border-zinc-900 pt-8">
                 <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 text-zinc-600 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors"
                 >
                    {isDeleting ? 'Lösche...' : (
                        <>
                            <Trash2 className="w-4 h-4" /> Sud löschen
                        </>
                    )}
                 </button>
            </div>
        </div>
    ); 
}
