'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { checkAndGrantAchievements } from '@/lib/achievements';

export default function PublicScanPage() {
  const params = useParams();
  const id = params?.id as string; 
  
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rating States
  const [ratings, setRatings] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState({
    rating: 0,
    comment: '',
    author_name: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);

  // Bot Protection
  const [honeypot, setHoneypot] = useState('');
  const [formStartTime, setFormStartTime] = useState<number>(0);

  // Supabase singleton imported


  useEffect(() => {
    async function fetchBottleInfo() {
      if (!id) return;
      
      console.log("Fetching bottle:", id);

      // IP-Adresse abrufen
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        setUserIp(ipData.ip);
        console.log('User IP:', ipData.ip);
      } catch (err) {
        console.warn('Could not fetch IP:', err);
      }

      // Zunächst die Flasche laden mit der brew_id
      const { data: bottle, error: bottleError } = await supabase
        .from('bottles')
        .select('id, bottle_number, brew_id')
        .eq('id', id)
        .maybeSingle();

      if (bottleError) {
        console.error("Supabase Error (bottle):", bottleError);
        setErrorMsg(bottleError.message);
        setLoading(false);
        return;
      }

      console.log("Bottle loaded:", bottle);

      if (!bottle) {
        setErrorMsg("Flasche nicht gefunden");
        setLoading(false);
        return;
      }

      if (!bottle.brew_id) {
        console.warn("⚠️ Flasche hat keine brew_id!");
        setData(bottle);
        setLoading(false);
        return;
      }

      // Jetzt das Rezept laden
      const { data: brew, error: brewError } = await supabase
        .from('brews')
        .select(`
          id,
          name,
          style,
          image_url,
          created_at,
          user_id,
          description,
          brew_type,
          data,
          remix_parent_id
        `)
        .eq('id', bottle.brew_id)
        .maybeSingle();

      if (brewError) {
        console.error("Supabase Error (brew):", brewError);
      }

      console.log("Brew loaded:", brew);
      setData(bottle ? { ...bottle, brews: brew } : null);

      // Falls wir einen User (Brauer) haben, laden wir dessen Profil
      if (brew?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', brew.user_id)
          .maybeSingle();
        setProfile(profileData);

        // Profile View zählen
        await supabase
          .from('profiles')
          .update({ total_profile_views: (profileData?.total_profile_views || 0) + 1 })
          .eq('id', brew.user_id);
      }

      // Ratings laden (wenn brew vorhanden)
      if (brew?.id) {
        console.log("Loading ratings for brew:", brew.id);
        loadRatings(brew.id);
      }

      setLoading(false);
    }

    fetchBottleInfo();
  }, [id]);

  useEffect(() => {
    if (showRatingForm) {
      setFormStartTime(Date.now());
    }
  }, [showRatingForm]);

  async function loadRatings(brewId: string) {
    const { data: ratingsData } = await supabase
      .from('ratings')
      .select('*')
      .eq('brew_id', brewId)
      .eq('moderation_status', 'auto_approved')
      .order('created_at', { ascending: false });
    
    if (ratingsData) {
      setRatings(ratingsData);
      if (ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    }

    // Checken ob dieser Nutzer (IP) bereits eine Bewertung hat
    if (userIp) {
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('brew_id', brewId)
        .eq('ip_address', userIp)
        .maybeSingle();
      
      setHasAlreadyRated(!!existingRating);
      if (existingRating) {
        console.log('User hat bereits bewertet');
      }
    }
  }

  async function submitRating() {
    console.log('submitRating called', { newRating, data, userIp });
    
    // Bot Protection Check
    if (honeypot) {
      console.warn('Bot detected: Honeypot filled');
      // Fake success
      setNewRating({ rating: 0, comment: '', author_name: '' });
      setShowRatingForm(false);
      return;
    }

    if (Date.now() - formStartTime < 1000) {
      console.warn('Bot detected: Too fast');
      alert('Das ging zu schnell. Bist du ein Mensch? 🤖');
      return;
    }

    if (!newRating.rating) {
      console.warn('Keine Sterne gesetzt');
      alert('Bitte Sterne auswählen!');
      return;
    }
    
    if (!newRating.author_name || !newRating.author_name.trim()) {
      console.warn('Kein Name eingegeben');
      alert('Bitte einen Namen eingeben!');
      return;
    }

    if (hasAlreadyRated) {
      alert('Du hast bereits eine Bewertung für dieses Rezept eingegeben! 🚫');
      return;
    }

    // FIX: Brew-ID korrekt abrufen
    const brewId = data?.brews?.id;
    console.log('Brew-ID:', brewId, 'Data structure:', data);

    if (!brewId) {
      console.warn('Keine Brew-ID vorhanden', { data });
      alert('Fehler: Rezept nicht geladen. Bitte Seite neu laden.');
      return;
    }

    if (!userIp) {
      alert('Fehler: IP-Adresse konnte nicht ermittelt werden');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Sende Rating:', {
        brew_id: brewId,
        rating: newRating.rating,
        comment: newRating.comment.trim() || null,
        author_name: newRating.author_name.trim(),
        ip_address: userIp
      });

      const { data: insertedData, error } = await supabase
        .from('ratings')
        .insert([{
          brew_id: brewId,
          rating: newRating.rating,
          comment: newRating.comment.trim() || null,
          author_name: newRating.author_name.trim(),
          ip_address: userIp,
          moderation_status: 'auto_approved'
        }]);

      if (error) {
        console.error('Supabase Error:', error);
        // Check if it's a unique constraint violation (doppelte Bewertung)
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          alert('Du hast bereits eine Bewertung für dieses Rezept eingegeben! 🚫');
          setHasAlreadyRated(true);
        } else {
          alert('Fehler: ' + error.message);
        }
      } else {
        console.log('Rating erfolgreich eingefügt:', insertedData);
        setNewRating({ rating: 0, comment: '', author_name: '' });
        setShowRatingForm(false);
        setHasAlreadyRated(true);
        await loadRatings(brewId);
        alert('Danke für deine Bewertung! ⭐');
        
        // Achievements im Hintergrund prüfen (für den Brew-Besitzer)
        if (data?.brews?.user_id) {
          checkAndGrantAchievements(data.brews.user_id).catch(console.error);
        }
      }
    } catch (err: any) {
      console.error('Exception:', err);
      alert('Ein Fehler ist aufgetreten: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-6">🔍</span>
        <h1 className="text-2xl font-bold">Unbekannte ID</h1>
        <p className="text-zinc-500 mt-2">Diese Flasche existiert nicht in unserer Datenbank.</p>
        {errorMsg && <p className="text-red-500 text-xs mt-4 font-mono">{errorMsg}</p>}
        <p className="text-zinc-700 text-xs mt-4 font-mono">ID: {id}</p>
      </div>
    );
  }

  if (!data.brews) {
     return (
       <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
         <span className="text-6xl mb-6">🫙</span>
         <h1 className="text-2xl font-bold">Flasche ist leer</h1>
         <p className="text-zinc-500 mt-2">Bottle #{data.bottle_number} ist aktuell keinem Rezept zugewiesen.</p>
         <p className="text-zinc-600 text-sm mt-4">Bitte den Braumeister kontaktieren!</p>
       </div>
     );
  }

  const brew = data.brews;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white font-sans">
      {/* 1. Das KI-Label als Hero-Bild - GRÖSSER */}
      <div className="relative w-full max-w-2xl mx-auto overflow-hidden">
        <div className="aspect-square w-full shadow-2xl">
          {brew.image_url ? (
            <img 
              src={brew.image_url} 
              alt={brew.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center border-b border-zinc-800">
              <span className="text-9xl opacity-20">🍺</span>
            </div>
          )}
        </div>
        {/* Badges */}
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

      {/* 2. Content Container */}
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <span className="inline-block text-cyan-400 text-xs font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            {brew.style || 'Handcrafted'}
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {brew.name}
          </h1>
          {brew.description && (
            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl mx-auto italic">
              {brew.description}
            </p>
          )}
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

        {/* Stats Grid - Prominenter */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg">
            <p className="text-[10px] text-cyan-400 uppercase font-bold mb-2 tracking-wider">Alkohol</p>
            <p className="font-black text-3xl text-white tracking-tight">{brew.data?.abv ? brew.data.abv + '%' : '0.0%'}</p>
          </div>
          
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg">
            {(!brew.brew_type || brew.brew_type === 'beer') ? (
              <>
                <p className="text-[10px] text-amber-400 uppercase font-bold mb-2 tracking-wider">Bittere</p>
                <p className="font-black text-3xl text-white tracking-tight">{brew.data?.ibu || '-'}</p>
                <p className="text-[9px] text-zinc-600 uppercase mt-1">IBU</p>
              </>
            ) : brew.brew_type === 'wine' ? (
              <>
                <p className="text-[10px] text-purple-400 uppercase font-bold mb-2 tracking-wider">Säure</p>
                <p className="font-black text-3xl text-white tracking-tight">
                  {brew.data?.acidity_g_l || '-'}
                </p>
                <p className="text-[9px] text-zinc-600 uppercase mt-1">g/L</p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-pink-400 uppercase font-bold mb-2 tracking-wider">Zucker</p>
                <p className="font-black text-3xl text-white tracking-tight">
                  {brew.data?.sugar_g_l || '-'}
                </p>
                <p className="text-[9px] text-zinc-600 uppercase mt-1">g/L</p>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg">
            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-2 tracking-wider">
              {brew.brew_type === 'wine' ? 'Jahrgang' : 'Jahr'}
            </p>
            <p className="font-black text-3xl text-white tracking-tight">
              {brew.brew_type === 'wine' && brew.data?.vintage ? brew.data.vintage : new Date(brew.created_at).getFullYear()}
            </p>
          </div>
        </div>

        {/* Details Section - TYPE SPECIFIC */}
        {brew.data && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase font-black tracking-[0.3em] text-cyan-400 mb-4">Details</h2>
            
            {/* BEER Details */}
            {(!brew.brew_type || brew.brew_type === 'beer') && (
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Malzarten</p>
                    <p className="text-white">{brew.data.malts}</p>
                  </div>
                )}
                {brew.data.hops && (
                  <div className="space-y-1 col-span-2">
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.grapes && (
                  <div className="space-y-1 col-span-2">
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
                  <div className="space-y-1 col-span-2">
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.apples && (
                  <div className="space-y-1 col-span-2">
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.honey && (
                  <div className="space-y-1 col-span-2">
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
                  <div className="space-y-1 col-span-2">
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.base && (
                  <div className="space-y-1 col-span-2">
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

        <div className="flex gap-3">
          <Link 
            href={`/brew/${brew.id}`}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-center py-4 rounded-xl font-bold transition border border-zinc-700 shadow-lg"
          >
            📖 Vollständiges Rezept
          </Link>
        </div>

        {/* === BEWERTUNGEN SECTION === */}
        <div className="pt-8 space-y-6">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          {/* Durchschnitt & Button */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {avgRating > 0 && (
                  <>
                    <span className="text-4xl font-black text-cyan-500">{avgRating}</span>
                    <div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={star <= Math.round(avgRating) ? 'text-yellow-500' : 'text-zinc-700'}>★</span>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500">{ratings.length} {ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}</p>
                    </div>
                  </>
                )}
                {avgRating === 0 && <p className="text-zinc-500 text-sm">Noch keine Bewertungen</p>}
              </div>
            </div>
            <button 
              onClick={() => !hasAlreadyRated && setShowRatingForm(!showRatingForm)}
              disabled={hasAlreadyRated}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-lg ${
                hasAlreadyRated 
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50' 
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black'
              }`}
            >
              {hasAlreadyRated ? '✓ Du hast bewertet' : showRatingForm ? '✕ Abbrechen' : '💬 Bewerten'}
            </button>
          </div>

          {/* Rating Form */}
          {showRatingForm && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
              <h3 className="font-bold text-lg">Deine Bewertung</h3>
              
              {/* Honeypot Field (Invisible for humans) */}
              <input 
                type="text" 
                name="website_url_check" 
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                className="opacity-0 absolute -z-10 h-0 w-0" 
              />

              {/* Stars */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Sterne</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating({...newRating, rating: star})}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className={`text-3xl transition ${
                        star <= (hoverRating || newRating.rating) 
                          ? 'text-yellow-500 scale-110' 
                          : 'text-zinc-700'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Dein Name</label>
                <input 
                  type="text"
                  placeholder="z.B. Tim"
                  value={newRating.author_name}
                  onChange={e => setNewRating({...newRating, author_name: e.target.value})}
                  className="w-full bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition text-white"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Kommentar (Optional)</label>
                <textarea 
                  placeholder="Was hast du gedacht?"
                  value={newRating.comment}
                  onChange={e => setNewRating({...newRating, comment: e.target.value})}
                  rows={3}
                  className="w-full bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition text-white resize-none"
                />
              </div>

              <button
                onClick={submitRating}
                disabled={submitting || !newRating.rating || !newRating.author_name.trim()}
                className="w-full bg-white text-black py-3 rounded-xl font-black hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Wird gesendet...' : 'Bewertung absenden'}
              </button>
            </div>
          )}

          {/* Ratings List */}
          {ratings.length > 0 && (
            <div className="space-y-3">
              {ratings.map(rating => (
                <div key={rating.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-white">{rating.author_name}</p>
                      <div className="flex gap-0.5 mt-1">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={`text-sm ${star <= rating.rating ? 'text-yellow-500' : 'text-zinc-700'}`}>★</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600">
                      {new Date(rating.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-zinc-400 leading-relaxed">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>        
        {/* --- Link zur Brauerei --- */}
        {profile && (
          <Link 
            href={`/brewery/${brew.user_id}`}
            className="block group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:bg-zinc-800 transition shadow-lg mt-8"
          >
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0">
                  {profile.logo_url ? (
                    <img src={profile.logo_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏰</div>
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                   <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Gebraut von</p>
                   <h3 className="font-bold text-xl text-white truncate group-hover:text-cyan-400 transition">
                      {profile.brewery_name || "Unbekannte Brauerei"} ↗
                   </h3>
                   {profile.location && <p className="text-xs text-zinc-500 mt-1">📍 {profile.location}</p>}
                </div>
             </div>
          </Link>
        )}

        <footer className="pt-12 pb-6 text-center opacity-40 hover:opacity-100 transition-opacity duration-500 flex flex-col items-center">
          <div className="mb-2">
             <Logo className="w-5 h-5" textSize="text-xs" />
          </div>
          <p className="text-[9px] text-zinc-700 font-medium">Digital Label System</p>
          <div className="mt-4">
             <Link href="/impressum" className="text-[10px] text-zinc-600 hover:text-zinc-400 hover:underline transition">
               Impressum
             </Link>
          </div>
          <p className="text-[8px] text-zinc-800 mt-2 font-mono">{data.id}</p>
        </footer>
      </div>
    </div>
  );
}
