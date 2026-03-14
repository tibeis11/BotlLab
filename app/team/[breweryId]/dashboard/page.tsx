'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';

import { trackEvent } from '@/lib/actions/analytics-actions';
import { getBreweryPremiumStatus } from '@/lib/actions/premium-actions';
import { type PremiumStatus } from '@/lib/premium-config';
import { 
  BarChart3, Box, FilePlus, 
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
            .select('rating, plausibility_score, is_shadowbanned')
            .in('brew_id', brewIds)
            .eq('moderation_status', 'auto_approved');

        if (allRatings && allRatings.length > 0) {
            let totalScore = 0;
            let totalWeight = 0;
            let validCount = 0;
            const dist = [0,0,0,0,0];
            
            allRatings.forEach(r => {
                if (r.is_shadowbanned) return;
                const weight = r.plausibility_score ?? 1.0;
                totalScore += r.rating * weight;
                totalWeight += weight;
                validCount++;
                
                if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
            });

            if (validCount > 0) {
                const avg = Math.round((totalWeight > 0 ? (totalScore / totalWeight) : 0) * 10) / 10;
                setGlobalRatingStats({ avg, total: validCount, distribution: dist });
            }
        }
    }
    setLoading(false);
  }

  const isPremium = premiumStatus?.tier === 'brewery' || premiumStatus?.tier === 'enterprise';

  if (loading) return (
        <div className="flex items-center justify-center py-20"> 
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
  );

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
            <div>
                 <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-brand bg-brand/10 border border-brand/20">
                        Team Dashboard
                    </span>
                    {isPremium && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-accent-purple bg-accent-purple/10 border border-accent-purple/20">
                        💎 Premium
                      </span>
                    )}
                 </div>
                <h1 className="text-3xl font-black text-text-primary tracking-tight leading-none mb-2">Brauerei-Zentrale</h1>
                <p className="text-sm text-text-muted">Dein Überblick über Rezepte, Feedback, Scans und Team-Aktivitäten.</p>
            </div>
            <div className="flex gap-2">
              <Link 
                href={`/team/${breweryId}/analytics`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-hover/50 hover:bg-surface-hover border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </Link>
              <Link 
                href={`/team/${breweryId}/feed`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-hover/50 hover:bg-surface-hover border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                Feed
              </Link>
            </div>
      </header>

      {/* ACTIVITY SPARKLINE — Hero metric, full width */}
      <ActivitySparkline breweryId={breweryId} />

      <div className="flex gap-6 items-start">
        
        {/* --- LEFT COLUMN: MAIN CONTENT --- */}
        <div className="flex-1 min-w-0 space-y-6">

            {/* AI Insights — premium feature teaser or real insights */}
            <DashboardInsights breweryId={breweryId} hasPremiumAccess={isPremium} isAdminMode={isAdminMode} />

            {/* Community Feedback + Top Brews side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Community Feedback Widget */}
              <div className="bg-surface border border-border p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-20 bg-rating/5 blur-[80px] rounded-full pointer-events-none -mt-8 -mr-8"></div>
                  
                  <div className="relative z-10">
                      <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                          <Star className="w-4 h-4 text-rating fill-rating" /> 
                          Community Rating
                      </h3>
          
                      <div className="flex items-start gap-5">
                          {/* Big Score */}
                          <div className="text-center shrink-0">
                              <div className="text-4xl font-black text-text-primary leading-none tracking-tighter">
                                  {globalRatingStats.total > 0 ? globalRatingStats.avg : '-'}
                              </div>
                              <div className="flex gap-0.5 justify-center my-2 text-rating">
                                  {[1,2,3,4,5].map(s => (
                                      <Star key={s} className={`w-3 h-3 ${s <= Math.round(globalRatingStats.avg) ? 'fill-rating text-rating' : 'text-border fill-surface-sunken'}`} />
                                  ))}
                              </div>
                              <p className="text-[10px] text-text-muted font-bold">
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
                                          <span className="font-bold text-text-disabled w-3 text-right">{star}</span>
                                          <div className="flex-1 h-1.5 bg-surface-sunken border border-border rounded-full overflow-hidden">
                                              <div className="h-full bg-rating/70 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%` }} />
                                          </div>
                                          <span className="w-5 text-right text-text-disabled font-mono text-[10px]">{count}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Top Brews */}
              <TopBrewsWidget breweryId={breweryId} />
            </div>
        </div>

        {/* --- RIGHT COLUMN: SIDEBAR --- */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 sticky top-8 space-y-4">
            
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
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-border-subtle bg-surface-hover/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-text-primary">Schnellzugriff</h3>
                     {isAdminMode && <span className="text-[10px] bg-error/10 text-error px-1.5 py-0.5 rounded border border-error/20 uppercase font-bold">Admin</span>}
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
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors bg-error/5 border border-error/10 cursor-not-allowed group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center border border-border group-hover:border-error/30 transition-colors">
                                <FilePlus className="w-3.5 h-3.5 text-text-disabled group-hover:text-error" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[11px] font-bold text-text-muted group-hover:text-error">Rezept anlegen</div>
                                <div className="text-[10px] text-error font-medium">Limit ({brewCount}/{tierLimit})</div>
                            </div>
                        </div>
                    ) : (
                        <Link 
                            href={`/team/${breweryId}/brews/new`}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover/50 hover:border-border border border-transparent text-left transition-all group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center border border-border group-hover:border-brand/50 group-hover:bg-brand/10 transition-colors">
                                <FilePlus className="w-3.5 h-3.5 text-text-muted group-hover:text-brand" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary">Rezept anlegen</div>
                                <div className="text-[10px] text-text-muted group-hover:text-text-secondary">Neuen Sud planen</div>
                            </div>
                        </Link>
                    )}

                    {/* Inventory Action */}
                    <Link 
                         href={`/team/${breweryId}/inventory`}
                         className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover/50 hover:border-border border border-transparent text-left transition-all group"
                    >
                         <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center border border-border group-hover:border-accent-purple/50 group-hover:bg-accent-purple/10 transition-colors">
                                <Box className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-purple" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary">Inventar</div>
                                <div className="text-[10px] text-text-muted group-hover:text-text-secondary">Bestand & Codes</div>
                            </div>
                    </Link>

                    {/* Analytics Action */}
                    <Link 
                         href={`/team/${breweryId}/analytics`}
                         className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover/50 hover:border-border border border-transparent text-left transition-all group"
                    >
                         <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center border border-border group-hover:border-success/50 group-hover:bg-success/10 transition-colors">
                                <BarChart3 className="w-3.5 h-3.5 text-text-muted group-hover:text-success" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary">Analytics</div>
                                <div className="text-[10px] text-text-muted group-hover:text-text-secondary">Scans & Insights</div>
                            </div>
                    </Link>

                    {/* Sessions Action */}
                    <Link 
                         href={`/team/${breweryId}/sessions`}
                         className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover/50 hover:border-border border border-transparent text-left transition-all group"
                    >
                         <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center border border-border group-hover:border-rating/50 group-hover:bg-rating/10 transition-colors">
                                <Zap className="w-3.5 h-3.5 text-text-muted group-hover:text-rating" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary">Brau-Sessions</div>
                                <div className="text-[10px] text-text-muted group-hover:text-text-secondary">Protokolle & Timer</div>
                            </div>
                    </Link>
                </div>
            </div>

            {/* Recent Activity */}
            <RecentActivityWidget breweryId={breweryId} />

            {/* Print Codes Card */}
            <div className="bg-gradient-to-br from-accent-purple/10 via-surface to-surface border border-accent-purple/20 hover:border-accent-purple/40 p-4 rounded-2xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 bg-accent-purple/5 blur-[50px] rounded-full pointer-events-none -mt-4 -mr-4 group-hover:bg-accent-purple/10 transition-colors duration-700"></div>
                
                <div className="relative z-10">
                    <h3 className="text-xs font-bold text-text-primary mb-1.5 flex items-center gap-2">
                        <QrCode className="w-3.5 h-3.5 text-accent-purple" />
                        Mehr Feedback?
                    </h3>
                    <p className="text-[10px] text-text-muted leading-relaxed mb-3">
                        QR-Codes drucken — Gäste bewerten direkt beim Trinken.
                    </p>
                    <Link 
                        href={`/team/${breweryId}/inventory`} 
                        className="w-full bg-text-primary text-background hover:opacity-90 font-bold py-2 rounded-xl text-[11px] flex items-center justify-center gap-2 transition-colors shadow-lg shadow-accent-purple/10"
                    >
                        <Printer className="w-3 h-3" />
                        Codes drucken
                    </Link>
                </div>
            </div>

        </aside>
      </div>
    </div>
  );
}
