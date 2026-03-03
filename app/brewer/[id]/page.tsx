'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BrewCard from '@/app/components/BrewCard';

import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ReportButton from '@/app/components/reporting/ReportButton';
import DrinkTimeline from '@/app/my-cellar/components/DrinkTimeline';
import { buildTimelineFromData } from '@/lib/timeline-types';
import { MessageSquare, Calendar, Star, Beer, MapPin } from 'lucide-react';

export default function PublicBrewerPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [brews, setBrews] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [forumReputation, setForumReputation] = useState(0);
  const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
  const [consumerCaps, setConsumerCaps] = useState<any[]>([]);
  const [consumerRatings, setConsumerRatings] = useState<any[]>([]);
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

       const isDrinkerMode = profileData.app_mode === 'drinker';

       if (isDrinkerMode) {
         // ── CONSUMER DATA ──────────────────────────────────────────────
         const [capsResult, userRatingsResult] = await Promise.all([
           supabase
             .from('collected_caps')
             .select('id, collected_at, brew_id, brews(id, name, cap_url, image_url, style, brewery_id, breweries(id, name))')
             .eq('user_id', id)
             .order('collected_at', { ascending: false }),
           supabase
             .from('ratings')
             .select('id, rating, comment, author_name, created_at, brew_id, brews(id, name, cap_url)')
             .eq('user_id', id)
             .eq('moderation_status', 'auto_approved')
             .order('created_at', { ascending: false }),
         ]);
         if (capsResult.data) setConsumerCaps(capsResult.data);
         if (userRatingsResult.data) setConsumerRatings(userRatingsResult.data);
       } else {
         // ── BREWER DATA ────────────────────────────────────────────────
         // 1b. Teams laden (via brewery_members)
         const { data: membersData } = await supabase
           .from('brewery_members')
           .select('role, breweries(id, name, logo_url, moderation_status)')
           .eq('user_id', id);

         if (membersData) {
           const loadedTeams = membersData
             .map((m: any) => m.breweries)
             .filter(Boolean);
           setTeams(loadedTeams);
         }

         // 2. Sude laden
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
       }

       // 4. Forum Threads + Posts parallel laden (both modes)
       const [threadsResult, postsResult] = await Promise.all([
           supabase
               .from('forum_threads')
               .select('*, category:forum_categories(title, slug), posts:forum_posts(count)')
               .eq('author_id', id)
               .order('created_at', { ascending: false }),
           supabase
               .from('forum_posts')
               .select('id, content, created_at, thread_id, deleted_at, thread:forum_threads(id, title)')
               .eq('author_id', id)
               .is('deleted_at', null)
               .order('created_at', { ascending: false })
               .limit(20),
       ]);

       if (threadsResult.data) {
          const mappedThreads = threadsResult.data.map((t: any) => ({
              ...t,
              reply_count: (t.posts?.[0]?.count || 0)
          }));
          setForumThreads(mappedThreads);
       }
       if (postsResult.data) {
           setForumPosts(postsResult.data);
       }

       // Reputation = total votes on any post/thread by this user
       const allIds = [
           ...(threadsResult.data ?? []).map((t: any) => t.id),
           ...(postsResult.data ?? []).map((p: any) => p.id),
       ];
       if (allIds.length > 0) {
           const { count: repCount } = await supabase
               .from('forum_votes')
               .select('id', { count: 'exact', head: true })
               .in('target_id', allIds);
           setForumReputation(repCount ?? 0);
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
          <p className="text-zinc-500">Lade Profil...</p>
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

  // Mode detection
  const isDrinker = profile.app_mode === 'drinker';

  // Consumer stats (only computed when drinker)
  const totalConsumerRatings = consumerRatings.length;
  const avgConsumerRating = totalConsumerRatings > 0
    ? (consumerRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / totalConsumerRatings).toFixed(1)
    : null;
  const uniqueBreweries = new Set(
    consumerCaps
      .map((c: any) => (c.brews as any)?.brewery_id)
      .filter(Boolean)
  ).size;

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
                        className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg border shadow-sm ${
                          isDrinker
                            ? 'bg-amber-950/30 border-amber-800/30 text-amber-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                    >
                        {isDrinker ? 'Bierfreund' : 'Brauer'}
                    </span>
                    <ReportButton targetId={profile.id} targetType="user" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">{profile.display_name}</h1>
            </div>

            {/* KPI Grid */}
            {isDrinker ? (
              /* ── CONSUMER KPI GRID ── */
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                  <div className="text-cyan-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Kronkorken</div>
                  <div className="font-black text-3xl text-white">{consumerCaps.length}</div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                  <div className="text-amber-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Brauereien</div>
                  <div className="font-black text-3xl text-white">{uniqueBreweries}</div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                  <div className="text-purple-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Tasting IQ</div>
                  <div className="font-black text-3xl text-white">{profile.tasting_iq || 0}</div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                  <div className="text-emerald-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Bewertungen</div>
                  <div className="font-black text-3xl text-white">{totalConsumerRatings}</div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                  <div className="text-amber-500 text-[10px] uppercase font-bold mb-1 tracking-wider flex items-center gap-1"><Star size={10} /> Ø Bewertung</div>
                  <div className="font-black text-3xl text-white">{avgConsumerRating || '–'}</div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                  <div className="text-emerald-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Diskussionen</div>
                  <div className="font-black text-3xl text-white">{forumThreads.length + forumPosts.length}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">{forumThreads.length} Threads · {forumPosts.length} Antworten</div>
                </div>
              </div>
            ) : (
              /* ── BREWER KPI GRID ── */
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                    <div className="text-cyan-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Rezepte</div>
                    <div className="font-black text-3xl text-white">{brews.length}</div>
                 </div>

                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                    <div className="text-amber-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Ø Bewertung</div>
                    <div className="font-black text-3xl text-white">
                        {avgOverallRating || '-'} <span className="text-xs text-zinc-600 font-bold align-top">({totalRatings})</span>
                    </div>
                 </div>
                 
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                     <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Aktiv seit</div>
                     <div className="font-black text-3xl text-white">{profile.founded_year || new Date(profile.created_at || Date.now()).getFullYear()}</div>
                 </div>

                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                     <div className="text-emerald-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Diskussionen</div>
                     <div className="font-black text-3xl text-white">{forumThreads.length + forumPosts.length}</div>
                     <div className="text-[10px] text-zinc-500 mt-1">{forumThreads.length} Threads · {forumPosts.length} Antworten</div>
                 </div>

                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                     <div className="text-amber-500 text-[10px] uppercase font-bold mb-1 tracking-wider flex items-center gap-1"><Star size={10} /> Reputation</div>
                     <div className="font-black text-3xl text-white">{forumReputation}</div>
                     <div className="text-[10px] text-zinc-500 mt-1">erhaltene Reaktionen</div>
                 </div>
              </div>
            )}

            {/* ── MODE-SPECIFIC CONTENT ── */}
            {isDrinker ? (
              <>
                {/* Kronkorken-Sammlung */}
                <div className="pt-8 border-t border-zinc-800/50">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">
                    Kronkorken-Sammlung ({consumerCaps.length})
                  </h3>

                  {consumerCaps.length === 0 ? (
                    <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                      <Beer className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500">Noch keine Kronkorken gesammelt.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {consumerCaps.map((cap: any) => {
                        const brew = cap.brews as any;
                        const brewery = brew?.breweries as any;
                        return (
                          <Link
                            key={cap.id}
                            href={cap.brew_id ? `/brew/${cap.brew_id}` : '#'}
                            className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900 hover:border-zinc-700 transition group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {brew?.cap_url ? (
                                  <img src={brew.cap_url} className="w-full h-full object-cover" alt="" />
                                ) : brew?.image_url ? (
                                  <img src={brew.image_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <Beer className="w-5 h-5 text-zinc-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-zinc-300 group-hover:text-white transition text-sm truncate">
                                  {brew?.name || 'Unbekanntes Bier'}
                                </p>
                                {brewery?.name && (
                                  <p className="text-[11px] text-zinc-500 truncate">{brewery.name}</p>
                                )}
                                {brew?.style && (
                                  <p className="text-[10px] text-zinc-600 truncate">{brew.style}</p>
                                )}
                              </div>
                            </div>
                            {cap.collected_at && (
                              <div className="mt-2 text-[10px] text-zinc-600 flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(cap.collected_at).toLocaleDateString()}
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bewertungen */}
                {consumerRatings.length > 0 && (
                  <div className="pt-8 border-t border-zinc-800/50">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">
                      Bewertungen ({consumerRatings.length})
                    </h3>
                    <div className="space-y-3">
                      {consumerRatings.slice(0, 20).map((rating: any) => {
                        const brew = rating.brews as any;
                        return (
                          <Link
                            key={rating.id}
                            href={rating.brew_id ? `/brew/${rating.brew_id}` : '#'}
                            className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900 hover:border-zinc-700 transition group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400 font-black text-sm">
                                  {'★'.repeat(Math.round(rating.rating))}{'☆'.repeat(5 - Math.round(rating.rating))}
                                </span>
                                <span className="text-xs font-bold text-zinc-400">{rating.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(rating.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="font-bold text-zinc-300 group-hover:text-white transition text-sm truncate">
                              {brew?.name || 'Unbekanntes Bier'}
                            </p>
                            {rating.comment && (
                              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{rating.comment}</p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Meine Reise Timeline (Phase 4.4) */}
                {(consumerCaps.length > 0 || consumerRatings.length > 0) && (
                  <div className="pt-8 border-t border-zinc-800/50">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">
                      🗺️ Reise
                    </h3>
                    <DrinkTimeline months={buildTimelineFromData(consumerCaps, consumerRatings)} />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Recipes Grid (Brewer only) */}
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
                            abv: brew.data?.abv ? parseFloat(brew.data.abv) : undefined,
                            ibu: brew.data?.ibu ? parseInt(brew.data.ibu, 10) : undefined,
                            ebc: brew.data?.color ? parseInt(brew.data.color, 10) : undefined,
                            original_gravity: brew.data?.original_gravity || brew.data?.og || brew.data?.plato ? parseFloat(String(brew.data.original_gravity || brew.data.og || brew.data.plato)) : undefined,
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
              </>
            )}

            {/* Recent Replies Section */}
            {forumPosts.length > 0 && (
            <div className="pt-8 border-t border-zinc-800/50">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">Neueste Antworten ({forumPosts.length})</h3>
               <div className="space-y-3">
                   {forumPosts.slice(0, 10).map((post: any) => (
                       <Link
                           key={post.id}
                           href={`/forum/thread/${post.thread_id}`}
                           className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900 hover:border-zinc-700 transition group"
                       >
                           <div className="flex items-center gap-2 mb-2">
                               <MessageSquare size={11} className="text-zinc-600" />
                               <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition line-clamp-1">
                                   {(post.thread as any)?.title ?? 'Thread'}
                               </span>
                               <span className="ml-auto text-[10px] text-zinc-600 flex items-center gap-1 whitespace-nowrap">
                                   <Calendar size={10} />
                                   {new Date(post.created_at).toLocaleDateString()}
                               </span>
                           </div>
                           <p className="text-xs text-zinc-500 line-clamp-2">{post.content}</p>
                       </Link>
                   ))}
               </div>
            </div>
            )}

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

      <Footer variant="minimal" />

    </div>
  );
}
