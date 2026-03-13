import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { calcWeightedAvg } from '@/lib/rating-utils';
import { 

    getBrewFlavorDistribution, 
    getAttributeDistribution, 
    getRatingsWithProfiles,
    getTasteTimeline,
    getBrewFlavorProfile,
} from "@/lib/rating-analytics";
import { ANALYTICS_TIER_FEATURES, type UserTier } from "@/lib/analytics-tier-features";
import { getConversionRate, getBrewCapClaimRate, getRaterDemographics, getStyleBenchmark } from "@/lib/actions/analytics-actions";
import { isValidFlavorProfile, FLAVOR_DIMENSIONS } from "@/lib/flavor-profile-config";

// Components
import AnalyticsMetricCard from "../../components/AnalyticsMetricCard";
import DrinkerFunnelCard from "../../components/DrinkerFunnelCard";
import RaterDemographicsPanel from "../../components/RaterDemographicsPanel";
import StyleBenchmarkCard from "../../components/StyleBenchmarkCard";
import FlavorRadarChart from "@/app/components/FlavorRadarChart";
import TasteEvolutionChart from "./components/TasteEvolutionChart";
import AttributeStats from "./components/AttributeStats";

import { ChevronRight, ArrowLeft, Star, MessageSquare, BarChart3, Tag, Target } from "lucide-react";

