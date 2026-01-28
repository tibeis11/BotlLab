'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getBreweryTierConfig } from '@/lib/tier-system';

import Header from '@/app/components/Header';
import Logo from '@/app/components/Logo';
import ReportButton from '@/app/components/reporting/ReportButton';
import BrewCard from '@/app/components/BrewCard';

// Read-only Client für öffentliche Daten
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PublicBreweryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [brewery, setBrewery] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [brews, setBrews] = useState<any[]>([]);
  const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
        // 1. Brauerei laden
        const { data: breweryData, error } = await supabase
            .from('breweries')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !breweryData) {
            console.error(error);
            setLoading(false);
            return;
        }

        setBrewery(breweryData);

        // 2. Mitglieder laden (mit Profilen)
        const { data: memberData } = await supabase
            .from('brewery_members')
            .select(`
                role,
                profiles (id, display_name, logo_url, tier)
            `)
            .eq('brewery_id', id);
        
        if (memberData) {
            // Flatten structure
            const team = memberData.map((m: any) => ({
                role: m.role,
                ...m.profiles
            }));
            setMembers(team);
        }

        // 3. Öffentliche Rezepte laden
        let query = supabase
          .from('brews')
          .select('*, data, bottles(count)') // Include 'data' column
          .eq('brewery_id', breweryId);

        const { data: brewsData, error } = await query;

        if (error) throw error;
        setBrews(data.map((b: any) => ({ // Map to include specific data properties
            ...b,
            abv: b.data?.abv ? parseFloat(b.data.abv) : undefined,
            ibu: b.data?.ibu ? parseInt(b.data.ibu, 10) : undefined,
            ebc: b.data?.color ? parseInt(b.data.color, 10) : undefined,
            original_gravity: b.data?.original_gravity || b.data?.og || b.data?.plato ? parseFloat(String(b.data.original_gravity || b.data.og || b.data.plato)) : undefined,
        })) || []);

        // 4. Ratings für die Rezepte holen
        const ratingsMap: {[key: string]: {avg: number, count: number}} = {};
            
        // Parallel fetch ratings to save time
        await Promise.all(brewsData.map(async (brew) => {
            const { data: ratings } = await supabase
                .from('ratings')
                .select('rating')
                .eq('brew_id', brew.id)
                .eq('moderation_status', 'auto_approved'); // Nur bestätigte Bewertungen

            if (ratings && ratings.length > 0) {
                const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
                ratingsMap[brew.id] = {
                    avg: Math.round(avg * 10) / 10,
                    count: ratings.length
                };
            }
        }));
        setBrewRatings(ratingsMap);
        // Load Premium Status for the brewery (based on OWNER subscription)
        const { data: premiumStatus } = await supabase
          .from('breweries')
          .select('premium_status')
          .eq('id', breweryId);

        if (premiumStatus && premiumStatus[0]?.premium_status) {
          setBrewery(prev => ({ ...prev, premium_status: premiumStatus[0].premium_status }));
        }

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  }

  if (loading) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin text-4xl">🍺</div>
        </div>
    );
  }

  if (!brewery) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
              <h1 className="text-2xl font-bold text-white">Brauerei nicht gefunden</h1>
              <Link href="/discover" className="text-cyan-400 hover:underline">Zurück zum Entdecken</Link>
          </div>
      );
  }

  const tierConfig = getBreweryTierConfig(brewery.tier || 'garage');
  const totalRatings = Object.values(brewRatings).reduce((sum, r) => sum + r.count, 0);
  const avgOverallRating = totalRatings > 0 
    ? (Object.values(brewRatings).reduce((sum, r) => sum + r.avg * r.count, 0) / totalRatings).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
           {/* --- LEFT COLUMN: Profile Image & Basic Stats (4 cols) --- */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
             {/* Profile Image (Smaller) */}
             <div className="relative w-48 h-48 mx-auto shadow-2xl rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                {brewery.logo_url && brewery.moderation_status !== 'pending' ? (
                  <img src={brewery.logo_url} className="w-full h-full object-cover" alt={brewery.name} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center text-6xl">
                    🏰
                  </div>
                )}
             </div>

             {/* Bio Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Über</p>
                <div className="space-y-4">
                     {brewery.location && (
                      <p className="text-sm text-white flex items-center gap-2">
                        📍 {brewery.location}
                      </p>
                    )}
                    {brewery.website_url && (
                      <a href={brewery.website_url.includes('http') ? brewery.website_url : `https://${brewery.website_url}`} target="_blank" className="text-sm text-cyan-400 hover:text-cyan-300 block truncate">
                        🌐 {brewery.website_url.replace('https://', '')}
                      </a>
                    )}
                     {brewery.description && (
                      <p className="text-sm text-zinc-400 leading-relaxed pt-2 border-t border-zinc-800/50">
                        {brewery.description}
                      </p>
                    )}
                </div>
              </div>
              
              {/* Team Members */}
               {members.length > 0 && (
                 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                     <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Das Team</p>
                     <div className="space-y-2">
                        {members.map((member: any) => (
                            <Link key={member.id} href={`/brewer/${member.id}`} className="block group">
                                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition border border-transparent hover:border-cyan-500/20">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                                        {member.logo_url ? (
                                            <img src={member.logo_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                                        )}
                                    </div>
                                    <span className="font-bold text-white group-hover:text-cyan-400 transition text-sm">{member.display_name}</span>
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
                        {tierConfig?.displayName || 'Brauerei'}
                    </span>
                    <ReportButton targetId={brewery.id} targetType="brewery" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">{brewery.name}</h1>
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
                 
                 {/* Founded */}
                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
                     <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Gegründet</div>
                     <div className="font-black text-3xl text-white">{brewery.founded_year || new Date(brewery.created_at || Date.now()).getFullYear()}</div>
                 </div>
            </div>

            {/* Recipes Grid */}
            <div className="pt-8 border-t border-zinc-800/50">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">Öffentliche Rezepte</h3>
               
              {brews.length === 0 ? (
                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                  <p className="text-zinc-500">Diese Brauerei hat noch keine öffentlichen Rezepte.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brews.map(brew => (
                    <BrewCard
                      key={brew.id}
                      brew={{
                        ...brew,
                        brewery: brewery ? {
                          id: brewery.id,
                          name: brewery.name,
                          logo_url: brewery.logo_url,
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

            {/* Forum Grid Placeholder */}
            <div className="pt-8 border-t border-zinc-800/50">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">Forumsbeiträge (0)</h3>
               
              <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                  <p className="text-zinc-500">Keine öffentlichen Beiträge.</p>
              </div>
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
