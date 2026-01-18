'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';
import BottlesModal from './components/BottlesModal';
import { removeBrewFromLibrary } from '@/lib/actions/library-actions';
import { useGlobalToast } from '@/app/context/AchievementNotificationContext';
import { getPremiumStatus } from '@/lib/actions/premium-actions';
import { type PremiumStatus } from '@/lib/premium-config';

export default function TeamBrewsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [brews, setBrews] = useState<any[]>([]);
  const [savedBrews, setSavedBrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  
  const [breweryTier, setBreweryTier] = useState<BreweryTierName>('garage');
  const [brewRatings, setBrewRatings] = useState<{ [key: string]: { avg: number; count: number } }>({});
  const [bottlesModalOpen, setBottlesModalOpen] = useState(false);
  const [selectedBrew, setSelectedBrew] = useState<{ id: string; name: string } | null>(null);
  
  const { showToast } = useGlobalToast();

  async function handleRemoveSaved(brewId: string) {
       // We'll trust the user's click for now or implement a better UI later as "Undo" is hard. 
       // For now, let's keep it simple: just do it but notify.
       // Actually, removing confusing confirm() is what user asked.
       try {
           await removeBrewFromLibrary(breweryId, brewId);
           setSavedBrews(prev => prev.filter(b => b.id !== brewId));
           showToast("Entfernt", "Rezept wurde aus der Bibliothek entfernt.", "info");
       } catch(e: any) {
           showToast("Fehler", "Das Rezept konnte nicht entfernt werden.", "warning");
       }
  }

  useEffect(() => {
    if (!authLoading) {
        checkPermissionAndLoad();
    }
  }, [breweryId, user, authLoading]);

  async function checkPermissionAndLoad() {
    try {
      setLoading(true);

      let memberStatus = false;
      let currentUserId = user?.id;

      if (user) {
        // Fetch Own Brews
        const { data: ownBrews } = await supabase.from('brews').select('*, bottles(id, count)').eq('brewery_id', breweryId).order('created_at', { ascending: false });
        setBrews(ownBrews || []);

        // Fetch Saved Brews
        const { data: savedData } = await supabase
            .from('brewery_saved_brews')
            .select(`
                saved_at,
                brew:brews (
                    id, name, style, image_url, is_public, created_at,
                    profiles(display_name),
                    breweries(name)
                )
            `)
            .eq('brewery_id', breweryId)
            .order('saved_at', { ascending: false });
        
        if (savedData) {
            setSavedBrews(savedData.map((item: any) => ({
                ...item.brew,
                saved_at: item.saved_at
            })));
        }

        // Fetch Brewery Tier
        const { data: brewery } = await supabase
			.from('breweries')
			.select('tier')
			.eq('id', breweryId)
			.maybeSingle();
		
		if (brewery) {
			setBreweryTier((brewery.tier as BreweryTierName) || 'garage');
		}

        // Check Membership
        const members = await getBreweryMembers(breweryId);
        const isUserMember = members.some((m: any) => m.user_id === user.id);
        setIsMember(isUserMember);
        memberStatus = isUserMember;
      } else {
        setIsMember(false);
      }

      // Load Brews
      let query = supabase
        .from('brews')
        .select('*, bottles(count)')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false });

      if (!memberStatus) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setBrews(data || []);

      // Load Premium Status
      if (user) {
        const status = await getPremiumStatus();
        setPremiumStatus(status);
      }

      // Load Ratings if we have brews
      if (data && data.length > 0) {
          const brewIds = data.map((b) => b.id);
          const { data: ratingData } = await supabase
					.from('ratings')
					.select('brew_id, rating')
					.in('brew_id', brewIds)
					.eq('moderation_status', 'auto_approved');

            if (ratingData) {
                const stats: { [key: string]: { sum: number; count: number } } = {};
                ratingData.forEach((r) => {
                    if (!stats[r.brew_id]) stats[r.brew_id] = { sum: 0, count: 0 };
                    stats[r.brew_id].sum += r.rating;
                    stats[r.brew_id].count += 1;
                });

                const finalRatings: { [key: string]: { avg: number; count: number } } = {};
                Object.keys(stats).forEach((id) => {
                    finalRatings[id] = {
                        avg: Math.round((stats[id].sum / stats[id].count) * 10) / 10,
                        count: stats[id].count,
                    };
                });
                setBrewRatings(finalRatings);
            }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisibility(id: string, currentState: boolean) {
      if (!isMember) return;
      
      const { error } = await supabase
        .from('brews')
        .update({ is_public: !currentState })
        .eq('id', id)
        .eq('brewery_id', breweryId); // Safety check

      if (!error) {
        setBrews(brews.map((b) => (b.id === id ? { ...b, is_public: !currentState } : b)));
      } else {
        alert('Fehler beim Ändern der Sichtbarkeit: ' + error.message);
      }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-zinc-900 animate-pulse rounded-2xl border border-zinc-800" />
        ))}
      </div>
    );
  }

  // Tier Config Limit Check (Brewery Based)
  const tierConfig = getBreweryTierConfig(breweryTier);
  const organicLimitReached = brews.length >= tierConfig.limits.maxBrews;
  const bypassed = premiumStatus?.features.bypassBrewLimits ?? false;
  const limitReached = organicLimitReached && !bypassed;

  return (
    <div className="space-y-12 pb-24">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
        <div>
           <div className="flex items-center gap-2 mb-4">
              <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                  Rezepte & Sude
              </span>
              {limitReached && (
                  <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-950/30 border border-amber-500/20">
                    Limit erreicht
                  </span>
              )}
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Deine Brau-Bibliothek</h1>
           <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
             Verwalte deine Rezepte, dokumentiere Sude und behalte den Überblick über deine Kreationen.
             <span className="block mt-2 text-sm font-bold text-zinc-500">
                Status: {brews.length} / {tierConfig.limits.maxBrews} Slots belegt
             </span>
           </p>
        </div>

        <div className="lg:justify-self-end">
             {isMember && (
                <button
                    onClick={() => {
                        if (limitReached) {
                            alert(`Die Brauerei hat das Limit für den ${tierConfig.displayName}-Status erreicht (${tierConfig.limits.maxBrews} Rezepte).`);
                            return;
                        }
                        router.push(`/team/${breweryId}/brews/new`);
                    }}
                    className={`
                        group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-black transition-all duration-300
                        ${limitReached 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5' 
                            : 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-95'
                        }
                    `}
                >
                    <span className="text-xl">{limitReached ? '🔒' : '+'}</span>
                    <span>Neues Rezept</span>
                </button>
             )}
        </div>
      </div>
      
      {/* SECTION 1: EIGENE REZEPTE */}
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
         <span>🍺</span> Eigene Rezepte
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500 mb-16">
        
        {/* Brew Cards */}
        {brews.length === 0 && (
            <div className="col-span-full py-12 text-center bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
                <p className="text-zinc-500 mb-2">Noch keine eigenen Rezepte.</p>
                {isMember && (
                    <button onClick={() => router.push(`/team/${breweryId}/brews/new`)} className="text-cyan-400 hover:underline">
                        Erstelle jetzt dein erstes Rezept
                    </button>
                )}
            </div>
        )}

        {brews.map((brew) => (
            <div
                key={brew.id}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg flex flex-col h-full relative"
            >
                {/* Image Section */}
                <div className="aspect-video relative bg-zinc-950 overflow-hidden">
                    <div 
                        className="absolute inset-0 z-0 cursor-pointer"
                        onClick={() => router.push(`/team/${breweryId}/brews/${brew.id}/edit`)}
                    >
                         {brew.image_url ? (
                            <img
                                src={brew.image_url}
                                alt={brew.name}
                                className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-700 bg-zinc-950/50">
                                <span className="text-5xl mb-3 grayscale opacity-30">🍺</span>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Kein Label</span>
                            </div>
                        )}
                        {/* Gradient Overlay for better contrast of overlay badges */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />
                    </div>

                    
                    {/* Top Left: Style Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none z-10">
                        <span className="bg-black/80 backdrop-blur-md text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider border border-white/5 font-bold text-white shadow-sm">
                            {brew.style || 'Standard'}
                        </span>
                    </div>

                    {/* Top Right: Admin Actions (Overlay) */}
                    {isMember && (
                        <div className="absolute top-2 right-2 flex gap-1 z-20">
                             <button
                                onClick={(e) => { e.stopPropagation(); toggleVisibility(brew.id, brew.is_public); }}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-md border shadow-lg transition active:scale-95 ${brew.is_public ? 'bg-zinc-900/80 text-green-400 border-green-500/30' : 'bg-red-900/80 text-red-200 border-red-500/30'}`}
                                aria-label={brew.is_public ? 'Sichtbar (Umschalten auf Privat)' : 'Privat (Umschalten auf Öffentlich)'}
                            >
                                {brew.is_public ? '👁️' : '🔒'}
                            </button>
                            <Link
                                href={`/brew/${brew.id}`}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-cyan-400 hover:text-white hover:bg-black/80 transition active:scale-95 shadow-lg"
                                aria-label="Öffentliche Seite öffnen"
                                onClick={(e) => e.stopPropagation()}
                            >
                                🌍
                            </Link>
                            
                            {/* Bottle Button - Only if bottles exist */}
                            {brew.bottles?.[0]?.count > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBrew({ id: brew.id, name: brew.name });
                                        setBottlesModalOpen(true);
                                    }}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-zinc-200 hover:text-white hover:bg-black/80 transition active:scale-95 shadow-lg"
                                    title="Flaschen verwalten"
                                >
                                    🍾
                                </button>
                            )}
                        </div>
                    )}

                    {/* Bottom Right: Rating Badge */}
                    {brewRatings[brew.id] && (
                        <div className="absolute bottom-3 right-3 pointer-events-none z-10">
                            <div className="bg-black/80 backdrop-blur-md text-amber-400 font-black px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/5 shadow-lg">
                                <span>⭐</span>
                                <span className="text-white">{brewRatings[brew.id].avg}</span>
                                <span className="text-zinc-500 font-normal">({brewRatings[brew.id].count})</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col flex-1 gap-4">
                    
                    {/* Header */}
                    <div>
                        <Link
                            href={`/team/${breweryId}/brews/${brew.id}/edit`}
                            className="block font-black text-xl leading-tight break-words text-white active:text-cyan-400 transition line-clamp-2"
                        >
                            {brew.name}
                        </Link>
                        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
                             <span>{new Date(brew.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                             <span>•</span>
                             <span className={brew.is_public ? 'text-green-500/60' : 'text-red-400/50'}>
                                {brew.is_public ? 'Öffentlich' : 'Privat'}
                             </span>
                             {brew.remix_parent_id && (
                                <>
                                    <span>•</span>
                                    <span className="bg-purple-500/10 text-purple-400/80 px-1.5 rounded text-[10px] uppercase font-bold tracking-wider border border-purple-500/20">Remix</span>
                                </>
                             )}
                        </div>
                    </div>

                   {/* Main Action Buttons */}
                   {!isMember && (
                        <div className="mt-auto pt-2">
                             <Link
                                href={`/brew/${brew.id}`}
                                className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white h-12 flex items-center justify-center rounded-2xl text-sm font-bold text-center transition"
                            >
                                Rezept ansehen
                            </Link>
                        </div>
                   )}
                </div>
            </div>
        ))}
      </div>

      {/* SECTION 2: SAVED BREWS */}
      {savedBrews.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
               <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 pt-8 border-t border-zinc-900 mt-8">
                    <span>📚</span> Bibliothek <span className="text-zinc-500 text-sm font-normal">({savedBrews.length})</span>
                </h3>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedBrews.map((brew) => (
                    <div
                        key={brew.id}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg flex flex-col h-full relative group hover:border-zinc-700 transition"
                    >
                        {/* Image Section */}
                        <Link href={`/brew/${brew.id}`} className="block aspect-video relative bg-zinc-950 overflow-hidden">
                             {brew.image_url ? (
                                <img
                                    src={brew.image_url}
                                    alt={brew.name}
                                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-700 bg-zinc-950/50">
                                    <span className="text-5xl mb-3 grayscale opacity-30">🍺</span>
                                </div>
                            )}
                            
                            {/* Remove Button (Corner) */}
                            {isMember && (
                                <button
                                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveSaved(brew.id); }}
                                   className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-zinc-400 hover:text-red-400 hover:bg-black hover:scale-110 flex items-center justify-center transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                   title="Aus Bibliothek entfernen"
                                >
                                   ✕
                                </button>
                            )}

                             <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none z-10">
                                <span className="bg-black/60 backdrop-blur-md text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider border border-white/5 font-bold text-zinc-300 shadow-sm">
                                    {brew.style || 'Standard'}
                                </span>
                            </div>
                        </Link>

                        <div className="p-5 flex flex-col flex-1 gap-2"> 
                            <Link href={`/brew/${brew.id}`} className="font-bold text-lg text-white hover:text-cyan-400 transition truncate block">
                                {brew.name}
                            </Link>
                            <p className="text-xs text-zinc-500">
                                von <span className="text-zinc-300">{brew.profiles?.display_name || brew.breweries?.name || 'Unbekannt'}</span>
                            </p>
                             <div className="mt-auto pt-4">
                                <Link
                                    href={`/brew/${brew.id}`}
                                    className="block w-full bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white h-10 flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider transition"
                                >
                                    Ansehen
                                </Link>
                            </div>
                        </div>
                    </div>
                  ))}
               </div>
          </div>
      )}

      {bottlesModalOpen && selectedBrew && (
        <BottlesModal 
            isOpen={bottlesModalOpen}
            onClose={() => setBottlesModalOpen(false)}
            brewId={selectedBrew.id}
            brewName={selectedBrew.name}
        />
      )}
    </div>
  );
}