export default async function BrewAnalyticsPage({ params }: { params: { breweryId: string; brewId: string } }) {
  const { breweryId, brewId } = await params;
  const supabase = await createClient();

  // 1. Authenticate User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  // 2. Check Brewery Membership & Role (Owner Only)
  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return redirect(`/team/${breweryId}`);
  }

  // 3. Check Subscription Tier
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
    
  const tier = (userProfile?.subscription_tier || 'free') as UserTier;
  const features = ANALYTICS_TIER_FEATURES[tier];

  // 4. Enforce Access
  if (!features.hasAccess) {
      return redirect(`/team/${breweryId}/analytics?upgrade=true`);
  }

  // Fetch Brew Data
  const { data: brew } = await supabase
    .from('brews')
    .select('*')
    .eq('id', brewId)
    .single();

  const ratings = await getRatingsWithProfiles(brewId);
  const [flavorDist, distribution, timeline, communityProfile] = await Promise.all([
    getBrewFlavorDistribution(brewId),
    getAttributeDistribution(brewId),
    getTasteTimeline(brewId),
    getBrewFlavorProfile(brewId),
  ]);

  // Brewer's intended target from brew.flavor_profile (JSON column)
  const rawBrewerProfile = brew?.flavor_profile;
  const brewerProfile = rawBrewerProfile && isValidFlavorProfile(rawBrewerProfile)
    ? { sweetness: rawBrewerProfile.sweetness, bitterness: rawBrewerProfile.bitterness, body: rawBrewerProfile.body, roast: rawBrewerProfile.roast, fruitiness: rawBrewerProfile.fruitiness }
    : null;

  // Phase 4.5: Perception Gap Score — how closely the community perceives the brew as intended
  let perceptionAccuracy: number | null = null;
  if (brewerProfile && communityProfile) {
    const dims = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'] as const;
    const avgDiff = dims.reduce(
      (sum, d) => sum + Math.abs((brewerProfile as any)[d] - (communityProfile as any)[d]),
      0,
    ) / dims.length;
    perceptionAccuracy = Math.round((1 - avgDiff) * 100);
  }

  // Phase 2: funnel data for this brew
  const [conversionResult, capResult, demographicsResult, benchmarkResult] = await Promise.all([
    getConversionRate(breweryId, { brewId }),
    getBrewCapClaimRate(brewId),
    getRaterDemographics({ brewId }),
    getStyleBenchmark(brewId),
  ]);
  const conversionData = conversionResult.data;
  const capData = capResult.data;
  const demographicsData = demographicsResult.data;
  const benchmarkData = benchmarkResult.data ?? null;

  // Fetch brew-level logged_in_scans directly from bottle_scans
  // (analytics_daily_stats may not track logged_in_scans per brew reliably)
  const { count: brewLoggedInScans } = await supabase
    .from('bottle_scans')
    .select('id', { count: 'exact', head: true })
    .eq('brew_id', brewId)
    .not('viewer_user_id', 'is', null);

  // Calculate detailed profile stats
  const detailedRatingsCount = ratings.filter(r => r.taste_bitterness !== null).length;
  const completionRate = ratings.length > 0 ? Math.round((detailedRatingsCount / ratings.length) * 100) : 0;
  const averageScore = ratings.length > 0 ? (calcWeightedAvg(ratings)) : 0;

  return (
    <div className="text-text-primary font-sans antialiased max-w-[1600px] mx-auto w-full">
      {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 mb-8">
            <Link 
                href={`/team/${breweryId}/analytics`}
                className="text-text-muted hover:text-text-primary transition text-xs flex items-center gap-1 mb-2"
            >
                <ArrowLeft size={14} /> Zurück zur Übersicht
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                     <h1 className="text-2xl font-black text-text-primary tracking-tight">{brew?.name}</h1>
                     <div className="flex items-center gap-3 text-text-muted text-sm mt-1">
                        <span className="bg-cyan-950/20 border border-cyan-900/30 px-2.5 py-1 rounded-full text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                            {brew?.style || 'Bier'}
                        </span>
                        <span>Erstellt am {brew?.created_at ? new Date(brew.created_at).toLocaleDateString('de-DE') : '-'}</span>
                     </div>
                </div>
            </div>
      </div>

      {/* Phase 2: Verified Drinker Funnel (brew-scoped) */}
      <div className="mb-8">
        <DrinkerFunnelCard
          totalScans={conversionData?.totalScans ?? 0}
          loggedInScans={brewLoggedInScans ?? 0}
          verifiedDrinkers={conversionData?.conversions ?? 0}
          userTier={tier}
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <AnalyticsMetricCard 
                title="Durchschnitts-Score"
                value={averageScore > 0 ? averageScore.toFixed(1) : '-'}
                subValue="von 5 Sternen"
                icon={<Star size={16} className={averageScore >= 4.5 ? "text-amber-400 fill-amber-400" : "text-text-muted"} />}
            />
            <AnalyticsMetricCard 
                title="Gesamt Feedback"
                value={ratings.length.toString()}
                subValue="Abgegebene Bewertungen"
                icon={<MessageSquare size={16} />}
            />
             <AnalyticsMetricCard 
                title="Profil-Tiefe"
                value={`${completionRate}%`}
                subValue={`${detailedRatingsCount} detaillierte Ratings`}
                icon={<BarChart3 size={16} />}
            />
      </div>

      {/* Phase 4.5: Perception Gap KPI — only shown when enough community data exists */}
      {perceptionAccuracy !== null && (
        <div className="mb-8">
          <AnalyticsMetricCard
            title="Wahrnehmungsgenauigkeit"
            value={`${perceptionAccuracy}%`}
            subValue={
              perceptionAccuracy >= 80
                ? 'Dein Bier wird sehr genau so wahrgenommen wie geplant'
                : perceptionAccuracy >= 60
                  ? 'Leichte Abweichung zwischen Absicht und Wahrnehmung'
                  : 'Große Abweichung — prüfe das Radar für Details'
            }
            icon={<Target size={16} />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         {/* Left Column: Flavor Profile (Radar + Dimension Breakdown) */}
         <div className="bg-surface border border-brand/20 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">Geschmacksprofil</h3>
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                  {communityProfile ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-brand)' }} />
                      <span className="text-text-secondary">Community</span>
                    </div>
                  ) : (
                    <span className="text-text-disabled">Community (ab 3 Profilen)</span>
                  )}
                  {brewerProfile && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-rating)' }} />
                      <span className="text-text-secondary">Brauer-Ziel</span>
                    </div>
                  )}
                </div>
            </div>
            {(brewerProfile || communityProfile) ? (
              <div className="flex justify-center">
                <FlavorRadarChart
                  primaryProfile={communityProfile}
                  secondaryProfile={brewerProfile}
                  showSecondary={true}
                  size={280}
                />
              </div>
            ) : (
                <div className="h-[300px] flex items-center justify-center text-text-disabled italic text-sm">
                    Noch keine Profildaten verfügbar
                </div>
            )}

            {/* Dimension Breakdown — matching BTB reveal style */}
            {communityProfile && brewerProfile && (
              <div className="mt-5 space-y-3">
                <p className="text-[10px] uppercase font-black tracking-widest text-text-disabled">
                  Dimension Details
                </p>
                {FLAVOR_DIMENSIONS.map((dim) => {
                  const community = (communityProfile as unknown as Record<string, number>)[dim.id] ?? 0.5;
                  const brewer = (brewerProfile as unknown as Record<string, number>)[dim.id] ?? 0.5;
                  const diffPercent = Math.round(Math.abs(community - brewer) * 100);
                  const isClose = diffPercent <= 15;

                  return (
                    <div key={dim.id} className="space-y-1">
                      {/* Label row + diff badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dim.hexColor }} />
                          <span className="text-text-muted text-xs font-medium">{dim.labelShort}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isClose ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                          {isClose ? `✓ ±${diffPercent}%` : `△ ±${diffPercent}%`}
                        </span>
                      </div>
                      {/* Community bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                          <div className="h-full bg-brand/60 rounded-full" style={{ width: `${Math.round(community * 100)}%` }} />
                        </div>
                        <span className="text-brand text-[10px] font-mono w-7 text-right flex-shrink-0">
                          {Math.round(community * 100)}%
                        </span>
                      </div>
                      {/* Brauer-Ziel bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                          <div className="h-full bg-rating/60 rounded-full" style={{ width: `${Math.round(brewer * 100)}%` }} />
                        </div>
                        <span className="text-rating text-[10px] font-mono w-7 text-right flex-shrink-0">
                          {Math.round(brewer * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
         </div>

         {/* Right Column: Timeline */}
         <div className="bg-surface border border-border rounded-2xl p-6">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">Entwicklung</h3>
                 <span className="text-[10px] text-text-disabled">Letzte 12 Monate</span>
             </div>
             <TasteEvolutionChart data={timeline} />
         </div>
      </div>

      {/* Phase 4: Stil-Benchmark */}
      <div className="mb-8">
        <StyleBenchmarkCard benchmark={benchmarkData} userTier={tier} />
      </div>

      {/* Phase 3: Rater Demographics */}
      <div className="mb-8">
        <RaterDemographicsPanel
          allScanners={demographicsData?.all ?? null}
          verifiedDrinkers={demographicsData?.verified ?? null}
          userTier={tier}
        />
      </div>

      {/* Attribute Distribution (Full Width or Grid) */}
      <div className="mb-8">
           <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-4">Detail-Verteilung</h3>
           <AttributeStats data={distribution} />
      </div>

      {/* Flavor Tag Cloud */}
      {flavorDist.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
            <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-6">Häufigste Noten</h3>
            <div className="flex flex-wrap gap-2">
                {flavorDist.map((tag, i) => (
                    <span key={tag.tagId} className="bg-surface-hover text-text-secondary px-3 py-1.5 rounded-full text-xs border border-border hover:border-border-hover transition-all flex items-center gap-2">
                        <Tag size={10} className="text-cyan-500/50" />
                        {tag.label}
                        <span className="text-text-disabled font-mono text-[10px]">x{tag.count}</span>
                    </span>
                ))}
            </div>
        </div>
      )}

      {/* Ratings Feed */}
      <div className="border-t border-border pt-8">
         <h2 className="text-lg font-black text-text-primary tracking-tight mb-6">Letzte Bewertungen</h2>
         <div className="space-y-4">
            {ratings.length === 0 ? (
                <div className="text-text-muted text-center py-12 rounded-xl border border-dashed border-border">
                    Keine Bewertungen vorhanden.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {ratings.map(rating => (
                        <div key={rating.id} className="bg-surface border border-border p-4 rounded-xl hover:border-border-hover hover:bg-surface-hover transition-all">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-text-secondary uppercase">
                                            {rating.author_name.slice(0, 2)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-text-primary">{rating.author_name}</div>
                                            <div className="text-[10px] text-text-disabled">{new Date(rating.created_at).toLocaleDateString()}</div>
                                        </div>
                                         {rating.taste_bitterness && <span className="ml-2 text-[9px] bg-cyan-950/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-900/30 font-bold uppercase tracking-wider">Details</span>}
                                    </div>
                                    <div className="flex gap-0.5 text-amber-400 text-sm">
                                        {'★'.repeat(rating.rating)}
                                        <span className="text-border">{'★'.repeat(5-rating.rating)}</span>
                                    </div>
                                    {rating.comment && <p className="text-text-secondary text-sm leading-relaxed max-w-2xl">&ldquo;{rating.comment}&rdquo;</p>}
                                    
                                    {rating.flavor_tags && rating.flavor_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {rating.flavor_tags.map((tag: string) => (
                                                <span key={tag} className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded font-mono">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Mini Score Visualization for List Item */}
                                {rating.taste_bitterness && (
                                    <div className="flex gap-2 md:gap-4 items-center bg-surface/30 p-2 rounded border border-border-subtle self-start md:self-center">
                                         {[
                                            {l: 'Bit', v: rating.taste_bitterness, c: 'text-amber-500'},
                                            {l: 'Süß', v: rating.taste_sweetness, c: 'text-pink-500'},
                                            {l: 'Kör', v: rating.taste_body, c: 'text-blue-500'}
                                         ].map(stat => (
                                             <div key={stat.l} className="flex flex-col items-center min-w-[30px]">
                                                 <span className={`text-xs font-bold font-mono ${stat.c}`}>{stat.v}</span>
                                                 <span className="text-[9px] text-text-disabled uppercase">{stat.l}</span>
                                             </div>
                                         ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      </div>
    </div>
  );
}
