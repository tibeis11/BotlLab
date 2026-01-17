import { SessionPhase } from '@/lib/types/session-log';

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
  const phases: {id: SessionPhase, label: string, icon: string}[] = [
    { id: 'planning', label: 'Planung', icon: '📋' },
    { id: 'brewing', label: 'Brauen', icon: '🔥' },
    { id: 'fermenting', label: 'Gärung', icon: '🧬' },
    { id: 'conditioning', label: 'Reifung', icon: '❄️' },
    { id: 'completed', label: 'Fertig', icon: '🍻' }
  ];
  
  const currentPhaseIndex = phases.findIndex(p => p.id === phase);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 md:p-8 mb-6 md:mb-8 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />

      {/* Top Row: Meta & Phase Timeline */}
      <div className="relative flex flex-col gap-6 mb-8">
        <div>
           {batchCode && (
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest block mb-2">
                Batch {batchCode}
              </span>
           )}
           <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
             {brewName}
           </h1>
           <div className="text-zinc-500 text-sm mt-2 flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-600'}`}></span>
             <span className="uppercase tracking-wider font-bold text-xs">{status}</span>
           </div>
        </div>

        {/* Phase Timeline Visualization */}
        <div className="flex items-center gap-2 bg-zinc-950/80 p-2 rounded-2xl border border-zinc-800/80 backdrop-blur-sm overflow-x-auto w-fit max-w-full no-scrollbar">
            {phases.map((p, i) => {
                const isCurrent = i === currentPhaseIndex;
                const isPast = i < currentPhaseIndex;
                
                return (
                    <div key={p.id} className="flex items-center">
                        <div 
                            className={`
                                flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap
                                ${isCurrent 
                                    ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700 ring-1 ring-zinc-700' 
                                    : isPast 
                                        ? 'text-emerald-600' 
                                        : 'text-zinc-800'
                                }
                            `}
                        >
                            <span className={`text-lg ${!isCurrent && !isPast && 'opacity-20 grayscale'}`}>{p.icon}</span>
                            {isCurrent && (
                                <span className="text-xs font-bold uppercase tracking-wider block animate-in fade-in slide-in-from-left-1 duration-300">
                                    {p.label}
                                </span>
                            )}
                        </div>
                        
                        {/* Connector Line */}
                        {i < phases.length - 1 && (
                            <div className={`w-4 h-[2px] rounded-full mx-1 hidden md:block ${isPast ? 'bg-emerald-900/40' : 'bg-zinc-900'}`} />
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
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition"
                        title="Session Löschen"
                    >
                        🗑️
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Metrics Config Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
          <MetricCard 
             label="Stammwürze" 
             value={metrics.originalGravity ? metrics.originalGravity.toFixed(3) : '—'} 
             unit="SG" 
             dim={!metrics.originalGravity}
          />
          <MetricCard 
             label="Aktuell" 
             value={metrics.gravity ? metrics.gravity.toFixed(3) : '—'} 
             unit="SG" 
             highlight 
             dim={!metrics.gravity}
          />
          <MetricCard 
             label="Vergärung" 
             value={metrics.attenuation != null ? `${metrics.attenuation}%` : '—'} 
             unit="APP" 
             dim={metrics.attenuation == null}
          />
          <MetricCard 
             label="Alkohol" 
             value={metrics.abv != null ? `${metrics.abv}%` : '—'} 
             unit="ABV" 
             dim={metrics.abv == null}
          />
          <MetricCard 
             label="Volumen" 
             value={metrics.volume != null ? metrics.volume : '—'} 
             unit="L" 
             dim={metrics.volume == null}
          />
          <MetricCard 
             label="pH-Wert" 
             value={metrics.ph != null ? metrics.ph : '—'} 
             unit="pH" 
             dim={metrics.ph == null}
          />
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, highlight = false, dim = false }: { label: string, value: string | number, unit: string, highlight?: boolean, dim?: boolean }) {
    return (
        <div className={`p-4 rounded-2xl border ${highlight ? 'bg-cyan-950/10 border-cyan-500/20' : 'bg-zinc-950/50 border-zinc-800/50'}`}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
            <div className={`text-2xl md:text-3xl font-black tracking-tight ${dim ? 'text-zinc-700' : (highlight ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]' : 'text-zinc-200')}`}>
                {value}
            </div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase">{unit}</div>
        </div>
    );
}
