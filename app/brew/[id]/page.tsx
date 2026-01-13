'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getTierConfig, getBreweryTierConfig } from '@/lib/tier-system';
import Header from '@/app/components/Header';
import Logo from '@/app/components/Logo';

// Helper Component for Ingredients
function IngredientView({ value }: { value: any }) {
  if (!value) return <span className="text-zinc-500">–</span>;
  
  // Legacy String Support
  if (typeof value === 'string') {
    return <p className="text-sm text-zinc-300 font-medium leading-relaxed">{value}</p>;
  }
  
  // Structured Support
  if (Array.isArray(value)) {
     return (
       <ul className="space-y-2">
         {value.map((item: any, i: number) => (
            <li key={i} className="flex justify-between items-baseline text-sm border-b border-zinc-800/50 pb-2 last:border-0 border-dashed last:pb-0">
               <span className="text-zinc-300 font-medium">{item.name}</span>
               <span className="text-zinc-500 font-mono text-xs whitespace-nowrap ml-4 flex items-baseline gap-1">
                 {item.amount && <span className="text-white font-bold">{item.amount}</span>} 
                 {item.unit && <span className="opacity-70">{item.unit}</span>}
               </span>
            </li>
         ))}
       </ul>
     );
  }
  
  return null;
}

export default function BrewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [brew, setBrew] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [bottles, setBottles] = useState<any[]>([]);
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [remixLoading, setRemixLoading] = useState(false);
  const [remixMessage, setRemixMessage] = useState<string | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleRemix() {
    setRemixMessage(null);
    setRemixLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRemixLoading(false);
      router.push(`/login?redirect=/brew/${id}`);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle();

    const { data: myBrews } = await supabase
      .from('brews')
      .select('id')
      .eq('user_id', user.id);

    const tierConfig = getTierConfig(profileData?.tier || 'lehrling');
    
    // Limits are now on Team/Brewery level, not User.
    // For individual "Remix" actions into a personal context (if supported), we should check the target brewery limit.
    // However, since we now strictly create brews inside a Brewery Context, this "Remix to Personal" flow needs adjustment.
    // For now, removing the user-level limit check as it no longer exists on ReputationLevelConfig.
    
    // Use first brewery if available or force user to pick one
    const { data: member } = await supabase.from('brewery_members').select('brewery_id').eq('user_id', user.id).limit(1).maybeSingle();
    
    if (!member) {
        setRemixMessage("Du musst Mitglied einer Brauerei sein, um Rezepte zu remixen.");
        setRemixLoading(false);
        return;
    }
    
    // Check Brewery Limits
    const { data: brewery } = await supabase.from('breweries').select('tier').eq('id', member.brewery_id).single();
    const { data: brews } = await supabase.from('brews').select('id', { count: 'exact', head: true }).eq('brewery_id', member.brewery_id);
    
    const breweryTierConfig = getBreweryTierConfig((brewery?.tier || 'garage') as any);
    
    if ((brews?.length || 0) >= breweryTierConfig.limits.maxBrews) {
         setRemixMessage(`Brauerei-Limit erreicht: ${breweryTierConfig.displayName} erlaubt maximal ${breweryTierConfig.limits.maxBrews} Rezepte.`);
         setRemixLoading(false);
         return;
    }

    const payload = {
      name: `${brew.name} (Remix)`,
      style: brew.style || '',
      description: brew.description || '',
      brew_type: brew.brew_type || 'beer',
      data: brew.data || {},
      image_url: brew.image_url || null,
      is_public: false,
      user_id: user.id,
      brewery_id: member.brewery_id,
      remix_parent_id: brew.id,
    };

    const { error } = await supabase
      .from('brews')
      .insert([payload]);

    if (error) {
      setRemixMessage(error.message || 'Konnte Remix nicht anlegen.');
      setRemixLoading(false);
      return;
    }

    setRemixLoading(false);
    router.push('/dashboard');
  }

  useEffect(() => {
    async function fetchBrewInfo() {
      try {
        // Auth holen
        const { data: { user } } = await supabase.auth.getUser();

        // Rezept laden (RLS kümmert sich um harte DB-Security, hier prüfen wir Logik)
        const { data: brewData, error: brewError } = await supabase
          .from('brews')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (brewError || !brewData) {
          setErrorMsg("Rezept nicht gefunden");
          setLoading(false);
          return;
        }

        // Access Control Logic
        // 1. Öffentlich? -> OK
        // 2. Ersteller? -> OK
        // 3. Brauerei-Mitglied? -> OK (bei Team-Brews)
        let hasAccess = brewData.is_public;
        
        if (!hasAccess) {
             if (user && brewData.user_id === user.id) {
                 hasAccess = true;
             } else if (user && brewData.brewery_id) {
                 const { data: member } = await supabase
                    .from('brewery_members')
                    .select('id')
                    .eq('brewery_id', brewData.brewery_id)
                    .eq('user_id', user.id)
                    .maybeSingle();
                 if (member) hasAccess = true;
             }
        }

        if (!hasAccess) {
            setErrorMsg("Dieses Rezept ist privat und nur für Team-Mitglieder sichtbar.");
            setLoading(false);
            return;
        }

        setBrew(brewData);

        // Logic Switch: Team vs Personal
        if (brewData.brewery_id) {
             const { data: breweryData } = await supabase
              .from('breweries')
              .select('id, name, description, logo_url') 
              .eq('id', brewData.brewery_id)
              .maybeSingle();

             if (breweryData) {
                 setProfile({
                     id: breweryData.id,
                     display_name: breweryData.name,
                     logo_url: breweryData.logo_url,
                     bio: breweryData.description,
                     location: null
                 });
             }
        } else {
            // Profile laden (Personal)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, display_name, location, bio, logo_url, tier')
              .eq('id', brewData.user_id)
              .maybeSingle();
            setProfile(profileData);
        }

        // Parent laden (wenn Remix)
        if (brewData.remix_parent_id) {
          const { data: parentData } = await supabase
            .from('brews')
            .select('id, name, user_id, profiles!inner(display_name)')
            .eq('id', brewData.remix_parent_id)
            .maybeSingle();
          setParent(parentData);
        }

        // Ratings laden
        const { data: ratingData } = await supabase
          .from('ratings')
          .select('*')
          .eq('brew_id', brewData.id)
          .order('created_at', { ascending: false });
        setRatings(ratingData || []);

        // Bottles laden
        const { data: bottleData } = await supabase
          .from('bottles')
          .select('id, bottle_number')
          .eq('brew_id', brewData.id)
          .order('bottle_number');
        setBottles(bottleData || []);

        setLoading(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Fehler beim Laden");
        setLoading(false);
      }
    }

    fetchBrewInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍺</div>
          <p className="text-zinc-500">Lade Rezept...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !brew) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Rezept nicht gefunden</h1>
          <p className="text-zinc-500 mb-6">{errorMsg || "Dieses Rezept existiert nicht oder wurde gelöscht."}</p>
          <Link href="/" className="text-cyan-500 hover:underline">← Zurück zur Startseite</Link>
        </div>
      </div>
    );
  }

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* --- LEFT COLUMN: Image & Actions (4 cols) --- */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
             {/* Image Card */}
             <div className="relative w-full shadow-2xl rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-square">
                {brew.image_url ? (
                  <img 
                    src={brew.image_url} 
                    alt={brew.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
                    <span className="text-8xl opacity-20">🍺</span>
                  </div>
                )}
                
                {/* Badges Overlay */}
             </div>

             {/* Action Button */}
             <button
              onClick={handleRemix}
              disabled={remixLoading}
              className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="relative h-full w-full bg-zinc-950/40 group-hover:bg-transparent transition-colors rounded-2xl py-4 flex items-center justify-center gap-3 backdrop-blur-sm">
                 <span className="font-black text-white uppercase tracking-widest text-sm drop-shadow-md">
                    {remixLoading ? 'Wird kopiert...' : 'Rezept remixen'}
                 </span>
              </div>
            </button>
            {remixMessage && (
              <p className="text-xs text-red-400 text-center bg-red-950/20 border border-red-900/30 p-3 rounded-xl">{remixMessage}</p>
            )}

             {/* Brewer Card */}
             {profile && (
              <Link href={brew.brewery_id ? `/brewery/${brew.brewery_id}` : `/brewer/${brew.user_id}`}  className="block">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition group hover:bg-zinc-900 cursor-pointer">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3 group-hover:text-cyan-400 transition-colors">Gebraut von</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {profile.logo_url ? (
                        <img src={profile.logo_url} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700">
                          {brew.brewery_id ? '🏰' : '👤'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{profile.display_name || 'Brauerei'}</h3>
                      {profile.location && (
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">📍 {profile.location}</p>
                      )}
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-xs text-zinc-400 leading-relaxed mt-4 line-clamp-3">{profile.bio}</p>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* --- RIGHT COLUMN: Content (8 cols) --- */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2 shadow-sm">
                        {brew.brew_type === 'beer' ? 'Bier' : 
                         brew.brew_type === 'wine' ? 'Wein' : 
                         brew.brew_type === 'cider' ? 'Cider' :
                         brew.brew_type === 'mead' ? 'Met' :
                         brew.brew_type === 'softdrink' ? 'Softdrink' : 'Bier'}
                    </span>
                    {brew.remix_parent_id && (
                        <span className="text-purple-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-purple-950/30 border border-purple-500/20 shadow-sm shadow-purple-900/20 flex items-center gap-2">
                            Remix
                        </span>
                    )}
                    <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                        {brew.style || 'Handcrafted'}
                    </span>
                    <span className="text-zinc-600 text-xs font-bold px-2 py-1 ml-auto md:ml-0 rounded-lg bg-zinc-900/0 border border-transparent">
                        {new Date(brew.created_at).toLocaleDateString()}
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">{brew.name}</h1>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {/* Rating */}
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                    <div className="text-amber-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Bewertung</div>
                    <div className="font-black text-3xl text-white flex items-baseline gap-1">
                        {avgRating || '-'} <span className="text-xs text-zinc-600 font-bold self-end mb-1">({ratings.length})</span>
                    </div>
                 </div>

                 {/* ABV */}
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                    <div className="text-cyan-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Alkohol</div>
                    <div className="font-black text-3xl text-white">{brew.data?.abv ? brew.data.abv + '%' : '-'}</div>
                 </div>
                 
                 {/* Type Specific KPI 1 */}
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                     {(!brew.brew_type || brew.brew_type === 'beer') ? (
                         <>
                            <div className="text-emerald-500 text-[10px] uppercase font-bold mb-1 tracking-wider">IBU</div>
                            <div className="font-black text-3xl text-white">{brew.data?.ibu || '-'}</div>
                         </>
                     ) : brew.brew_type === 'wine' ? (
                        <>
                            <div className="text-purple-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Säure</div>
                            <div className="font-black text-3xl text-white">{brew.data?.acidity_g_l || '-'}</div>
                        </>
                     ) : (
                         <>
                             <div className="text-pink-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Zucker</div>
                             <div className="font-black text-3xl text-white">{brew.data?.sugar_g_l || '-'}</div>
                         </>
                     )}
                 </div>

                 {/* Type Specific KPI 2 (Default Gravity or Other) */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                     {(!brew.brew_type || brew.brew_type === 'beer') ? (
                         <>
                            <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Farbe (SRM)</div>
                            <div className="font-black text-3xl text-white">{brew.data?.srm || '-'}</div>
                         </>
                     ) : (
                        <>
                            <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Jahrgang</div>
                            <div className="font-black text-xl text-white truncate text-ellipsis overflow-hidden">
                                {brew.data?.vintage || '-'}
                            </div>
                        </>
                     )}
                 </div>
            </div>

            {/* Description */}
            {brew.description && (
                <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap font-medium">{brew.description}</p>
                </div>
            )}
            
            {/* Remix Source */}
            {parent && (
              <div className="bg-zinc-900/30 border border-purple-900/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-xl">♻️</div>
                <div className="text-sm text-zinc-400">
                  <p className="font-bold text-zinc-300">Remix Abstammung</p>
                  <p>
                    Basiert auf <Link href={`/brew/${parent.id}`} className="text-purple-400 hover:text-purple-300 transition underline decoration-purple-400/30">{parent.name}</Link>
                    {parent.profiles?.display_name && (
                        <> von <Link href={`/brewer/${parent.user_id}`} className="text-zinc-300 hover:underline">{parent.profiles.display_name}</Link></>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Technical Specs */}
             {brew.data && (
                <div className="py-10 border-t border-zinc-800/50">
                    <div className="flex items-center gap-4 mb-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Technische Details</h3>
                        <div className="h-px bg-zinc-800 flex-1"></div>
                    </div>
                    
                    {/* Head Stats: Universal */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center justify-center min-h-[100px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Menge</span>
                            <span className="text-2xl font-black text-white">{brew.data.batch_size_liters || '-'} <span className="text-sm font-bold text-zinc-600">L</span></span>
                        </div>
                         <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center justify-center min-h-[100px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Brautag</span>
                            <span className="text-xl font-bold text-white max-w-full truncate">{brew.data.brewed_at ? new Date(brew.data.brewed_at).toLocaleDateString() : '-'}</span>
                        </div>
                        <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center justify-center min-h-[100px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Ausbeute</span>
                            <span className="text-2xl font-black text-white">{brew.data.efficiency || '-'} <span className="text-sm font-bold text-zinc-600">%</span></span>
                        </div>
                         <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl p-4 border border-cyan-500/20 flex flex-col items-center text-center justify-center min-h-[100px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">Alkohol (ABV)</span>
                            <span className="text-2xl font-black text-white">{brew.data.abv || brew.data.est_abv || '-'} <span className="text-sm font-bold text-zinc-600">%</span></span>
                        </div>
                    </div>

                    {/* BEER Structure */}
                    {(!brew.brew_type || brew.brew_type === 'beer') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Column 1: Ingredients */}
                         <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 h-full">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                <span>🌾</span> Zutaten
                            </h4>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Malz & Getreide</p>
                                    <IngredientView value={brew.data.malts} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Hopfen</p>
                                    <IngredientView value={brew.data.hops} />
                                    {brew.data.dry_hop_g && brew.data.dry_hop_g > 0 && (
                                        <div className="mt-2 text-xs text-emerald-400 bg-emerald-950/20 inline-block px-2 py-1 rounded border border-emerald-900/30">
                                            + {brew.data.dry_hop_g}g Dry Hop
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Hefe</p>
                                    <p className="text-sm text-white font-medium">{brew.data.yeast || '–'}</p>
                                </div>
                            </div>
                         </div>

                         {/* Column 2: Specs & Process */}
                         <div className="space-y-4">
                             {/* Stats Grid */}
                            <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                    <span>📊</span> Messwerte
                                </h4>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Stammwürze</p><p className="text-white font-mono text-lg">{brew.data.og || '-'} °P</p></div>
                                    <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Restextrakt</p><p className="text-white font-mono text-lg">{brew.data.fg || '-'} °P</p></div>
                                    <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Bittere</p><p className="text-white font-mono text-lg">{brew.data.ibu || '-'} IBU</p></div>
                                    <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Farbe</p><p className="text-white font-mono text-lg">{brew.data.color || '-'} EBC</p></div>
                                </div>
                            </div>
                            
                            {/* Process Info */}
                            <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                    <span>🔥</span> Prozess
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                                         <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Kochzeit</p>
                                         <p className="text-white font-mono font-bold">{brew.data.boil_time || brew.data.boil_minutes || 60} min</p>
                                     </div>
                                     <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                                         <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Maischetemp</p>
                                         <p className="text-white font-mono font-bold">{brew.data.mash_temp || brew.data.mash_temp_c || '-'} °C</p>
                                     </div>
                                </div>
                            </div>
                         </div>
                      </div>
                    )}
                    
                    {/* WINE Structure */}
                    {brew.brew_type === 'wine' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 h-full">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                    <span>🍇</span> Reben & Terroir
                                </h4>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Rebsorten</p>
                                        <p className="text-lg text-white font-bold leading-relaxed">{brew.data.grapes || '–'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Region</p>
                                        <p className="text-zinc-300 font-medium">{brew.data.region || '–'}</p>
                                    </div>
                                    <div>
                                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Jahrgang</p>
                                         <p className="text-white font-mono">{brew.data.vintage || '–'}</p>
                                    </div>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>🍷</span> Ausbau & Balance
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Restzucker</p><p className="text-white font-mono text-lg">{brew.data.residual_sugar_g_l || '-'} g/l</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Säure</p><p className="text-white font-mono text-lg">{brew.data.acidity_g_l || '-'} g/l</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Start-Dichte</p><p className="text-white font-mono text-lg">{brew.data.original_gravity || '-'} °Oe</p></div>
                                         <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Fasslager</p><p className="text-white font-mono text-lg">{brew.data.oak_months || '0'} M</p></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {brew.data.oak_aged && <span className="px-3 py-1.5 bg-amber-950/40 text-amber-500 border border-amber-900/50 rounded-lg text-xs font-bold uppercase tracking-wider">Barrique</span>}
                                        {brew.data.sulfites && <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider">Enthält Sulfite</span>}
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    {/* MEAD Structure */}
                    {brew.brew_type === 'mead' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 h-full">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                    <span>🍯</span> Zutaten
                                </h4>
                                <div className="space-y-6">
                                     <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Honig & Zusätze</p>
                                        <p className="text-lg text-white font-bold leading-relaxed">{brew.data.honey || '–'}</p>
                                        {brew.data.adjuncts && <p className="text-sm text-zinc-400 mt-2">+ {brew.data.adjuncts}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Hefe</p>
                                        <p className="text-sm text-white font-medium">{brew.data.yeast || '–'}</p>
                                    </div>
                                </div>
                             </div>
                             
                             <div className="space-y-4">
                                 <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                     <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>📊</span> Metrics
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">OG (Start)</p><p className="text-white font-mono text-lg">{brew.data.original_gravity || '-'} SG</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">FG (End)</p><p className="text-white font-mono text-lg">{brew.data.final_gravity || '-'} SG</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Reifezeit</p><p className="text-white font-mono text-lg">{brew.data.aging_months || '0'} M</p></div>
                                    </div>
                                 </div>
                                 {brew.data.nutrient_schedule && (
                                     <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                                            <span>💊</span> Nährstoffplan
                                        </h4>
                                        <p className="text-zinc-300 font-mono text-xs whitespace-pre-wrap">{brew.data.nutrient_schedule}</p>
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}
                    
                    {/* CIDER & SOFTDRINK Structure (Simplified) */}
                    {(brew.brew_type === 'cider' || brew.brew_type === 'softdrink') && (
                        <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                 <div>
                                      <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>🍎</span> Zutaten
                                    </h4>
                                    <div className="space-y-6">
                                        {brew.data.apples && (<div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Apfelsorten</p><p className="text-lg text-white font-bold">{brew.data.apples}</p></div>)}
                                        {brew.data.base && (<div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Basis</p><p className="text-lg text-white font-bold">{brew.data.base}</p></div>)}
                                        {brew.data.yeast && (<div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Hefe</p><p className="text-zinc-300">{brew.data.yeast}</p></div>)}
                                    </div>
                                 </div>
                                 <div>
                                     <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>📊</span> Werte
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                         {brew.data.original_gravity && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Start-Dichte</p><p className="text-white font-mono text-lg">{brew.data.original_gravity}</p></div>)}
                                         {brew.data.carbonation_g_l && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Karbonisierung</p><p className="text-white font-mono text-lg">{brew.data.carbonation_g_l} g/l</p></div>)}
                                         {brew.data.pH && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">pH</p><p className="text-white font-mono text-lg">{brew.data.pH}</p></div>)}
                                         {brew.data.sugar_g_l && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Zucker</p><p className="text-white font-mono text-lg">{brew.data.sugar_g_l} g/l</p></div>)}
                                         {brew.data.sweetness && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Süße</p><p className="text-white capitalize text-lg">{brew.data.sweetness}</p></div>)}
                                    </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* Recipe Steps / Instructions */}
                    {brew.data.steps && brew.data.steps.length > 0 && (
                        <div className="py-10 border-t border-zinc-800/50">
                             <div className="flex items-center gap-4 mb-8">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Brauanleitung</h3>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                            </div>
                            
                            <div className="relative border-l border-zinc-800 ml-3 space-y-8 py-2">
                                {brew.data.steps.map((step: any, idx: number) => (
                                    <div key={idx} className="relative pl-8">
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-900 border border-cyan-500"></div>
                                        <div className="bg-zinc-900/40 rounded-xl p-5 border border-zinc-800/80">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-black text-cyan-500 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50 uppercase tracking-wider">Schritt {idx + 1}</span>
                                            </div>
                                            <p className="text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">{step.instruction}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generic Notes Field for Everyone - Footer Style */}
                    {brew.data.notes && (
                         <div className="mt-10 pt-8 border-t border-zinc-800/50">
                             <div className="flex flex-col md:flex-row gap-6 items-start">
                                 <div className="md:w-48 flex-shrink-0">
                                     <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                        <span>📝</span> Notizen
                                     </h4>
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed text-sm font-mono">{brew.data.notes}</p>
                                 </div>
                             </div>
                         </div>
                    )}
                </div>
            )}

            {/* Ratings Section */}
            <div className="py-8 border-t border-zinc-800/50">
               <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Community Feedback ({ratings.length})</h3>
                  <div className="h-px bg-zinc-800 flex-1"></div>
               </div>
              
              {ratings.length === 0 ? (
                <div className="bg-zinc-900/30 rounded-2xl p-8 border border-dashed border-zinc-800 text-center">
                  <p className="text-zinc-500">Bisher keine Bewertungen.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ratings.map((rating) => (
                    <div key={rating.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs">{(rating.author_name || '?')[0]}</div>
                           <div>
                                <p className="font-bold text-sm text-white">{rating.author_name || 'Gast'}</p>
                                <p className="text-[10px] text-zinc-500">{new Date(rating.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="flex text-amber-500 text-xs gap-0.5">
                            {[1,2,3,4,5].map(s => <span key={s} className={rating.rating >= s ? 'opacity-100' : 'opacity-20 '}>★</span>)}
                        </div>
                      </div>
                      {rating.comment && <p className="text-zinc-400 text-sm pl-11">{rating.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          
          </div>
        </div>
      </div>

      <footer className="pt-12 pb-6 text-center opacity-40 hover:opacity-100 transition-opacity duration-500 flex flex-col items-center">
        <div className="mb-2">
            <Logo className="w-5 h-5" textSize="text-xs" />
        </div>
        <p className="text-[9px] text-zinc-700 font-medium">Digital Brew Lab</p>
        <div className="mt-4">
            <Link href="/impressum" className="text-[10px] text-zinc-600 hover:text-zinc-400 hover:underline transition">
              Impressum
            </Link>
        </div>
        <p className="text-[8px] text-zinc-800 mt-2 font-mono">{id}</p>
      </footer>
    </div>
  );
}
