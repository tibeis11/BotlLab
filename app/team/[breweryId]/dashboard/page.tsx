'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getBreweryTierConfig } from '@/lib/tier-system';
import BreweryTierWidget from './components/BreweryTierWidget';

import { trackEvent } from '@/lib/actions/analytics-actions';
import { getBreweryPremiumStatus } from '@/lib/actions/premium-actions';
import { type PremiumStatus } from '@/lib/premium-config';
import { ArrowUpRight, BarChart3, Box, FilePlus, Printer, QrCode, Sparkles, Star, Users, Zap } from 'lucide-react';

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
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (breweryId) loadDashboardData();
  }, [breweryId]);

  async function loadDashboardData() {
    setLoading(true);
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

    // 1.5 Get Premium Status
    const pStatus = await getBreweryPremiumStatus(breweryId);
    setPremiumStatus(pStatus);

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
    setLoading(false);
  }

  if (loading) return (
        <div className="flex items-center justify-center py-20"> 
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
  );

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
            <div>
                 <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-cyan-400 bg-cyan-950/30 border border-cyan-500/20">
                        Team Dashboard
                    </span>
                 </div>
                <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Brauerei-Zentrale</h1>
                <p className="text-sm text-zinc-500">Verwalte deine Rezepte, analysiere das Feedback der Community und steuere deine Brauerei.</p>
            </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start relative">
        
        {/* --- LEFT COLUMN: MAIN CONTENT --- */}
        <div className="space-y-8 min-w-0">
            
            <BreweryTierWidget breweryId={breweryId} />
            
            {/* Community Feedback Widget */}
            <div className="bg-zinc-900/30 border border-zinc-800 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 blur-[100px] rounded-full pointer-events-none -mt-10 -mr-10"></div>
                 
                 <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> 
                        Community Feedback
                    </h3>
        
                    <div className="flex flex-col md:flex-row gap-12 items-center md:items-start">
                        {/* Big Score */}
                        <div className="text-center md:text-left">
                            <div className="text-6xl font-black text-white leading-none tracking-tighter shadow-yellow-500/20 drop-shadow-lg">
                                {globalRatingStats.total > 0 ? globalRatingStats.avg : '-'}
                            </div>
                            <div className="flex gap-1 justify-center md:justify-start my-3 text-yellow-500">
                                    {[1,2,3,4,5].map(s => (
                                        <Star key={s} className={`w-4 h-4 ${s <= Math.round(globalRatingStats.avg) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-800 fill-zinc-900'}`} />
                                    ))}
                            </div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest bg-zinc-900/50 inline-block px-3 py-1 rounded-full border border-zinc-800">
                                {globalRatingStats.total} Votes
                            </p>
                        </div>

                        {/* Bars */ }
                        <div className="flex-1 space-y-3 w-full max-w-sm">
                            {[5,4,3,2,1].map((star) => {
                                    const count = globalRatingStats.distribution[star-1];
                                    const percent = globalRatingStats.total > 0 ? (count / globalRatingStats.total) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-4 text-xs group">
                                            <div className="flex items-center gap-1 w-8">
                                                <span className="font-bold text-zinc-500 group-hover:text-white transition-colors">{star}</span>
                                                <Star className="w-3 h-3 text-zinc-700 fill-zinc-700 group-hover:text-yellow-500/50 transition-colors" />
                                            </div>
                                            <div className="flex-1 h-2 bg-zinc-950/50 border border-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-cyan-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%` }} />
                                            </div>
                                            <span className="w-8 text-right text-zinc-600 font-mono group-hover:text-zinc-400 transition-colors">{count}</span>
                                        </div>
                                    );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- RIGHT COLUMN: SIDEBAR --- */}
        <div className="space-y-6 lg:sticky lg:top-8">
            
            {/* Quick Actions */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Schnellzugriff</h3>
                     {isAdminMode && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 uppercase font-bold">Admin</span>}
                </div>
                
                <div className="p-2 space-y-1">
                    {/* Add Brew Action */}
                    {(!premiumStatus?.features.bypassBrewLimits && brewCount >= tierLimit && !isAdminMode) ? (
                        <div 
                            onClick={() => trackEvent({ 
                                event_type: 'limit_reached_brews', 
                                category: 'monetization', 
                                payload: { current: brewCount, limit: tierLimit },
                                path: `/team/${breweryId}/dashboard`
                            })}
                            className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors bg-red-500/5 border border-red-500/10 cursor-not-allowed group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-red-500/30 transition-colors">
                                <FilePlus className="w-4 h-4 text-zinc-600 group-hover:text-red-400" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-zinc-400 group-hover:text-red-300">Rezept anlegen</div>
                                <div className="text-[10px] text-red-500 font-medium">Limit erreicht ({brewCount}/{tierLimit})</div>
                            </div>
                        </div>
                    ) : (
                        <Link 
                            href={`/team/${breweryId}/brews/new`}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 border border-transparent text-left transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-colors">
                                <FilePlus className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-zinc-200 group-hover:text-white">Rezept anlegen</div>
                                <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400">Neuen Sud planen</div>
                            </div>
                        </Link>
                    )}

                    {/* Inventory Action */}
                    <Link 
                         href={`/team/${breweryId}/inventory`}
                         className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 border border-transparent text-left transition-all group"
                    >
                         <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-purple-500/50 group-hover:bg-purple-500/10 transition-colors">
                                <Box className="w-4 h-4 text-zinc-400 group-hover:text-purple-400" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-zinc-200 group-hover:text-white">Inventar</div>
                                <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400">Bestand & Codes</div>
                            </div>
                    </Link>
                </div>
            </div>

            {/* Print Codes Card */}
            <div className="bg-gradient-to-br from-purple-900/10 via-zinc-900/30 to-zinc-900/30 border border-purple-500/20 hover:border-purple-500/40 p-5 rounded-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none -mt-4 -mr-4 group-hover:bg-purple-500/10 transition-colors duration-700"></div>
                
                <div className="relative z-10">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-purple-400" />
                        Mehr Feedback?
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                        Drucke QR-Codes für deine Flaschen. Gäste können direkt beim Trinken bewerten – ohne App.
                    </p>
                    <Link 
                        href={`/team/${breweryId}/inventory`} 
                        className="w-full bg-white text-black hover:bg-purple-50 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-900/20"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Codes drucken
                    </Link>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

