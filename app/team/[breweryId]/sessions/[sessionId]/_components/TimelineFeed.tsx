import { TimelineEvent, MeasurementLogEntry, NoteLogEntry, StatusChangeLogEntry, IngredientLogEntry } from '@/lib/types/session-log';
import { 
    Scale, 
    StickyNote, 
    RefreshCcw, 
    Leaf, 
    MapPin, 
    FlaskConical,
    Droplets,
    Activity,
    ClipboardList 
} from 'lucide-react';

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
        <div className="text-center py-24 px-4 bg-surface border border-border border-dashed rounded-xl flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-6 border border-border text-text-disabled">
                <ClipboardList className="w-8 h-8"/>
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-2">Die Timeline ist leer</h3>
            <p className="text-text-muted text-sm max-w-sm">Starte deine Brau-Session, indem du Ereignisse hinzufügst.</p>
        </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
      {sortedEvents.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const getIcon = (type: string) => {
      switch (type) {
          case 'MEASUREMENT_OG': return Scale;
          case 'MEASUREMENT_SG': return FlaskConical;
          case 'MEASUREMENT_FG': return FlaskConical;
          case 'NOTE': return StickyNote;
          case 'STATUS_CHANGE': return RefreshCcw;
          case 'INGREDIENT_ADD': return Leaf;
          default: return MapPin;
      }
  };

  const Icon = getIcon(event.type);

  const getBorderColor = (type: string) => {
       if (type.startsWith('MEASUREMENT')) return 'border-brand/20 hover:border-brand/40';
       if (type === 'STATUS_CHANGE') return 'border-purple-500/20 hover:border-purple-500/40';
       return 'border-border hover:border-border';
  };

  const getIconColor = (type: string) => {
    if (type.startsWith('MEASUREMENT')) return 'text-brand';
    if (type === 'STATUS_CHANGE') return 'text-purple-500';
    return 'text-zinc-500';
  }

  return (
    <div className="relative group animate-in slide-in-from-bottom-2 duration-500">
      {/* Dot on line */}
      <div className="absolute -left-[29px] top-4 w-6 h-6 rounded-full bg-surface border-2 border-border z-10 flex items-center justify-center">
         <div className={`w-2 h-2 rounded-full ${getIconColor(event.type).replace('text-', 'bg-')}`}></div>
      </div>

      <div className={`bg-surface border ${getBorderColor(event.type)} rounded-xl p-5 shadow-sm transition-colors`}>
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
                <span className={`${getIconColor(event.type)}`}><Icon className="w-5 h-5"/></span>
                <span className="font-bold text-text-primary">{event.title || 'Ereignis'}</span>
            </div>
            <span className="text-text-disabled text-xs font-mono">{new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        
        {event.description && <p className="text-text-muted text-sm leading-relaxed mb-4">{event.description}</p>}

        {/* Data Specific Rendering */}
        {renderEventData(event)}

      </div>
    </div>
  );
}

function renderEventData(event: TimelineEvent) {
    if (event.type === 'MEASUREMENT_OG' || event.type === 'MEASUREMENT_SG' || event.type === 'MEASUREMENT_FG') {
        const e = event as MeasurementLogEntry;
        const isGravity = true;
        
        return (
            <div className="bg-background/40 rounded-lg p-3 inline-flex items-center gap-3 border border-border">
                <span className="text-xs font-bold uppercase text-text-muted tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3 h-3" />
                    Wert
                </span>
                <span className="font-mono text-brand font-bold text-lg">{e.data.gravity?.toFixed(3)}</span>
                <span className="text-xs text-text-disabled font-bold">{ e.data.unit === 'plato' ? '°P' : 'SG'}</span>
            </div>
        );
    }
    if (event.type === 'MEASUREMENT_VOLUME') {
         const e = event as MeasurementLogEntry;
         return (
            <div className="bg-background/40 rounded-lg p-3 inline-flex items-center gap-3 border border-border">
                <span className="text-xs font-bold uppercase text-text-muted tracking-wider flex items-center gap-1.5">
                    <Droplets className="w-3 h-3" />
                    Vol
                </span>
                <span className="font-mono text-blue-400 font-bold text-lg">{e.data.volume?.toFixed(1)}</span>
                <span className="text-xs text-text-disabled font-bold">L</span>
                {e.data.temperature && <span className="text-xs text-text-disabled ml-2">(@{e.data.temperature}°C)</span>}
            </div>
         );
    }
    if (event.type === 'MEASUREMENT_PH') {
        const e = event as MeasurementLogEntry;
        return (
           <div className="bg-background/40 rounded-lg p-3 inline-flex items-center gap-3 border border-border">
               <span className="text-xs font-bold uppercase text-text-muted tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3 h-3" />
                    pH
               </span>
               <span className="font-mono text-pink-400 font-bold text-lg">{e.data.ph?.toFixed(2)}</span>
           </div>
        );
   }
    if (event.type === 'STATUS_CHANGE') {
        const e = event as StatusChangeLogEntry;
        return (
             <div className="flex items-center gap-2 text-xs text-purple-400 font-bold uppercase tracking-widest bg-purple-950/10 px-3 py-1.5 rounded-lg w-fit border border-purple-500/20">
                 <RefreshCcw className="w-3 h-3" />
                 Status: {e.data.newStatus}
             </div>
        );
    }
    return null;
}
