'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';

import { trackEvent } from '@/lib/actions/analytics-actions';
import { getBreweryPremiumStatus } from '@/lib/actions/premium-actions';
import { type PremiumStatus } from '@/lib/premium-config';
import { 
  ArrowUpRight, BarChart3, Beer, Box, Eye, FilePlus, 
  Printer, QrCode, Star, Users, Zap 
} from 'lucide-react';

import CompactTierStatus from './components/CompactTierStatus';
import ActivitySparkline from './components/ActivitySparkline';
import RecentActivityWidget from './components/RecentActivityWidget';
import TopBrewsWidget from './components/TopBrewsWidget';
import DashboardInsights from './components/DashboardInsights';

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
  const [bottleCount, setBottleCount] = useState(0);
  const [labelCount, setLabelCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [currentTier, setCurrentTier] = useState<BreweryTierName>('garage');
  const [tierLimit, setTierLimit] = useState(10);
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
    const tier = (brewery?.tier as BreweryTierName) || 'garage';
    setCurrentTier(tier);
    const config = getBreweryTierConfig(tier);
    setTierLimit(config.limits.maxBrews);

    // 1.5 Get Premium Status
    const pStatus = await getBreweryPremiumStatus(breweryId);
    setPremiumStatus(pStatus);

    // 2. Get counts in parallel
    const [brewsRes, bottlesRes, labelsRes, membersRes] = await Promise.all([
      supabase.from('brews').select('id', { count: 'exact', head: true }).eq('brewery_id', breweryId),
      supabase.from('bottles').select('id', { count: 'exact', head: true }).eq('brewery_id', breweryId),
      supabase.from('label_templates').select('id', { count: 'exact', head: true }).eq('brewery_id', breweryId),
      supabase.from('brewery_members').select('id', { count: 'exact', head: true }).eq('brewery_id', breweryId),
    ]);

    const bCount = brewsRes.count || 0;
    setBrewCount(bCount);
    setBottleCount(bottlesRes.count || 0);
    setLabelCount(labelsRes.count || 0);
    setMemberCount(membersRes.count || 0);

    // 3. Get total scans from analytics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: scanStats } = await supabase
      .from('analytics_brewery_daily')
      .select('bottles_scanned')
      .eq('brewery_id', breweryId)
      .gte('date', sevenDaysAgo.toISOString().slice(0, 10));
    
    if (scanStats) {
      setTotalScans(scanStats.reduce((sum, s) => sum + (s.bottles_scanned || 0), 0));
    }

    // 4. Get rating stats
    const { data: brews } = await supabase.from('brews').select('id').eq('brewery_id', breweryId);
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

  const isPremium = premiumStatus?.tier === 'brewery' || premiumStatus?.tier === 'enterprise';

  if (loading) return (
        <div className="flex items-center justify-center py-20"> 
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
  );

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-6">
            <div>
                 <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-cyan-400 bg-cyan-950/30 border border-cyan-500/20">
                        Team Dashboard
                    </span>
                    {isPremium && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-purple-400 bg-purple-950/30 border border-purple-500/20">
                        💎 Premium
                      </span>
                    )}
                 </div>
                <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Brauerei-Zentrale</h1>
                <p className="text-sm text-zinc-500">Dein Überblick über Rezepte, Feedback, Scans und Team-Aktivitäten.</p>
            </div>
            <div className="flex gap-2">
              <Link 
                href={`/team/${breweryId}/analytics`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-xs font-bold text-zinc-300 hover:text-white transition-all"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </Link>
              <Link 
                href={`/team/${breweryId}/feed`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-xs font-bold text-zinc-300 hover:text-white transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                Feed
              </Link>
            </div>
      </header>

      {/* KEY METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard 
          icon={<Beer className="w-4 h-4" />}
          label="Rezepte" 
          value={brewCount} 
          color="text-cyan-400"
        />
        <MetricCard 
          icon={<Star className="w-4 h-4" />}
          label="Bewertungen" 
          value={globalRatingStats.total} 
          subValue={globalRatingStats.avg > 0 ? `⌀ ${globalRatingStats.avg}` : undefined}
          color="text-yellow-400"
        />
        <MetricCard 
          icon={<Eye className="w-4 h-4" />}
          label="Scans (7d)" 
          value={totalScans} 
          color="text-emerald-400"
        />
        <MetricCard 
          icon={<Users className="w-4 h-4" />}
          label="Team" 
          value={memberCount}
          color="text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px] gap-6 items-start relative">
        
        {/* --- LEFT COLUMN: MAIN CONTENT --- */}
        <div className="space-y-6 min-w-0">

            {/* AI Insights — premium feature teaser or real insights */}
            <DashboardInsights breweryId={breweryId} hasPremiumAccess={isPremium} />

            {/* Activity Sparkline + Community Feedback side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ActivitySparkline breweryId={breweryId} />
              
              {/* Community Feedback Widget — compact version */}
              <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-20 bg-yellow-500/5 blur-[80px] rounded-full pointer-events-none -mt-8 -mr-8"></div>
                  
                  <div className="relative z-10">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> 
                          Community Rating
                      </h3>
          
                      <div className="flex items-start gap-5">
                          {/* Big Score */}
                          <div className="text-center shrink-0">
                              <div className="text-4xl font-black text-white leading-none tracking-tighter">
                                  {globalRatingStats.total > 0 ? globalRatingStats.avg : '-'}
                              </div>
                              <div className="flex gap-0.5 justify-center my-2 text-yellow-500">
                                  {[1,2,3,4,5].map(s => (
                                      <Star key={s} className={`w-3 h-3 ${s <= Math.round(globalRatingStats.avg) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-800 fill-zinc-900'}`} />
                                  ))}
                              </div>
                              <p className="text-[10px] text-zinc-500 font-bold">
                                  {globalRatingStats.total} Votes
                              </p>
                          </div>

                          {/* Bars */}
                          <div className="flex-1 space-y-2 w-full">
                              {[5,4,3,2,1].map((star) => {
                                  const count = globalRatingStats.distribution[star-1];
                                  const percent = globalRatingStats.total > 0 ? (count / globalRatingStats.total) * 100 : 0;
                                  return (
                                      <div key={star} className="flex items-center gap-2 text-xs group">
                                          <span className="font-bold text-zinc-600 w-3 text-right">{star}</span>
                                          <div className="flex-1 h-1.5 bg-zinc-950/50 border border-zinc-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-yellow-500/70 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%` }} />
                                          </div>
                                          <span className="w-5 text-right text-zinc-700 font-mono text-[10px]">{count}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
            </div>

            {/* Top Brews */}
            <TopBrewsWidget breweryId={breweryId} />
        </div>

        {/* --- RIGHT COLUMN: SIDEBAR --- */}
        <div className="space-y-4 lg:sticky lg:top-8">
            
            {/* Compact Tier Status */}
            <CompactTierStatus 
              tier={currentTier}
              premiumStatus={premiumStatus}
              brewCount={brewCount}
              bottleCount={bottleCount}
              labelCount={labelCount}
              breweryId={breweryId}
            />

            {/* Quick Actions */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-zinc-800/50 bg-zinc-900/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white">Schnellzugriff</h3>
                     {isAdminMode && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 uppercase font-bold">Admin</span>}
                </div>
                
                <div className="p-1.5 space-y-0.5">
                    {/* Add Brew Action */}
                    {(!premiumStatus?.features.bypassBrewLimits && brewCount >= tierLimit && !isAdminMode) ? (
                        <div 
                            onClick={() => trackEvent({ 
                                event_type: 'limit_reached_brews', 
                                category: 'monetization', 
                                payload: { current: brewCount, limit: tierLimit },
                                path: `/team/${breweryId}/dashboard`
                            })}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors bg-red-500/5 border border-red-500/10 cursor-not-allowed group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-red-500/30 transition-colors">
                                <FilePlus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-red-400" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[11px] font-bold text-zinc-400 group-hover:text-red-300">Rezept anlegen</div>
                                <div className="text-[10px] text-red-500 font-medium">Limit ({brewCount}/{tierLimit})</div>
                            </div>
                        </div>
                    ) : (
                        <Link 
                            href={`/team/${breweryId}/brews/new`}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 border border-transparent text-left transition-all group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-colors">
                                <FilePlus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white">Rezept anlegen</div>
                                <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400">Neuen Sud planen</div>
                            </div>
                        </Link>
                    )}

                    {/* Inventory Action */}
                    <Link 
                         href={`/team/${breweryId}/inventory`}
                         className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 border border-transparent text-left transition-all group"
                    >
                         <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-purple-500/50 group-hover:bg-purple-500/10 transition-colors">
                                <Box className="w-3.5 h-3.5 text-zinc-400 group-hover:text-purple-400" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white">Inventar</div>
                                <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400">Bestand & Codes</div>
                            </div>
                    </Link>

                    {/* Analytics Action */}
                    <Link 
                         href={`/team/${breweryId}/analytics`}
                         className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 border border-transparent text-left transition-all group"
                    >
                         <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-colors">
                                <BarChart3 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white">Analytics</div>
                                <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400">Scans & Insights</div>
                            </div>
                    </Link>

                    {/* Sessions Action */}
                    <Link 
                         href={`/team/${breweryId}/sessions`}
                         className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 border border-transparent text-left transition-all group"
                    >
                         <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-yellow-500/50 group-hover:bg-yellow-500/10 transition-colors">
                                <Zap className="w-3.5 h-3.5 text-zinc-400 group-hover:text-yellow-400" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white">Brau-Sessions</div>
                                <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400">Protokolle & Timer</div>
                            </div>
                    </Link>
                </div>
            </div>

            {/* Recent Activity */}
            <RecentActivityWidget breweryId={breweryId} />

            {/* Print Codes Card */}
            <div className="bg-gradient-to-br from-purple-900/10 via-zinc-900/30 to-zinc-900/30 border border-purple-500/20 hover:border-purple-500/40 p-4 rounded-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none -mt-4 -mr-4 group-hover:bg-purple-500/10 transition-colors duration-700"></div>
                
                <div className="relative z-10">
                    <h3 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                        <QrCode className="w-3.5 h-3.5 text-purple-400" />
                        Mehr Feedback?
                    </h3>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                        QR-Codes drucken — Gäste bewerten direkt beim Trinken.
                    </p>
                    <Link 
                        href={`/team/${breweryId}/inventory`} 
                        className="w-full bg-white text-black hover:bg-purple-50 font-bold py-2 rounded-lg text-[11px] flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-900/20"
                    >
                        <Printer className="w-3 h-3" />
                        Codes drucken
                    </Link>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────────── */

function MetricCard({ icon, label, value, subValue, color = 'text-cyan-400' }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color} opacity-60 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-white font-mono tracking-tight">{value.toLocaleString('de-DE')}</span>
        {subValue && (
          <span className="text-xs text-zinc-500 font-bold">{subValue}</span>
        )}
      </div>
    </div>
  );
}

