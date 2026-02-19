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
  Beaker,
  Edit2
} from 'lucide-react';
import { useState } from 'react';
import { useSession } from '../SessionContext';

interface SessionHeaderProps {
  sessionId?: string;
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


const MetricEdit = ({ value, unit, onSave, onCancel }: { value?: number | null, unit: string, onSave: (val: string) => void, onCancel: () => void }) => {
    const [val, setVal] = useState(value?.toString() || '');
    return (
        <div className="absolute inset-0 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center p-2 gap-2 z-20">
            <input 
                autoFocus
                type="number" 
                className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm text-white" 
                value={val}
                onChange={e => setVal(e.target.value)}
                placeholder="0.0"
                onKeyDown={e => { if(e.key === 'Enter') onSave(val); else if(e.key === 'Escape') onCancel(); }}
            />
            <button onClick={() => onSave(val)} className="text-emerald-500 hover:text-emerald-400"><CheckCircle2 className="w-4 h-4" /></button>
            <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-400"><Trash2 className="w-4 h-4" /></button>
        </div>
    );
};

export function SessionHeader({ phase, status, brewName, batchCode, metrics, onDelete }: SessionHeaderProps) {
  const { addEvent, updateSessionData } = useSession();
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editingBatchCode, setEditingBatchCode] = useState(false);
  const [batchCodeInput, setBatchCodeInput] = useState(batchCode || '');

  const handleSaveBatchCode = async () => {
    const trimmed = batchCodeInput.trim();
    await updateSessionData({ batch_code: trimmed || null } as any);
    setEditingBatchCode(false);
  };

  const handleUpdate = async (type: 'VOLUME' | 'PH', val: string) => {
        if (!val) { setEditingMetric(null); return; }
        const num = parseFloat(val.replace(',', '.'));
        
        if (type === 'VOLUME') {
            await addEvent({ 
                title: 'Volumen gemessen',
                type: 'MEASUREMENT_VOLUME',
                data: { volume: num } 
            });
        } else {
            await addEvent({ 
                title: 'pH-Wert gemessen',
                type: 'MEASUREMENT_PH',
                data: { ph: num } 
            });
        }
        setEditingMetric(null);
  };
  
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
               {/* Batch-Code — inline editable */}
               <div className="mb-2">
                 {editingBatchCode ? (
                   <div className="flex items-center gap-2 w-fit">
                     <input
                       autoFocus
                       type="text"
                       value={batchCodeInput}
                       onChange={e => setBatchCodeInput(e.target.value)}
                       onKeyDown={e => {
                         if (e.key === 'Enter') handleSaveBatchCode();
                         if (e.key === 'Escape') setEditingBatchCode(false);
                       }}
                       onBlur={handleSaveBatchCode}
                       className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[11px] font-bold uppercase text-white tracking-widest w-40 focus:border-zinc-500 outline-none"
                       placeholder="z.B. 2026-A"
                     />
                   </div>
                 ) : (
                   <button
                     onClick={() => { setBatchCodeInput(batchCode || ''); setEditingBatchCode(true); }}
                     className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 hover:text-zinc-400 transition-colors group w-fit"
                   >
                     <span>{batchCode ? `Batch ${batchCode}` : '+ Batch-Code'}</span>
                     <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </button>
                 )}
               </div>
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
          <div className="relative">
              <MetricCard 
                label="Stammwürze"
                icon={Scale} 
                value={metrics.originalGravity ? metrics.originalGravity.toFixed(3) : '—'} 
                unit="SG" 
                dim={!metrics.originalGravity}
              />
          </div>
          <div className="relative">
             <MetricCard 
                label="Aktuell" 
                icon={flaskIconForPhase(phase)} 
                value={metrics.gravity ? metrics.gravity.toFixed(3) : '—'} 
                unit="SG" 
                dim={!metrics.gravity}
             />
          </div>
          <div className="relative">
             <MetricCard 
                label="Vergärung" 
                icon={Activity}
                value={metrics.attenuation != null ? `${metrics.attenuation}%` : '—'} 
                unit="APP" 
                dim={metrics.attenuation == null}
             />
          </div>
          <div className="relative">
             <MetricCard 
                label="Alkohol" 
                icon={Percent}
                value={metrics.abv != null ? `${metrics.abv}%` : '—'} 
                unit="ABV" 
                dim={metrics.abv == null}
             />
          </div>
          <div className="relative">
             {editingMetric === 'VOLUME' && (
                 <MetricEdit 
                    value={metrics.volume} 
                    unit="L" 
                    onSave={(val) => handleUpdate('VOLUME', val)}
                    onCancel={() => setEditingMetric(null)}
                 />
             )}
             <MetricCard 
                label="Volumen" 
                icon={Droplets}
                value={metrics.volume != null ? metrics.volume : '—'} 
                unit="L" 
                dim={metrics.volume == null}
                onEdit={() => setEditingMetric('VOLUME')}
             />
          </div>
          <div className="relative">
             {editingMetric === 'PH' && (
                 <MetricEdit 
                    value={metrics.ph} 
                    unit="pH" 
                    onSave={(val) => handleUpdate('PH', val)}
                    onCancel={() => setEditingMetric(null)}
                 />
             )}
             <MetricCard 
                label="pH-Wert" 
                icon={Beaker}
                value={metrics.ph != null ? metrics.ph : '—'} 
                unit="pH" 
                dim={metrics.ph == null}
                onEdit={() => setEditingMetric('PH')}
             />
          </div>
      </div>
    </div>
  );
}

function flaskIconForPhase(phase: SessionPhase) {
    if (phase === 'fermenting') return Dna;
    return FlaskConical;
}

function MetricCard({ label, icon: Icon, value, unit, highlight = false, dim = false, onEdit }: { label: string, icon: any, value: string | number, unit: string, highlight?: boolean, dim?: boolean, onEdit?: () => void }) {
    return (
        <div className={`p-3 rounded-lg border flex flex-col justify-between h-24 relative group ${highlight ? 'bg-cyan-950/10 border-cyan-500/20' : 'bg-black border-zinc-800'}`}>
            {onEdit && (
                <button 
                  onClick={onEdit}
                  className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-700 rounded"
                >
                    <Edit2 className="w-3 h-3" />
                </button>
            )}
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
