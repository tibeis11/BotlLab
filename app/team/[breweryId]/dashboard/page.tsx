'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getBreweryTierConfig } from '@/lib/tier-system';
import BreweryTierWidget from './components/BreweryTierWidget';
import { trackEvent } from '@/lib/actions/analytics-actions';

export default function TeamDashboardPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  
  // Rating Stats
  const [globalRatingStats, setGlobalRatingStats] = useState({ 
    avg: 0, 
    total: 0, 
    distribution: [0,0,0,0,0] 
  });
  
  // Tier & Limits
  const [brewCount, setBrewCount] = useState(0);
  const [tierLimit, setTierLimit] = useState(10); // Default safest
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    if (breweryId) loadDashboardData();
  }, [breweryId]);

  async function loadDashboardData() {
    // 0. Check User Admin Status (Bypass)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
         const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
         if (profile?.display_name === 'admin') {
             setIsAdminMode(true);
         }
    }

    // 1. Get Brewery Tier
    const { data: brewery } = await supabase.from('breweries').select('tier').eq('id', breweryId).single();
    const currentTier = brewery?.tier || 'garage';
    const config = getBreweryTierConfig(currentTier as any);
    setTierLimit(config.limits.maxBrews);

    // 2. Get all brews for this brewery
    const { data: brews } = await supabase.from('brews').select('id').eq('brewery_id', breweryId);
    
    if (brews) {
        setBrewCount(brews.length);
    }
    
    if (brews && brews.length > 0) {
        const brewIds = brews.map(b => b.id);
        const { data: allRatings } = await supabase
            .from('ratings')
            .select('rating')
            .in('brew_id', brewIds)
            .eq('moderation_status', 'auto_approved');

        if (allRatings && allRatings.length > 0) {
            const count = allRatings.length;
            const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
            const avg = Math.round((sum / count) * 10) / 10;
            const dist = [0,0,0,0,0];
            allRatings.forEach(r => {
                if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
            });
            setGlobalRatingStats({ avg, total: count, distribution: dist });
        }
    }
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
        <div>
           <div className="flex items-center gap-2 mb-4">
              <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                  Team Dashboard
              </span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Brauerei-Zentrale</h1>
           <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
             Verwalte deine Rezepte, analysiere das Feedback der Community und steuere deine Brauerei.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Main Status Widget */}
        <div className="md:col-span-2 space-y-6">
            <BreweryTierWidget breweryId={breweryId} />
            
            {/* Community Feedback Widget */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">⭐ Community Feedback</h3>
       
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="text-center md:text-left min-w-[120px]">
                         <div className="text-5xl font-black text-white">{globalRatingStats.total > 0 ? globalRatingStats.avg : '-'}</div>
                         <div className="flex gap-1 justify-center md:justify-start my-2 text-yellow-500">
                                {[1,2,3,4,5].map(s => (
                                     <span key={s} className={s <= Math.round(globalRatingStats.avg) ? 'opacity-100' : 'opacity-30'}>★</span>
                                ))}
                         </div>
                         <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">{globalRatingStats.total} Votes</p>
                    </div>

                    <div className="flex-1 space-y-2 w-full">
                         {[5,4,3,2,1].map((star) => {
                                const count = globalRatingStats.distribution[star-1];
                                const percent = globalRatingStats.total > 0 ? (count / globalRatingStats.total) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-3 text-xs">
                                         <span className="w-3 font-bold text-zinc-500">{star}</span>
                                         <span className="text-yellow-500">★</span>
                                         <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }} />
                                         </div>
                                         <span className="w-6 text-right text-zinc-600 font-mono">{count}</span>
                                    </div>
                                );
                         })}
                    </div>
                </div>
            </div>
        </div>

        {/* Quick Actions / Stats Column */}
        <div className="space-y-6">
            
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
                    <span>Schnellzugriff</span>
                    {isAdminMode && <span className="text-[10px] bg-red-900/50 text-red-200 px-2 py-0.5 rounded border border-red-500/30 uppercase tracking-widest">Admin Mode</span>}
                </h3>
                <div className="flex flex-col gap-3">
                    {(brewCount >= tierLimit && !isAdminMode) ? (
                        <div 
                            onClick={() => trackEvent({ 
                                event_type: 'limit_reached_brews', 
                                category: 'monetization', 
                                payload: { current: brewCount, limit: tierLimit },
                                path: `/team/${breweryId}/dashboard`
                            })}
                            className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-red-900/30 opacity-70 cursor-not-allowed relative overflow-hidden" 
                            title="Du musst deine Brauerei upgraden, um mehr Rezepte anzulegen."
                        >
                             <span className="text-2xl grayscale opacity-50">📝</span>
                             <div className="flex-1">
                                <div className="font-bold text-zinc-400">Rezept anlegen</div>
                                <div className="text-xs text-red-400 font-bold">Limit erreicht ({brewCount}/{tierLimit})</div>
                            </div>
                        </div>
                    ) : (
                        <Link href={`/team/${breweryId}/brews/new`} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition group border border-zinc-800 hover:border-cyan-500/50">
                            <span className="text-2xl group-hover:scale-110 transition">📝</span>
                            <div className="flex-1">
                                <div className="font-bold text-white">Rezept anlegen</div>
                                <div className="text-xs text-zinc-500">
                                    {isAdminMode && brewCount >= tierLimit 
                                        ? <span className="text-red-400 font-bold">Limit Bypass ({brewCount}/{tierLimit})</span> 
                                        : 'Neuen Sud planen'}
                                </div>
                            </div>
                        </Link>
                    )}
                    <Link href={`/team/${breweryId}/inventory`} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition group border border-zinc-800 hover:border-purple-500/50">
                        <span className="text-2xl group-hover:scale-110 transition">🍾</span>
                        <div className="flex-1">
                            <div className="font-bold text-white">Inventar</div>
                            <div className="text-xs text-zinc-500">Bestand & Codes</div>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/10 border border-purple-500/20 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl rotate-12 pointer-events-none">🚀</div>
                 <h3 className="text-xl font-bold text-white mb-2">Mehr Feedback erhalten?</h3>
                 <p className="text-zinc-400 mb-4 text-xs">
                        Drucke QR-Codes für deine Flaschen. Gäste können direkt beim Trinken bewerten – ohne App, ohne Login.
                 </p>
                 <Link href={`/team/${breweryId}/inventory`} className="bg-white text-black hover:bg-purple-400 font-bold py-3 px-6 rounded-xl transition inline-flex items-center justify-center gap-2 text-sm shadow-xl">
                    <span>🖨️</span> Codes drucken
                 </Link>
            </div>

        </div>
      </div>
    </div>
  );
}
