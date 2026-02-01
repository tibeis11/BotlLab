'use client';

// Imports
import { useSession } from './SessionContext';
import { 
  TimelineFeed, 
  SessionHeader, 
  SmartActions,
  PlanningView, 
  BrewingView, 
  FermentingView, 
  ConditioningView, 
  CompletedView 
} from './_components';
import { LogEventType } from '@/lib/types/session-log';
import { calculateCurrentStats } from '@/lib/session-log-service';
import { Loader2 } from 'lucide-react';

export default function SessionClient({ sessionId }: { sessionId: string }) {
  const { session, loading, addEvent, deleteSession } = useSession();

  if (loading) {
     return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            <p className="font-medium animate-pulse">Lade Logbuch...</p>
        </div>
     );
  }

  if (!session) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-white p-8 border border-zinc-800 rounded-xl bg-zinc-900">Session nicht gefunden.</div>
        </div>
      );
  }

  // Phase Router
  const renderPhaseView = () => {
    switch(session.phase) {
      case 'planning': return <PlanningView />;
      case 'brewing': return <BrewingView />;
      case 'fermenting': return <FermentingView />;
      case 'conditioning': return <ConditioningView />;
      case 'completed': return <CompletedView />;
      default: return <PlanningView />;
    }
  };
  
  // Calculate Metrics from Timeline (Live Update)
  const stats = calculateCurrentStats(session.timeline || []);
  
  // Find OG manually for display (calculateCurrentStats uses it internally but returns derived stats)
  const ogEvent = session.timeline?.filter(e => e.type === 'MEASUREMENT_OG')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
  // Find latest SG manually for display
  const currentEvent = session.timeline?.filter(e => e.type === 'MEASUREMENT_SG' || e.type === 'MEASUREMENT_FG')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const metrics = {
      gravity: stats.currentGravity || null,
      attenuation: stats.attenuation,
      abv: stats.abv,
      originalGravity: stats.og || null,
      volume: stats.volume,
      ph: stats.ph
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
            <SessionHeader 
                phase={session.phase}
                status={session.status}
                brewName={session.brew?.name || 'Unbekanntes Rezept'}
                batchCode={session.batch_code || undefined}
                metrics={metrics}
                onDelete={deleteSession}
            />

            {/* Smart Actions / Active Phase Interactions */}
            <div className="mb-12">
                {renderPhaseView()}
            </div>

            {/* Timeline */}
            <div className="border-t border-zinc-900 pt-12">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Verlauf
                        <span className="text-zinc-600 font-medium text-sm ml-2 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                            {session.timeline?.length || 0}
                        </span>
                    </h3>
                </div>
                <TimelineFeed events={session.timeline || []} />
            </div>
        </div>
    </div>
  );
}
