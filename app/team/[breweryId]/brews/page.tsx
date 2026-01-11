'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';
import BottlesModal from './components/BottlesModal';

// Simple Icon Components
const PlusIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default function TeamBrewsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [brews, setBrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  
  const [breweryTier, setBreweryTier] = useState<BreweryTierName>('garage');
  const [brewRatings, setBrewRatings] = useState<{ [key: string]: { avg: number; count: number } }>({});
  const [bottlesModalOpen, setBottlesModalOpen] = useState(false);
  const [selectedBrew, setSelectedBrew] = useState<{ id: string; name: string } | null>(null);

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
        .select('*, is_public')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false });

      if (!memberStatus) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setBrews(data || []);

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

  async function deleteBrew(id: string) {
      if (!isMember) return;
      if (!confirm("Möchtest du dieses Rezept wirklich unwiderruflich löschen? \n\nHINWEIS: Alle befüllten Flaschen werden zurückgesetzt (auf 'Leer' gesetzt).")) return;

      const { error: bottlesError } = await supabase.from('bottles').update({ brew_id: null }).eq('brew_id', id);
      if (bottlesError) console.error('Fehler beim Zurücksetzen der Flaschen:', bottlesError);

      const brew = brews.find((b) => b.id === id);
      if (brew?.image_url) {
        try {
            const url = new URL(brew.image_url);
            const fileName = url.pathname.split('/').pop();
            if (fileName) await supabase.storage.from('labels').remove([fileName]);
        } catch (e) {
            console.warn('Konnte Bild-URL nicht parsen:', e);
        }
      }

      const { error } = await supabase.from('brews').delete().eq('id', id);
      if (!error) {
        setBrews(brews.filter((b) => b.id !== id));
      } else {
        alert('Fehler beim Löschen: ' + error.message);
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
  const limitReached = brews.length >= tierConfig.limits.maxBrews;

  return (
    <div className="space-y-6">
      
      {/* Header is handled by layout tabs mostly, but we can add title if needed, leaving raw for now to match dashboard style */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        
        {/* Create Button Card */}
        {isMember && (
            <button
                onClick={() => {
                    if (limitReached) {
                        alert(`Die Brauerei hat das Limit für den ${tierConfig.displayName}-Status erreicht (${tierConfig.limits.maxBrews} Rezepte).`);
                        return;
                    }
                    router.push(`/team/${breweryId}/brews/new`);
                }}
                className={`flex flex-col justify-center items-center gap-4 border-2 border-dashed rounded-3xl p-4 transition group min-h-[400px]
                    ${limitReached 
                        ? 'border-red-500/30 bg-red-950/10 cursor-not-allowed opacity-80' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-cyan-500/50 hover:bg-zinc-900 text-zinc-300'
                    }`}
            >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg transition-transform duration-300 ${limitReached ? 'bg-zinc-800 text-zinc-500' : 'bg-cyan-500 text-black group-hover:scale-110 group-hover:rotate-3'}`}>
                    {limitReached ? '🔒' : '+'}
                </div>
                <div className="text-center space-y-1">
                    <p className={`text-lg font-bold ${limitReached ? 'text-zinc-500' : 'text-white'}`}>Neues Rezept</p>
                    <p className="text-xs text-zinc-500 font-medium tracking-wide">
                        {limitReached 
                            ? `${brews.length} / ${tierConfig.limits.maxBrews} belegt. Upgrade nötig.`
                            : 'Kurz anlegen & Label später bauen.'}
                    </p>
                </div>
            </button>
        )}

        {/* Brew Cards */}
        {brews.map((brew) => (
            <div
                key={brew.id}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-cyan-500/40 transition-all duration-300 shadow-xl flex flex-col"
            >
                {/* Image Section */}
                <div className="aspect-square relative bg-zinc-950 overflow-hidden">
                    {brew.image_url ? (
                        <img
                            src={brew.image_url}
                            alt={brew.name}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-700 bg-zinc-950">
                            <span className="text-4xl mb-2 grayscale opacity-50">🍺</span>
                            <span className="text-xs font-black uppercase tracking-widest opacity-50">Kein Label</span>
                        </div>
                    )}
                    
                    {/* Overlay Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className="bg-black/60 backdrop-blur-md text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 font-bold text-white shadow-lg">
                            {brew.style || 'Standard'}
                        </span>
                        
                        <span className="bg-black/50 backdrop-blur-md text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 font-bold text-zinc-300 shadow-lg">
                            {brew.brew_type === 'beer' ? 'Bier' : brew.brew_type === 'wine' ? 'Wein' : 'Getränk'}
                        </span>
                    </div>

                    {/* Quick Rating Overlay (If Exists) */}
                    {brewRatings[brew.id] && (
                        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur text-amber-400 font-black px-2 py-1 rounded-lg text-xs flex items-center gap-1 border border-white/10 shadow-lg">
                             <span>⭐</span>
                             <span>{brewRatings[brew.id].avg}</span>
                             <span className="text-zinc-500 font-normal">({brewRatings[brew.id].count})</span>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-6 flex flex-col flex-1 gap-4">
                    
                    {/* Title & Actions Row */}
                    <div className="flex items-start justify-between gap-3">
                        <Link
                            href={`/brew/${brew.id}`}
                            className="font-black text-xl leading-tight break-words text-white hover:text-cyan-400 transition"
                        >
                            {brew.name}
                        </Link>
                        
                        {isMember && (
                            <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/80 rounded-lg p-1 border border-zinc-800">
                                <button
                                    onClick={() => toggleVisibility(brew.id, brew.is_public)}
                                    className="p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-cyan-400 transition"
                                    title={brew.is_public ? 'Öffentlich (Verstecken)' : 'Privat (Veröffentlichen)'}
                                >
                                    {brew.is_public ? '👁️' : '🔒'}
                                </button>
                                <button
                                    onClick={() => deleteBrew(brew.id)}
                                    className="p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-red-500 transition"
                                    title="Löschen"
                                >
                                    🗑️
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Meta Data */}
                    <div className="space-y-2 mt-auto">
                        <div className="w-full h-px bg-zinc-800/50"></div>
                        <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                             <span>{new Date(brew.created_at).toLocaleDateString()}</span>
                             <span className={brew.is_public ? 'text-green-500/50' : 'text-zinc-600'}>
                                {brew.is_public ? '● Öffentlich' : '○ Privat'}
                             </span>
                        </div>
                    </div>

                   {/* Main Action Buttons */}
                   {isMember ? (
                       <div className="flex gap-2 pt-2">
                            <Link
                                href={`/team/${breweryId}/brews/${brew.id}/edit`}
                                className="flex-1 bg-white hover:bg-cyan-400 text-black py-3 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                ✏️ Editor
                            </Link>
                            <button
                                onClick={() => {
                                    setSelectedBrew({ id: brew.id, name: brew.name });
                                    setBottlesModalOpen(true);
                                }}
                                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xl font-black transition flex items-center justify-center"
                                title="Flaschen füllen"
                            >
                                🍾
                            </button>
                        </div>
                   ) : (
                        <div className="pt-2">
                             <Link
                                href={`/brew/${brew.id}`}
                                className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl text-sm font-bold text-center transition"
                            >
                                Zum Rezept anzeigen
                            </Link>
                        </div>
                   )}

                </div>
            </div>
        ))}
      </div>

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

