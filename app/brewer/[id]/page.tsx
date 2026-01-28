'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BrewCard from '@/app/components/BrewCard';
import { getTierConfig } from '@/lib/tier-system';
import Header from '@/app/components/Header';
import Logo from '@/app/components/Logo';
import ReportButton from '@/app/components/reporting/ReportButton';
import { MessageSquare, Calendar } from 'lucide-react';

export default function PublicBrewerPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [brews, setBrews] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
  const [loading, setLoading] = useState(true);

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
       
        // 1b. Teams laden (via brewery_members)
        const { data: membersData } = await supabase
            .from('brewery_members')
            .select('role, breweries(id, name, logo_url, moderation_status)')
            .eq('user_id', id); // Fetch ALL memberships
        
        if (membersData) {
            const loadedTeams = membersData
                .map((m: any) => m.breweries)
                .filter(Boolean); // Filter out nulls
            setTeams(loadedTeams);
        }

       // 2. Sude laden (nur wenn Profil gefunden wurde)
       const { data: brewsData } = await supabase
          .from('brews')
          .select('*, data') // Include 'data' column
          .eq('user_id', id)
          .eq('is_public', true)
          .order('created_at', { ascending: false });
       
       if (brewsData) {
         setBrews(brewsData.map((b: any) => ({ // Map to include specific data properties
            ...b,
            abv: b.data?.abv ? parseFloat(b.data.abv) : undefined,
            ibu: b.data?.ibu ? parseInt(b.data.ibu, 10) : undefined,
            ebc: b.data?.color ? parseInt(b.data.color, 10) : undefined,
            original_gravity: b.data?.original_gravity || b.data?.og || b.data?.plato ? parseFloat(String(b.data.original_gravity || b.data.og || b.data.plato)) : undefined,
         })));
         
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

       // 4. Forum Threads laden
       const { data: threadsData } = await supabase
          .from('forum_threads')
          .select(`
            *,
            category:forum_categories(title, slug),
            posts:forum_posts(count)
          `)
          .eq('author_id', id)
          .order('created_at', { ascending: false });

       if (threadsData) {
          const mappedThreads = threadsData.map((t: any) => ({
              ...t,
              reply_count: (t.posts?.[0]?.count || 0)
          }));
          setForumThreads(mappedThreads);
       }

    } else {
        console.error("Profil nicht gefunden oder Fehler:", profileError);
    }
    
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-zinc-500">Lade Brauer-Profil...</p>
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

  const tierConfig = profile ? getTierConfig(profile.tier) : null;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
           {/* --- LEFT COLUMN: Profile Image & Basic Stats (4 cols) --- */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
             {/* Profile Image (Smaller) */}
             <div className="relative w-48 h-48 mx-auto shadow-2xl rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                {profile.logo_url ? (
                  <img src={profile.logo_url} className="w-full h-full object-cover" alt={profile.display_name} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center text-6xl">
                    👤
                  </div>
                )}
             </div>

             {/* Bio Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Über</p>
                <div className="space-y-4">
                     {profile.location && (
                      <p className="text-sm text-white flex items-center gap-2">
                        📍 {profile.location}
                      </p>
                    )}
                    {profile.website && (
                      <a href={profile.website.includes('http') ? profile.website : `https://${profile.website}`} target="_blank" className="text-sm text-cyan-400 hover:text-cyan-300 block truncate">
                        🌐 {profile.website.replace('https://', '')}
                      </a>
                    )}
                     {profile.bio && (
                      <p className="text-sm text-zinc-400 leading-relaxed pt-2 border-t border-zinc-800/50">
                        {profile.bio}
                      </p>
                    )}
                </div>
              </div>
              
              {/* Team Membership */}
               {teams.length > 0 && (
                 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                     <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Mitglied bei</p>
                     <div className="space-y-2">
                        {teams.map((team: any) => (
                            <Link key={team.id} href={`/brewery/${team.id}`} className="block group">
                                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition border border-transparent hover:border-cyan-500/20">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                                        {team.logo_url && team.moderation_status !== 'pending' ? (
                                            <img src={team.logo_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">🏰</div>
                                        )}
                                    </div>
                                    <span className="font-bold text-white group-hover:text-cyan-400 transition text-sm">{team.name}</span>
                                </div>
                            </Link>
                        ))}
                     </div>
                 </div>
              )}
          </div>

          {/* --- RIGHT COLUMN: Content (8 cols) --- */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Header */}
            <div className="text-center lg:text-left space-y-4">
                <div className="flex flex-wrap gap-2 items-center justify-center lg:justify-start">
                    <span 
                        className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-zinc-900 border shadow-sm"
                        style={{
                            borderColor: tierConfig?.color ? `${tierConfig.color}40` : '#3f3f46',
                            color: tierConfig?.color || '#a1a1aa',
                            backgroundColor: tierConfig?.color ? `${tierConfig.color}10` : undefined
                        }}
                    >
                        {tierConfig?.displayName || 'Brauer'}
                    </span>
                    <ReportButton targetId={profile.id} targetType="user" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">{profile.display_name}</h1>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {/* Total Brews */}
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                    <div className="text-cyan-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Rezepte</div>
                    <div className="font-black text-3xl text-white">{brews.length}</div>
                 </div>

                 {/* Average Rating */}
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                    <div className="text-amber-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Ø Bewertung</div>
                    <div className="font-black text-3xl text-white">
                        {avgOverallRating || '-'} <span className="text-xs text-zinc-600 font-bold align-top">({totalRatings})</span>
                    </div>
                 </div>
                 
                 {/* User Tier (Placeholder if we had tier logic here) */}
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                     <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Aktiv seit</div>
                     <div className="font-black text-3xl text-white">{profile.founded_year || new Date(profile.created_at || Date.now()).getFullYear()}</div>
                 </div>
            </div>

            {/* Recipes Grid */}
            <div className="pt-8 border-t border-zinc-800/50">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">Öffentliche Rezepte</h3>
               
              {brews.length === 0 ? (
                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                  <p className="text-zinc-500">Dieser Brauer hat noch keine öffentlichen Rezepte.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brews.map(brew => (
                    <BrewCard
                      key={brew.id}
                      brew={{
                        ...brew,
                        brewery: profile ? {
                          id: profile.id,
                          name: profile.display_name,
                          logo_url: profile.logo_url,
                        } : null,
                        ratings: brewRatings[brew.id]
                          ? Array(brewRatings[brew.id].count).fill({ rating: brewRatings[brew.id].avg })
                          : [],
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Forum Posts Section */}
            <div className="pt-8 border-t border-zinc-800/50">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">Diskussionen ({forumThreads.length})</h3>
               
               {forumThreads.length === 0 ? (
                   <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                      <p className="text-zinc-500">Keine öffentlichen Diskussionen gestartet.</p>
                   </div>
               ) : (
                   <div className="space-y-3">
                       {forumThreads.map(thread => (
                           <Link 
                               key={thread.id} 
                               href={`/forum/thread/${thread.id}`}
                               className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900 hover:border-zinc-700 transition group"
                           >
                               <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/80 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
                                            {thread.category?.title}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                            <Calendar size={10} />
                                            {new Date(thread.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-900 group-hover:border-zinc-800 transition">
                                        {thread.reply_count} <MessageSquare size={10} />
                                    </span>
                               </div>
                               <h4 className="font-bold text-zinc-300 group-hover:text-white transition line-clamp-1">
                                   {thread.title}
                               </h4>
                           </Link>
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
