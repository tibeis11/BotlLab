'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getTierConfig, getBreweryTierConfig } from '@/lib/tier-system';
import Logo from '@/app/components/Logo';

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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
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
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Gebraut von</p>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {profile.logo_url ? (
                      <img src={profile.logo_url} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700">
                        🏭
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{profile.display_name || 'Brauerei'}</h3>
                    {profile.location && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">📍 {profile.location}</p>
                    )}
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-xs text-zinc-400 leading-relaxed mt-4 line-clamp-3">{profile.bio}</p>
                )}
              </div>
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
                <div className="py-8 border-t border-zinc-800/50">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">Technische Details</h3>
                    {/* Reuse existing blocks but with adjusted styling if needed. Keeping original logic structure */}
                    
                    {/* BEER Details */}
                    {(!brew.brew_type || brew.brew_type === 'beer') && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                        {brew.data.og && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Stammwürze (OG)</p><p className="text-white font-mono">{brew.data.og}</p></div>)}
                        {brew.data.fg && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Restextrakt (FG)</p><p className="text-white font-mono">{brew.data.fg}</p></div>)}
                        {brew.data.est_abv && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Est. ABV</p><p className="text-white font-mono">{brew.data.est_abv}%</p></div>)}
                        {brew.data.yeast && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Hefe</p><p className="text-white">{brew.data.yeast}</p></div>)}
                        {brew.data.boil_minutes && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Kochzeit</p><p className="text-white">{brew.data.boil_minutes} min</p></div>)}
                        {brew.data.mash_temp_c && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Maische</p><p className="text-white">{brew.data.mash_temp_c} °C</p></div>)}
                        
                        {brew.data.malts && (<div className="col-span-2 md:col-span-3 pt-4 border-t border-zinc-800/50"><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Malz & Getreide</p><p className="text-zinc-300">{brew.data.malts}</p></div>)}
                        {brew.data.hops && (<div className="col-span-2 md:col-span-3"><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Hopfen</p><p className="text-zinc-300">{brew.data.hops}</p></div>)}
                      </div>
                    )}
                    
                    {/* Other types logic (simplified for brevity using same pattern) */}
                    {brew.brew_type !== 'beer' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                            {Object.entries(brew.data).map(([k, v]) => {
                                if (['abv', 'ibu', 'name'].includes(k) || !v) return null;
                                let label = k.replace(/_/g, ' ');
                                if (k === 'vintage') label = 'Jahrgang';
                                if (k === 'varietal') label = 'Rebsorte';
                                if (k === 'sugar_g_l') label = 'Restsüße';
                                if (k === 'acidity_g_l') label = 'Säure';

                                return (
                                    <div key={k} className="overflow-hidden">
                                        <p className="text-zinc-600 text-[10px] uppercase font-bold mb-1 truncate">{label}</p>
                                        <p className="text-white truncate">{String(v)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Ratings Section */}
            <div className="py-8 border-t border-zinc-800/50">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">Community Feedback ({ratings.length})</h3>
              
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
