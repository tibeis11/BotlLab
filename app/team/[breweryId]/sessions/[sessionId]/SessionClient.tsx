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

export default function SessionClient({ sessionId }: { sessionId: string }) {
  const { session, loading, addEvent, deleteSession } = useSession();

  if (loading) {
     return <div className="text-white p-8 animate-pulse">Laden...</div>;
  }

  if (!session) {
      return <div className="text-white p-8">Session nicht gefunden.</div>;
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
    <div className="max-w-4xl mx-auto px-2 md:px-4 pb-32 pt-4 md:pt-6">
       
       <SessionHeader 
          phase={session.phase}
          status={session.status}
          brewName={session.brew?.name || 'Unbekanntes Rezept'}
          batchCode={session.batch_code || undefined}
          metrics={metrics}
          onDelete={deleteSession}
       />

       {/* Phase Specific Active View */}
       {renderPhaseView()}

       {/* Timeline */}
       <div className="mt-8 border-t border-zinc-800 pt-8">
          <h3 className="text-lg font-bold text-white mb-4">Verlauf</h3>
          <TimelineFeed events={session.timeline || []} />
       </div>
    </div>
  );
}
