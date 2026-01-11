'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PublicBrewerPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [brews, setBrews] = useState<any[]>([]);
  const [team, setTeam] = useState<any | null>(null);
  const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if(id) loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);

    // 1. Profil laden
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (profileData) {
       setProfile(profileData);
       
        // 1b. Team laden (via brewery_members)
        const { data: memberData } = await supabase
            .from('brewery_members')
            .select('role, breweries(id, name, logo_url)')
            .eq('user_id', id) // Check memberships for this user
            .maybeSingle();
        
        if (memberData && memberData.breweries) {
            // @ts-ignore
            setTeam(memberData.breweries);
        }

       // 2. Sude laden (nur wenn Profil gefunden wurde)
       const { data: brewsData } = await supabase
          .from('brews')
          .select('*')
          .eq('user_id', id)
          .eq('is_public', true)
          .order('created_at', { ascending: false });
       
       if (brewsData) {
         setBrews(brewsData);
         
         // 3. Bewertungen für alle Rezepte laden
         const ratingsMap: {[key: string]: {avg: number, count: number}} = {};
         for (const brew of brewsData) {
           const { data: ratings } = await supabase
             .from('ratings')
             .select('rating')
             .eq('brew_id', brew.id)
             .eq('moderation_status', 'auto_approved');

           if (ratings && ratings.length > 0) {
             const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
             ratingsMap[brew.id] = {
               avg: Math.round(avg * 10) / 10,
               count: ratings.length
             };
           }
         }
         setBrewRatings(ratingsMap);
       }
    } else {
        console.error("Profil nicht gefunden oder Fehler:", profileError);
    }
    
    setLoading(false);
  }

  if (loading) {
     return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-cyan-500 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin text-6xl mb-4">�</div>
              <p className="text-zinc-400">Lade Brauer-Profil...</p>
            </div>
        </div>
     );
  }

  if (!profile) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-500 flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-4xl font-black mb-4 text-white">404</h1>
            <p className="text-lg mb-8">Dieser Nutzer existiert nicht.</p>
            <Link href="/" className="inline-block text-cyan-500 hover:text-cyan-400 transition">← Zur Startseite</Link>
        </div>
      );
  }

  const totalRatings = Object.values(brewRatings).reduce((sum, r) => sum + r.count, 0);
  const avgOverallRating = totalRatings > 0 
    ? (Object.values(brewRatings).reduce((sum, r) => sum + r.avg * r.count, 0) / totalRatings).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white">
      
      {/* Hero Section - 2 Column Layout */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Left: Logo & Brauer Info */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Logo / Avatar */}
            <div className="relative w-full aspect-square rounded-full overflow-hidden shadow-2xl border-4 border-cyan-500/20 max-w-[200px] mx-auto md:max-w-none">
              {profile.logo_url ? (
                <img src={profile.logo_url} className="w-full h-full object-cover" alt={profile.brewery_name} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center text-6xl">
                  👤
                </div>
              )}
            </div>

            {/* Brauer Header */}
            <div className="space-y-3 text-center md:text-left">
              <h1 className="text-3xl font-black text-white leading-tight">
                {profile.brewery_name || 'Brauer'}
              </h1>
              
              {team && (
                 <Link href={`/team/${team.id}/brews`} className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:border-cyan-500/50 transition group">
                    <span className="text-xl">🏰</span>
                    <div className="text-left">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block leading-none">Mitglied bei</span>
                        <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition">{team.name}</span>
                    </div>
                 </Link>
              )}
              
              {profile.location && (
                <p className="text-sm text-zinc-400 flex items-center justify-center md:justify-start gap-2">
                  📍 {profile.location}
                </p>
              )}
              
              {profile.founded_year && (
                 <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                    Dabei seit {profile.founded_year}
                 </p>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-[9px] text-cyan-400 uppercase font-bold mb-2 tracking-wider">Erstellt</p>
                <p className="text-3xl font-black text-white">{brews.length}</p>
              </div>
              
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                 <p className="text-[9px] text-yellow-500 uppercase font-bold mb-2 tracking-wider">Bewertung</p>
                 <p className="text-3xl font-black text-white">{avgOverallRating || '-'}</p>
              </div>
            </div>

            {/* Website Button */}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-900 py-3 rounded-xl font-bold transition shadow-lg block text-center text-sm"
              >
                🌐 Webseite
              </a>
            )}

          </div>

          {/* Right: Recent Brews Grid */}
          <div className="md:col-span-2 space-y-6">
            
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-6">
                 Erstellte Rezepte ({brews.length})
              </h2>

              {brews.length === 0 ? (
                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                  <p className="text-zinc-500 text-lg">Keine öffentlichen Rezepte.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {brews.map(brew => (
                    <Link
                      key={brew.id}
                      href={`/b/${brew.id}`} 
                      className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-cyan-500/50 transition-all duration-300"
                    >
                      <div className="aspect-square bg-zinc-800 overflow-hidden relative">
                        {brew.image_url ? (
                          <img
                            src={brew.image_url}
                            alt={brew.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-700 text-3xl">
                            🍺
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

                        {/* Remix/Original Badge */}
                        <div className="absolute top-2 right-2">
                          {brew.remix_parent_id ? (
                            <span className="inline-block text-amber-300 text-[10px] font-black uppercase px-2 py-1 rounded bg-amber-900/80 backdrop-blur tracking-wide">
                              ♻️ Remix
                            </span>
                          ) : (
                            <span className="inline-block text-emerald-300 text-[10px] font-black uppercase px-2 py-1 rounded bg-emerald-900/80 backdrop-blur tracking-wide">
                              ✓ Original
                            </span>
                          )}
                        </div>

                      </div>
                        {/* Static Bottom Info */}
                        <div className="p-3 bg-zinc-950 border-t border-zinc-800">
                          <p className="font-bold text-white text-sm truncate">{brew.name}</p>
                           <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mt-1">{brew.style}</p>
                          {brewRatings[brew.id] && (
                            <div className="flex items-center gap-1 mt-2">
                              <span className="text-yellow-400 text-xs">★</span>
                              <span className="text-cyan-200 text-xs font-bold">{brewRatings[brew.id].avg}</span>
                              <span className="text-zinc-500 text-xs">({brewRatings[brew.id].count})</span>
                            </div>
                          )}
                        </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-6 py-12 border-t border-zinc-800 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition"
        >
          ← Zurück zur Startseite
        </Link>
      </div>

    </div>
  );
}
