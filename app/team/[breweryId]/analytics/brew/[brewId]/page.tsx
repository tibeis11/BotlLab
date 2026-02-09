import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
    getBrewTasteProfile, 
    getBrewFlavorDistribution, 
    getAttributeDistribution, 
    getRatingsWithProfiles,
    getTasteTimeline
} from "@/lib/rating-analytics";
import { ANALYTICS_TIER_FEATURES, type UserTier } from "@/lib/analytics-tier-features";

// Components
import AnalyticsMetricCard from "../../components/AnalyticsMetricCard";
import TasteProfileRadar from "./components/TasteProfileRadar";
import TasteEvolutionChart from "./components/TasteEvolutionChart";
import AttributeStats from "./components/AttributeStats";

import { ChevronRight, ArrowLeft, Star, MessageSquare, BarChart3, Tag } from "lucide-react";

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
  const profile = await getBrewTasteProfile(brewId);
  const flavorDist = await getBrewFlavorDistribution(brewId);
  const distribution = await getAttributeDistribution(brewId);
  const timeline = await getTasteTimeline(brewId);

  // Calculate detailed profile stats
  const detailedRatingsCount = ratings.filter(r => r.taste_bitterness !== null).length;
  const completionRate = ratings.length > 0 ? Math.round((detailedRatingsCount / ratings.length) * 100) : 0;
  const averageScore = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) : 0;

  return (
    <div className="text-white font-sans antialiased max-w-[1600px] mx-auto w-full">
      {/* Header */}
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 mb-8">
            <Link 
                href={`/team/${breweryId}/analytics`}
                className="text-zinc-500 hover:text-white transition text-xs flex items-center gap-1 mb-2"
            >
                <ArrowLeft size={14} /> Zurück zur Übersicht
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                     <h1 className="text-2xl font-bold text-white tracking-tight">{brew?.name}</h1>
                     <div className="flex items-center gap-3 text-zinc-500 text-sm mt-1">
                        <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-[10px] text-zinc-400 uppercase tracking-wide">
                            {brew?.style || 'Bier'}
                        </span>
                        <span>Erstellt am {brew?.created_at ? new Date(brew.created_at).toLocaleDateString('de-DE') : '-'}</span>
                     </div>
                </div>
            </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <AnalyticsMetricCard 
                title="Durchschnitts-Score"
                value={averageScore > 0 ? averageScore.toFixed(1) : '-'}
                subValue="von 5 Sternen"
                icon={<Star size={16} className={averageScore >= 4.5 ? "text-amber-400 fill-amber-400" : "text-zinc-500"} />}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         {/* Left Column: Flavor Profile (Radar) */}
         <div className="bg-black border border-zinc-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Geschmacksprofil</h3>
                <span className="text-[10px] text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    Basierend auf {detailedRatingsCount} Profilen
                </span>
            </div>
            {profile && profile.count > 0 ? (
                <TasteProfileRadar profile={profile} />
            ) : (
                <div className="h-[300px] flex items-center justify-center text-zinc-600 italic text-sm">
                    Noch keine Profildaten verfügbar
                </div>
            )}
         </div>

         {/* Right Column: Timeline */}
         <div className="bg-black border border-zinc-800 rounded-lg p-6">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Entwicklung</h3>
                 <span className="text-[10px] text-zinc-600">Letzte 12 Monate</span>
             </div>
             <TasteEvolutionChart data={timeline} />
         </div>
      </div>
      
      {/* Attribute Distribution (Full Width or Grid) */}
      <div className="mb-8">
           <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-4">Detail-Verteilung</h3>
           <AttributeStats data={distribution} />
      </div>

      {/* Flavor Tag Cloud */}
      {flavorDist.length > 0 && (
        <div className="bg-black border border-zinc-800 rounded-lg p-6 mb-8">
            <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-6">Häufigste Noten</h3>
            <div className="flex flex-wrap gap-2">
                {flavorDist.map((tag, i) => (
                    <span key={tag.tagId} className="bg-zinc-900 text-zinc-300 px-3 py-1.5 rounded-full text-xs border border-zinc-800 flex items-center gap-2">
                        <Tag size={10} className="text-cyan-500/50" />
                        {tag.label}
                        <span className="text-zinc-600 font-mono text-[10px]">x{tag.count}</span>
                    </span>
                ))}
            </div>
        </div>
      )}

      {/* Ratings Feed */}
      <div className="border-t border-zinc-800 pt-8">
         <h2 className="text-lg font-bold text-white mb-6">Letzte Bewertungen</h2>
         <div className="space-y-4">
            {ratings.length === 0 ? (
                <div className="text-zinc-500 text-center py-12 bg-zinc-900/20 rounded-lg border border-dashed border-zinc-800">
                    Keine Bewertungen vorhanden.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {ratings.map(rating => (
                        <div key={rating.id} className="bg-black border border-zinc-800 p-4 rounded-lg hover:border-zinc-700 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-400 uppercase">
                                            {rating.author_name.slice(0, 2)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{rating.author_name}</div>
                                            <div className="text-[10px] text-zinc-600">{new Date(rating.created_at).toLocaleDateString()}</div>
                                        </div>
                                         {rating.taste_bitterness && <span className="ml-2 text-[9px] bg-cyan-950 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-900/50">Details</span>}
                                    </div>
                                    <div className="flex gap-0.5 text-amber-500 text-sm">
                                        {'★'.repeat(rating.rating)}
                                        <span className="text-zinc-800">{'★'.repeat(5-rating.rating)}</span>
                                    </div>
                                    {rating.comment && <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">&ldquo;{rating.comment}&rdquo;</p>}
                                    
                                    {rating.flavor_tags && rating.flavor_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {rating.flavor_tags.map((tag: string) => (
                                                <span key={tag} className="text-[10px] px-2 py-0.5 bg-zinc-900 rounded text-zinc-500 border border-zinc-800">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Mini Score Visualization for List Item */}
                                {rating.taste_bitterness && (
                                    <div className="flex gap-2 md:gap-4 items-center bg-zinc-900/30 p-2 rounded border border-zinc-800/50 self-start md:self-center">
                                         {[
                                            {l: 'Bit', v: rating.taste_bitterness, c: 'text-amber-500'},
                                            {l: 'Süß', v: rating.taste_sweetness, c: 'text-pink-500'},
                                            {l: 'Kör', v: rating.taste_body, c: 'text-blue-500'}
                                         ].map(stat => (
                                             <div key={stat.l} className="flex flex-col items-center min-w-[30px]">
                                                 <span className={`text-xs font-bold font-mono ${stat.c}`}>{stat.v}</span>
                                                 <span className="text-[9px] text-zinc-600 uppercase">{stat.l}</span>
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
