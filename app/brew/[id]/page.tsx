'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getTierConfig, getBreweryTierConfig } from '@/lib/tier-system';

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
        // Auth holen (um eigene private Brews sehen zu können)
        const { data: { user } } = await supabase.auth.getUser();

        // Rezept laden: öffentlich ODER eigenes privates
        let brewQuery = supabase
          .from('brews')
          .select('*')
          .eq('id', id);

        if (user?.id) {
          brewQuery = brewQuery.or(`is_public.eq.true,user_id.eq.${user.id}`);
        } else {
          brewQuery = brewQuery.eq('is_public', true);
        }

        const { data: brewData, error: brewError } = await brewQuery.maybeSingle();

        if (brewError || !brewData) {
          setErrorMsg("Rezept nicht gefunden");
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white">
      
      {/* Hero Section - Profil Layout */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Left: Label Image */}
          <div className="md:col-span-2">
            <div className="relative w-full shadow-2xl rounded-2xl overflow-hidden">
              <div className="aspect-square w-full">
                {brew.image_url ? (
                  <img 
                    src={brew.image_url} 
                    alt={brew.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
                    <span className="text-9xl opacity-20">🍺</span>
                  </div>
                )}
              </div>
              
              {/* Typ-Badge & Original-Badge */}
              <div className="absolute top-6 left-6 flex flex-col gap-2 items-start">
                <span className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
                  {brew.brew_type === 'beer' ? '🍺 Bier' : 
                   brew.brew_type === 'wine' ? '🍷 Wein' : 
                   brew.brew_type === 'cider' ? '🍎 Cider' :
                   brew.brew_type === 'mead' ? '🍯 Met' :
                   brew.brew_type === 'softdrink' ? '🥤 Softdrink' : '🍺'}
                </span>

                {brew.remix_parent_id ? (
                    <span className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-amber-500 text-xs font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
                       ♻️ Remix
                    </span>
                ) : (
                    <span className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-emerald-500 text-xs font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
                       ✓ Original
                    </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Profil Sidebar */}
          <div className="space-y-6">
            
            {/* Brewer Card */}
            {profile && (
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-cyan-500/20 rounded-2xl p-6">
                <p className="text-xs text-cyan-400 uppercase font-black tracking-widest mb-4">Gebraut von</p>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {profile.logo_url ? (
                      <img src={profile.logo_url} className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/30" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl border-2 border-zinc-700">
                        🏭
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-white truncate">{profile.display_name || 'Brauerei'}</h3>
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

            {/* Recipe Title & Rating */}
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-black text-white leading-tight mb-2">{brew.name}</h1>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="inline-block text-cyan-400 text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    {brew.style || 'Handcrafted'}
                  </span>
                </div>
              </div>
              
              {avgRating && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex text-yellow-500 text-2xl">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={parseFloat(avgRating) >= s ? 'opacity-100' : 'opacity-30'}>★</span>
                      ))}
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white">{avgRating}</p>
                      <p className="text-xs text-zinc-400">{ratings.length} {ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-xl border border-zinc-800">
                <p className="text-[9px] text-cyan-400 uppercase font-bold mb-2 tracking-wider">Alkohol</p>
                <p className="font-black text-2xl text-white">{brew.data?.abv ? brew.data.abv + '%' : '-'}</p>
              </div>
              
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-xl border border-zinc-800">
                {(!brew.brew_type || brew.brew_type === 'beer') ? (
                  <>
                    <p className="text-[9px] text-amber-400 uppercase font-bold mb-2 tracking-wider">IBU</p>
                    <p className="font-black text-2xl text-white">{brew.data?.ibu || '-'}</p>
                  </>
                ) : brew.brew_type === 'wine' ? (
                  <>
                    <p className="text-[9px] text-purple-400 uppercase font-bold mb-2 tracking-wider">Säure</p>
                    <p className="font-black text-2xl text-white">{brew.data?.acidity_g_l || '-'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[9px] text-pink-400 uppercase font-bold mb-2 tracking-wider">Zucker</p>
                    <p className="font-black text-2xl text-white">{brew.data?.sugar_g_l || '-'}</p>
                  </>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleRemix}
              disabled={remixLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-3 rounded-xl font-bold transition disabled:opacity-60 shadow-lg"
            >
              {remixLoading ? 'Wird kopiert...' : '♻️ Als Remix übernehmen'}
            </button>
            {remixMessage && (
              <p className="text-xs text-zinc-400 text-center bg-zinc-900/50 p-3 rounded-lg">{remixMessage}</p>
            )}

          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Description */}
        {brew.description && (
          <div className="mb-12 pb-8 border-b border-zinc-800">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-4">Beschreibung</h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap max-w-3xl">{brew.description}</p>
          </div>
        )}

        {/* Remix Credits */}
        {parent && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-12">
            <p className="text-sm text-zinc-400">
              ♻️ Basiert auf
              <Link href={`/brew/${parent.id}`} className="text-cyan-400 font-bold ml-1 hover:underline">{parent.name}</Link>
              {parent.profiles?.display_name && (
                <> von <Link href={`/brewer/${parent.user_id}`} className="text-cyan-400 font-bold hover:underline">{parent.profiles.display_name}</Link></>
              )}
            </p>
          </div>
        )}

        {/* Detailed Recipe Info - TYPE SPECIFIC */}
        {brew.data && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-12 space-y-4">
            <h2 className="text-xs uppercase font-black tracking-[0.3em] text-cyan-400 mb-4">Rezept Details</h2>
            
            {/* BEER Details */}
            {(!brew.brew_type || brew.brew_type === 'beer') && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {brew.data.og && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Original Gravity</p>
                    <p className="text-white font-mono">{brew.data.og}</p>
                  </div>
                )}
                {brew.data.fg && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Final Gravity</p>
                    <p className="text-white font-mono">{brew.data.fg}</p>
                  </div>
                )}
                {brew.data.srm && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Farbe (SRM)</p>
                    <p className="text-white font-mono">{brew.data.srm}</p>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <p className="text-white">{brew.data.yeast}</p>
                  </div>
                )}
                {brew.data.malts && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Malzarten</p>
                    <p className="text-white">{brew.data.malts}</p>
                  </div>
                )}
                {brew.data.hops && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hopfen</p>
                    <p className="text-white">{brew.data.hops}</p>
                  </div>
                )}
                {brew.data.dry_hop_g && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Dry Hop</p>
                    <p className="text-white">{brew.data.dry_hop_g} g</p>
                  </div>
                )}
                {brew.data.boil_minutes && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Kochzeit</p>
                    <p className="text-white">{brew.data.boil_minutes} min</p>
                  </div>
                )}
                {brew.data.mash_temp_c && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Maischetemp.</p>
                    <p className="text-white">{brew.data.mash_temp_c} °C</p>
                  </div>
                )}
              </div>
            )}

            {/* WINE Details */}
            {brew.brew_type === 'wine' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {brew.data.grapes && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Rebsorten</p>
                    <p className="text-white">{brew.data.grapes}</p>
                  </div>
                )}
                {brew.data.region && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Region</p>
                    <p className="text-white">{brew.data.region}</p>
                  </div>
                )}
                {brew.data.vintage && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Jahrgang</p>
                    <p className="text-white">{brew.data.vintage}</p>
                  </div>
                )}
                {brew.data.oak_aged && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Barrique</p>
                    <p className="text-white">
                      {brew.data.oak_months ? `${brew.data.oak_months} Monate im Holzfass` : 'Im Holzfass gereift'}
                    </p>
                  </div>
                )}
                {brew.data.residual_sugar_g_l && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Restzucker</p>
                    <p className="text-white">{brew.data.residual_sugar_g_l} g/L</p>
                  </div>
                )}
                {brew.data.sulfites && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hinweis</p>
                    <p className="text-white">Enthält Sulfite</p>
                  </div>
                )}
              </div>
            )}

            {/* CIDER Details */}
            {brew.brew_type === 'cider' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {brew.data.apples && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Apfelsorten</p>
                    <p className="text-white">{brew.data.apples}</p>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <p className="text-white">{brew.data.yeast}</p>
                  </div>
                )}
                {brew.data.fermentation && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Gärung</p>
                    <p className="text-white capitalize">{brew.data.fermentation === 'wild' ? 'Wild' : 'Reinzucht'}</p>
                  </div>
                )}
                {brew.data.sweetness && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Süßegrad</p>
                    <p className="text-white capitalize">
                      {brew.data.sweetness === 'dry' ? 'Trocken' : brew.data.sweetness === 'semi' ? 'Halbtrocken' : 'Süß'}
                    </p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Kohlensäure</p>
                    <p className="text-white">{brew.data.carbonation_g_l} g/L</p>
                  </div>
                )}
                {brew.data.pH && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">pH-Wert</p>
                    <p className="text-white">{brew.data.pH}</p>
                  </div>
                )}
              </div>
            )}

            {/* MEAD Details */}
            {brew.brew_type === 'mead' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {brew.data.honey && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Honigsorten</p>
                    <p className="text-white">{brew.data.honey}</p>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <p className="text-white">{brew.data.yeast}</p>
                  </div>
                )}
                {brew.data.adjuncts && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Zutaten</p>
                    <p className="text-white">{brew.data.adjuncts}</p>
                  </div>
                )}
                {brew.data.aging_months && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Reifung</p>
                    <p className="text-white">{brew.data.aging_months} Monate</p>
                  </div>
                )}
                {brew.data.final_gravity && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Final Gravity</p>
                    <p className="text-white font-mono">{brew.data.final_gravity}</p>
                  </div>
                )}
              </div>
            )}

            {/* SOFTDRINK Details */}
            {brew.brew_type === 'softdrink' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {brew.data.base && (
                  <div className="space-y-1 col-span-2 md:col-span-3">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Basis / Geschmack</p>
                    <p className="text-white">{brew.data.base}</p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Kohlensäure</p>
                    <p className="text-white">{brew.data.carbonation_g_l} g/L</p>
                  </div>
                )}
                {brew.data.acidity_ph && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">pH-Wert</p>
                    <p className="text-white">{brew.data.acidity_ph}</p>
                  </div>
                )}
                {brew.data.natural_flavors && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Aromen</p>
                    <p className="text-white">Natürliche Aromen</p>
                  </div>
                )}
                {brew.data.coloring && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hinweis</p>
                    <p className="text-white">Mit Farbstoff</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ratings */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-4">Bewertungen ({ratings.length})</h2>
          
          {ratings.length === 0 ? (
            <div className="text-center p-12 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 text-lg">Noch keine Bewertungen vorhanden.</p>
              <p className="text-sm text-zinc-600 mt-2">Sei der Erste, der dieses Rezept bewertet!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {rating.name ? rating.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="font-bold text-white">{rating.name || 'Anonym'}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(rating.created_at).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex text-yellow-500">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={rating.rating >= s ? 'opacity-100' : 'opacity-30'}>★</span>
                        ))}
                      </div>
                      <span className="text-xl font-bold text-white">{rating.rating}</span>
                    </div>
                  </div>
                  
                  {rating.comment && (
                    <p className="text-zinc-300 leading-relaxed">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center pt-8 mt-12 border-t border-zinc-800">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition mt-8"
          >
            ← Zurück zur Startseite
          </Link>
        </div>

      </div>
    </div>
  );
}
