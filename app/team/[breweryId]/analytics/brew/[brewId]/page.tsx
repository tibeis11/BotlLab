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
import TasteRadarChart from "@/app/brew/[id]/components/TasteRadarChart";
import FlavorTagCloud from "@/app/brew/[id]/components/FlavorTagCloud";
import AttributeDistribution from "./components/AttributeDistribution";
import TasteTimeline from "./components/TasteTimeline";

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
    // If not owner, they can't see deep analytics
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
      // Redirect to main analytics page which handles the paywall UI
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
        <div>
            <Link 
                href={`/team/${breweryId}/analytics`}
                className="text-zinc-500 hover:text-white transition text-sm mb-4 inline-block"
            >
                ← Zurück zur Übersicht
            </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
            <div>
                 <h1 className="text-3xl font-black text-white">{brew?.name}</h1>
                 <p className="text-zinc-500 text-sm mt-1">Erstellt am {new Date(brew?.created_at).toLocaleDateString('de-DE')}</p>
            </div>
            <div className="flex gap-4">
                 <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl">
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Score</div>
                      <div className="text-2xl font-black text-cyan-500">
                        {ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : '-'} <span className="text-zinc-600 text-lg">/ 5</span>
                      </div>
                 </div>
                 <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl">
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Feedback</div>
                      <div className="text-2xl font-black text-white">{ratings.length}</div>
                 </div>
                 <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl hidden md:block">
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Tiefe</div>
                      <div className="text-2xl font-black text-white">{detailedRatingsCount} <span className="text-sm text-zinc-600 font-normal">({completionRate}%)</span></div>
                 </div>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Left Column: Visuals */}
         <div className="space-y-8">
            {profile && profile.count > 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Geschmacksprofil</h2>
                    <TasteRadarChart profile={profile} />
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                    <p className="text-zinc-500">Noch nicht genügend Daten für ein Profil.</p>
                </div>
            )}
            
            {/* Tag Cloud */}
            {flavorDist.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Häufigste Noten</h2>
                    <FlavorTagCloud tags={flavorDist} />
                </div>
            )}
         </div>

         {/* Right Column: Distribution & List */}
         <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                 <h2 className="text-xl font-bold text-white mb-6">Geschmacksentwicklung</h2>
                 <p className="text-xs text-zinc-500 mb-4">Veränderung der Durchschnittswerte über die Monate (Reifung / Batch-Unterschiede)</p>
                 <TasteTimeline data={timeline} />
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
                 <h2 className="text-xl font-bold text-white mb-6">Verteilung nach Attribut</h2>
                 <AttributeDistribution data={distribution} />
            </div>
         </div>
      </div>

      {/* Ratings List */}
      <div className="pt-8 border-t border-zinc-800">
         <h2 className="text-xl font-bold text-white mb-6">Letzte Bewertungen</h2>
         <div className="grid gap-4">
            {ratings.map(rating => (
                <div key={rating.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">{rating.author_name}</span>
                            <span className="text-zinc-600 text-xs">• {new Date(rating.created_at).toLocaleDateString('de-DE')}</span>
                            {rating.taste_bitterness && <span className="text-[10px] bg-cyan-900/30 text-cyan-500 px-2 py-0.5 rounded-full border border-cyan-900/50">Profil</span>}
                        </div>
                        <div className="flex gap-0.5 text-yellow-500 text-sm mb-2">
                             {'★'.repeat(rating.rating)}{'☆'.repeat(5-rating.rating)}
                        </div>
                        {rating.comment && <p className="text-zinc-400 text-sm italic">&ldquo;{rating.comment}&rdquo;</p>}
                        
                        {/* Flavor Tags Small */}
                        {rating.flavor_tags && rating.flavor_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                                {rating.flavor_tags.map((tag: string) => (
                                    <span key={tag} className="text-[10px] px-2 py-1 bg-zinc-800 rounded-md text-zinc-400 border border-zinc-700">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                     </div>
                     {/* Mini Scores */}
                     {rating.taste_bitterness && (
                        <div className="grid grid-cols-5 gap-2 text-[10px] text-zinc-500 border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-4 min-w-[200px]">
                            <div className="flex flex-col items-center"><span>Bit</span><span className="text-white font-bold">{rating.taste_bitterness}</span></div>
                            <div className="flex flex-col items-center"><span>Süß</span><span className="text-white font-bold">{rating.taste_sweetness}</span></div>
                            <div className="flex flex-col items-center"><span>Kör</span><span className="text-white font-bold">{rating.taste_body}</span></div>
                            <div className="flex flex-col items-center"><span>Kohl</span><span className="text-white font-bold">{rating.taste_carbonation}</span></div>
                            <div className="flex flex-col items-center"><span>Säu</span><span className="text-white font-bold">{rating.taste_acidity}</span></div>
                        </div>
                     )}
                </div>
            ))}
         </div>
      </div>
    </div>
  );
}
