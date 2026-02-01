import { SessionPhase } from '@/lib/types/session-log';
import { 
  Trash2, 
  ClipboardList, 
  Flame, 
  Dna, 
  Snowflake, 
  CheckCircle2, 
  ArrowRight,
  FlaskConical,
  Scale,
  Percent,
  Droplets,
  Activity,
  Beaker
} from 'lucide-react';

interface SessionHeaderProps {
  phase: SessionPhase;
  status: string;
  brewName: string;
  batchCode?: string;
  onDelete?: () => void;
  metrics: {
    abv?: number | null;
    attenuation?: number | null;
    gravity?: number | null; // Latest gravity reading
    originalGravity?: number | null;
    volume?: number | null;
    ph?: number | null;
  };
}

export function SessionHeader({ phase, status, brewName, batchCode, metrics, onDelete }: SessionHeaderProps) {
  
  // Phase Timeline Definition
  const phases: {id: SessionPhase, label: string, icon: any}[] = [
    { id: 'planning', label: 'Planung', icon: ClipboardList },
    { id: 'brewing', label: 'Brauen', icon: Flame },
    { id: 'fermenting', label: 'Gärung', icon: Dna },
    { id: 'conditioning', label: 'Reifung', icon: Snowflake },
    { id: 'completed', label: 'Fertig', icon: CheckCircle2 }
  ];
  
  const currentPhaseIndex = phases.findIndex(p => p.id === phase);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6  mb-6 md:mb-8 relative overflow-hidden">
      
      {/* Top Row: Meta & Phase Timeline */}
      <div className="relative flex flex-col gap-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
               {batchCode && (
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest block mb-2 bg-zinc-950 block w-fit px-2 py-1 rounded border border-zinc-800">
                    Batch {batchCode}
                  </span>
               )}
               <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                 {brewName}
               </h1>
               <div className="text-zinc-500 text-sm mt-3 flex items-center gap-2">
                 <div className={`flex items-center gap-2 px-2 py-1 rounded border ${status === 'active' ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
                    <span className="uppercase tracking-wider font-bold text-[10px]">{status === 'active' ? 'Aktiv' : 'Inaktiv'}</span>
                 </div>
               </div>
            </div>

             {/* Phase Timeline Visualization */}
            <div className="flex items-center gap-1 bg-black p-1.5 rounded-lg border border-zinc-800 overflow-x-auto w-fit max-w-full no-scrollbar">
                {phases.map((p, i) => {
                    const isCurrent = i === currentPhaseIndex;
                    const isPast = i < currentPhaseIndex;
                    const Icon = p.icon;
                    
                    return (
                        <div key={p.id} className="flex items-center">
                            <div 
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-md transition-all whitespace-nowrap
                                    ${isCurrent 
                                        ? 'bg-zinc-800 text-white border border-zinc-700' 
                                        : isPast 
                                            ? 'text-zinc-400 hover:bg-zinc-900' 
                                            : 'text-zinc-700 bg-zinc-900/30'
                                    }
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isPast && 'text-emerald-500'}`} />
                                {isCurrent && (
                                    <span className="text-xs font-bold uppercase tracking-wider block">
                                        {p.label}
                                    </span>
                                )}
                            </div>
                            
                            {/* Connector Line */}
                            {i < phases.length - 1 && (
                                <ArrowRight className={`w-3 h-3 mx-1 ${isPast ? 'text-zinc-600' : 'text-zinc-800'}`} />
                            )}
                        </div>
                    );
                })}
                
                {onDelete && (
                    <div className="border-l border-zinc-800 pl-2 ml-2">
                        <button 
                            onClick={() => {
                                if (confirm('Bist du sicher? Alle Flaschen werden zurückgesetzt.')) {
                                    onDelete();
                                }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition"
                            title="Session Löschen"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Metrics Config Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10 border-t border-zinc-800 pt-6">
          <MetricCard 
             label="Stammwürze"
             icon={Scale} 
             value={metrics.originalGravity ? metrics.originalGravity.toFixed(3) : '—'} 
             unit="SG" 
             dim={!metrics.originalGravity}
          />
          <MetricCard 
             label="Aktuell" 
             icon={flaskIconForPhase(phase)} // Dynamic based on phase? Or just generic
             value={metrics.gravity ? metrics.gravity.toFixed(3) : '—'} 
             unit="SG" 
             highlight 
             dim={!metrics.gravity}
          />
          <MetricCard 
             label="Vergärung" 
             icon={Activity}
             value={metrics.attenuation != null ? `${metrics.attenuation}%` : '—'} 
             unit="APP" 
             dim={metrics.attenuation == null}
          />
          <MetricCard 
             label="Alkohol" 
             icon={Percent}
             value={metrics.abv != null ? `${metrics.abv}%` : '—'} 
             unit="ABV" 
             dim={metrics.abv == null}
          />
          <MetricCard 
             label="Volumen" 
             icon={Droplets}
             value={metrics.volume != null ? metrics.volume : '—'} 
             unit="L" 
             dim={metrics.volume == null}
          />
          <MetricCard 
             label="pH-Wert" 
             icon={Beaker}
             value={metrics.ph != null ? metrics.ph : '—'} 
             unit="pH" 
             dim={metrics.ph == null}
          />
      </div>
    </div>
  );
}

function flaskIconForPhase(phase: SessionPhase) {
    if (phase === 'fermenting') return Dna;
    return FlaskConical;
}

function MetricCard({ label, icon: Icon, value, unit, highlight = false, dim = false }: { label: string, icon: any, value: string | number, unit: string, highlight?: boolean, dim?: boolean }) {
    return (
        <div className={`p-3 rounded-lg border flex flex-col justify-between h-24 ${highlight ? 'bg-cyan-950/10 border-cyan-500/20' : 'bg-black border-zinc-800'}`}>
            <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <Icon className="w-3 h-3" />
                    {label}
                </div>
            </div>
            
            <div className="mt-auto">
                <div className={`text-xl md:text-2xl font-bold tracking-tight font-mono ${dim ? 'text-zinc-700' : (highlight ? 'text-cyan-400' : 'text-zinc-200')}`}>
                    {value}
                </div>
                <div className="text-[9px] font-bold text-zinc-600 uppercase mt-1">{unit}</div>
            </div>
        </div>
    );
}
