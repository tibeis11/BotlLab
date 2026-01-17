import { TimelineEvent, MeasurementLogEntry, NoteLogEntry, StatusChangeLogEntry, IngredientLogEntry } from '@/lib/types/session-log';

interface TimelineFeedProps {
  events: TimelineEvent[];
}

export function TimelineFeed({ events }: TimelineFeedProps) {
  // Sort events: Newest first
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
        <div className="text-center py-16 px-4 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl border border-zinc-800 text-zinc-600">🌱</div>
            <h3 className="text-zinc-300 font-bold text-lg mb-2">Die Timeline ist leer</h3>
            <p className="text-zinc-500 text-sm">Starte deine Brau-Session, indem du ein Ereignis hinzufügst.</p>
        </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
      {sortedEvents.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const getIcon = (type: string) => {
      switch (type) {
          case 'MEASUREMENT_OG': return '⚖️';
          case 'MEASUREMENT_SG': return '🧪';
          case 'NOTE': return '📝';
          case 'STATUS_CHANGE': return '🔄';
          case 'INGREDIENT_ADD': return '🌿';
          default: return '📍';
      }
  };

  const getBorderColor = (type: string) => {
       if (type.startsWith('MEASUREMENT')) return 'border-cyan-500/30';
       if (type === 'STATUS_CHANGE') return 'border-purple-500/30';
       return 'border-zinc-800';
  };

  return (
    <div className="relative group animate-in slide-in-from-bottom-2 duration-500">
      {/* Dot on line */}
      <div className={`absolute -left-[29px] top-4 w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-700 z-10 flex items-center justify-center text-[10px]`}>
      </div>

      <div className={`bg-zinc-950 border ${getBorderColor(event.type)} rounded-2xl p-5 shadow-lg group-hover:border-zinc-600 transition-colors`}>
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
                <span className="text-xl">{getIcon(event.type)}</span>
                <span className="font-bold text-zinc-200">{event.title || 'Ereignis'}</span>
            </div>
            <span className="text-zinc-600 text-xs font-mono">{new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        
        {event.description && <p className="text-zinc-400 text-sm leading-relaxed mb-3">{event.description}</p>}

        {/* Data Specific Rendering */}
        {renderEventData(event)}

      </div>
    </div>
  );
}

function renderEventData(event: TimelineEvent) {
    if (event.type === 'MEASUREMENT_OG' || event.type === 'MEASUREMENT_SG' || event.type === 'MEASUREMENT_FG') {
        const e = event as MeasurementLogEntry;
        return (
            <div className="bg-zinc-900/50 rounded-xl p-3 inline-flex items-center gap-3 border border-zinc-800">
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Wert:</span>
                <span className="font-mono text-cyan-400 font-bold text-lg">{e.data.gravity?.toFixed(3)}</span>
                <span className="text-xs text-zinc-600">{ e.data.unit === 'plato' ? '°P' : 'SG'}</span>
            </div>
        );
    }
    if (event.type === 'MEASUREMENT_VOLUME') {
         const e = event as MeasurementLogEntry;
         return (
            <div className="bg-zinc-900/50 rounded-xl p-3 inline-flex items-center gap-3 border border-zinc-800">
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Vol:</span>
                <span className="font-mono text-blue-400 font-bold text-lg">{e.data.volume?.toFixed(1)}</span>
                <span className="text-xs text-zinc-600">L</span>
                {e.data.temperature && <span className="text-xs text-zinc-600 ml-2">(@{e.data.temperature}°C)</span>}
            </div>
         );
    }
    if (event.type === 'MEASUREMENT_PH') {
        const e = event as MeasurementLogEntry;
        return (
           <div className="bg-zinc-900/50 rounded-xl p-3 inline-flex items-center gap-3 border border-zinc-800">
               <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">pH:</span>
               <span className="font-mono text-pink-400 font-bold text-lg">{e.data.ph?.toFixed(2)}</span>
           </div>
        );
   }
    if (event.type === 'STATUS_CHANGE') {
        const e = event as StatusChangeLogEntry;
        return (
             <div className="flex items-center gap-2 text-xs text-purple-400 font-bold uppercase tracking-widest bg-purple-950/20 px-3 py-1.5 rounded-lg w-fit border border-purple-500/20">
                 Neuer Status: {e.data.newStatus}
             </div>
        );
    }
    return null;
}
