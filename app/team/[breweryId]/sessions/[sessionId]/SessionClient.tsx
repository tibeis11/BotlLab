'use client';

// Imports
import { useSession } from './SessionContext';
import { 
    SessionTabs, 
    MobileSessionTabs, 
    SessionTab 
} from './_components/SessionTabs';
import { OverviewTab } from './_components/tabs/OverviewTab';
import { PlanningTab } from './_components/tabs/PlanningTab';
import { BrewDayTab } from './_components/tabs/BrewDayTab';
import { FermentationTab } from './_components/tabs/FermentationTab';
import { ConditioningTab } from './_components/tabs/ConditioningTab';
import { CompletedTab } from './_components/tabs/CompletedTab';

import { LogEventType, SessionPhase } from '@/lib/types/session-log';
import { calculateABVFromSG } from '@/lib/brewing-calculations';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

import { BotlGuideProvider } from '@/lib/botlguide/BotlGuideContext';
import { BotlGuideSheet } from '@/app/components/BotlGuideSheet';
import { useSupabase } from '@/lib/hooks/useSupabase';

// Map tab id → SessionPhase
const TAB_TO_PHASE: Partial<Record<SessionTab, SessionPhase>> = {
  planning: 'planning',
  brewing: 'brewing',
  fermentation: 'fermenting',
  conditioning: 'conditioning',
  completed: 'completed',
};

export default function SessionClient({ sessionId }: { sessionId: string }) {
  const { session, measurements, loading, deleteSession, changePhase, isOnline, isSyncing } = useSession();
  const [activeTab, setActiveTab] = useState<SessionTab>('overview');

  const handleTabChange = (tab: SessionTab) => {
    setActiveTab(tab);
    const phase = TAB_TO_PHASE[tab];
    if (phase) changePhase(phase);
  };
  const [userTier, setUserTier] = useState<'free' | 'brewer' | 'brewery' | 'enterprise'>('free');
  const supabase = useSupabase();

  // Fetch user tier
  useEffect(() => {
    const fetchTier = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single();
            
        if(profile?.subscription_tier) {
            setUserTier(profile.subscription_tier as any);
        }
    };
    fetchTier();
  }, [supabase]);

  // Sync active tab with session phase on initial load
  useEffect(() => {
    if (session?.phase) {
        // Map phase to tab id
        const phaseMap: Record<string, SessionTab> = {
            'planning': 'planning',
            'brewing': 'brewing',
            'fermenting': 'fermentation',
            'conditioning': 'conditioning',
            'completed': 'completed'
        };
        // Auto-switch to active phase tab only if we are in "overview" mode initially
        // but perhaps user wants to see Overview first.
        // Let's stick to Overview as default landing.
    }
  }, [session?.phase]);

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

  // --- SESSIONS 3.0 METRICS LOGIC ---
  let og = session.measured_og;
  if (!og && session.timeline) {
      const ogEvent = session.timeline.find(e => e.type === 'MEASUREMENT_OG');
      if (ogEvent && (ogEvent as any).data?.gravity) {
          og = (ogEvent as any).data.gravity;
      }
  }

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const currentGravity = latestMeasurement ? latestMeasurement.gravity : null;

  let abv = 0;
  let attenuation = 0;

  if (og && currentGravity && og > 1 && currentGravity <= og) {
      // Calculate ABV using helper (if available) or simple formula
      // Note: calculateABVFromSG helper imported above
      const calcAbv = (og - currentGravity) * 131.25; // Simplified fallback if helper fails/undefined, but we use helper below
      const helperAbv = calculateABVFromSG(og, currentGravity);
      
      abv = parseFloat(helperAbv.toFixed(2));
      
      // Calculate Attenuation
      const rawAtt = ((og - currentGravity) / (og - 1)) * 100;
      attenuation = parseFloat(rawAtt.toFixed(0));
  }

  const metrics = {
      gravity: currentGravity,
      attenuation: attenuation,
      abv: abv,
      originalGravity: og || null,
      volume: session.measure_volume || 0,
      ph: latestMeasurement?.ph || null
  };

  // Prepare Context for BotlGuide AI
  const guideContext = {
      recipeName: session.brew?.name || 'Unbekanntes Rezept',
      brewStyle: session.brew?.style || session.brew?.recipe_data?.style?.name || 'Unbekannt',
      targetOG: session.brew?.recipe_data?.og || session.brew?.recipe_data?.est_og,
      currentGravity: currentGravity,
      yeast: session.brew?.recipe_data?.yeast_id || session.brew?.recipe_data?.yeast?.name || 'Hefe',
      mashTempC: (session.measurements as any)?.timers?.mash?.targetTemp, // Try to get from active timer state
      mashDurationMin: (session.measurements as any)?.timers?.mash?.duration,
  };

  const renderTabContent = () => {
    switch(activeTab) {
        case 'overview': return <OverviewTab setActiveTab={handleTabChange} />;
        case 'planning': return <PlanningTab />;
        case 'brewing': return <BrewDayTab />;
        case 'fermentation': return <FermentationTab />;
        case 'conditioning': return <ConditioningTab />;
        case 'completed': return <CompletedTab />;
        default: return <OverviewTab setActiveTab={handleTabChange} />;
    }
  };

  return (
    <BotlGuideProvider sessionContext={guideContext} userTier={userTier}>
        {/* Network Status Banners */}
        <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center">
             { !isOnline && (
                <div className="w-full bg-amber-600 text-white px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top-full">
                    <WifiOff className="w-3 h-3" />
                    <span>Offline-Modus • Änderungen werden lokal gespeichert</span>
                </div>
             )}
             { isSyncing && (
                 <div className="w-full bg-emerald-600 text-white px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Synchronisiere Daten...</span>
                </div>
             )}
        </div>

        <div className="flex bg-black text-white min-h-screen selection:bg-cyan-500/30">
            
            {/* Desktop Sidebar — sticky so it stays visible while page scrolls */}
            <SessionTabs 
                activeTab={activeTab} 
                setActiveTab={handleTabChange} 
                currentPhase={session.phase}
            />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* Tab Content — flows naturally, browser scroll handles everything */}
                <main className="flex-1 p-4 lg:p-8 pb-32 lg:pb-8 w-full max-w-6xl mx-auto animate-in fade-in duration-300">
                    {renderTabContent()}
                </main>

                {/* Mobile Bottom Bar (Fixed overlapping at bottom) */}
                <MobileSessionTabs 
                    activeTab={activeTab} 
                    setActiveTab={handleTabChange} 
                    currentPhase={session.phase}
                />
            </div>

            {/* Global Help Sheet */}
            <BotlGuideSheet />
        </div>
    </BotlGuideProvider>
  );
}
