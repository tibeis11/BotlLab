'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getTierConfig } from '@/lib/tier-system';
import Logo from '@/app/components/Logo';

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
  const [activeTab, setActiveTab] = useState<'brews' | 'team'>('brews');

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
        const { data: brewsData } = await supabase
            .from('brews')
            .select('*')
            .eq('brewery_id', id)
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (brewsData) {
            setBrews(brewsData);

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

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-cyan-500/30">
        
        {/* Navigation Bar */}
        <nav className="absolute top-0 w-full z-50 p-6 flex justify-between items-center">
            <Link href="/">
                <Logo />
            </Link>
            <Link href="/login" className="px-4 py-2 bg-white/10 backdrop-blur rounded-full text-xs font-bold hover:bg-white/20 transition">
                Login
            </Link>
        </nav>

        {/* Hero Section */}
        <div className="relative w-full h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                {brewery.header_url ? (
                    <img src={brewery.header_url} className="w-full h-full object-cover opacity-60" alt="" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center flex flex-col items-center p-4 pt-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="w-32 h-32 rounded-full border-4 border-black shadow-2xl bg-zinc-900 mb-6 overflow-hidden relative">
                    {brewery.logo_url ? (
                        <img src={brewery.logo_url} className="w-full h-full object-cover" alt={brewery.name} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🏰</div>
                    )}
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
                    {brewery.name}
                </h1>
                
                <div className="flex gap-4 text-sm font-bold text-zinc-400">
                    <span className="flex items-center gap-1">
                        🍺 {brews.length} Rezepte
                    </span>
                    <span className="w-px h-full bg-zinc-700" />
                    <span className="flex items-center gap-1">
                        👥 {members.length} Brauer
                    </span>
                </div>
            </div>
        </div>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-12 -mt-12 relative z-20">
            
            {/* Tabs */}
            <div className="flex justify-center mb-12">
                <div className="bg-zinc-900/80 backdrop-blur p-1 rounded-2xl flex border border-zinc-800 shadow-xl">
                    <button 
                        onClick={() => setActiveTab('brews')}
                        className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 text-sm ${activeTab === 'brews' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Rezepte
                    </button>
                    <button 
                        onClick={() => setActiveTab('team')}
                        className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 text-sm ${activeTab === 'team' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Das Team
                    </button>
                </div>
            </div>

            {/* Brews Grid */}
            {activeTab === 'brews' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {brews.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-zinc-500">
                            <p className="text-xl font-bold mb-2">Noch keine öffentlichen Rezepte</p>
                            <p className="text-sm">Diese Brauerei tüftelt noch im Geheimen.</p>
                        </div>
                    ) : (
                        brews.map((brew) => (
                            <Link 
                                href={`/brew/${brew.id}`}
                                key={brew.id}
                                className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:bg-zinc-900 transition-all duration-300 flex flex-col"
                            >
                                <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                                     {brew.image_url ? (
                                        <img 
                                            src={brew.image_url} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                            alt={brew.name}
                                        />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🍺</div>
                                     )}
                                     
                                     {/* Rating Badge */}
                                     {brewRatings[brew.id] && (
                                         <div className="absolute top-3 right-3 bg-black/80 backdrop-blur text-amber-400 font-black px-2 py-1 rounded-lg text-xs flex items-center gap-1 border border-white/10">
                                             <span>⭐</span>
                                             <span>{brewRatings[brew.id].avg}</span>
                                             <span className="text-zinc-500 font-normal">({brewRatings[brew.id].count})</span>
                                         </div>
                                     )}
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-auto">
                                        <h3 className="font-bold text-white text-lg mb-1 group-hover:text-cyan-400 transition">{brew.name}</h3>
                                        <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider mb-3">{brew.style}</p>
                                        {brew.description && (
                                            <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">{brew.description}</p>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 font-mono">
                                        <span>{new Date(brew.created_at).toLocaleDateString()}</span>
                                        <span>Zum Rezept →</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            )}

            {/* Team Grid */}
            {activeTab === 'team' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {members.map((member) => (
                         <Link 
                            href={`/brewer/${member.id}`} 
                            key={member.id}
                            className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4 hover:bg-zinc-900 hover:border-zinc-700 transition group"
                        >
                            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0 group-hover:border-cyan-500 transition">
                                {member.logo_url ? (
                                    <img src={member.logo_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-white group-hover:text-cyan-400 transition">
                                    {member.display_name || 'Unbekannter Brauer'}
                                </h3>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{member.role}</p>
                                {member.tier && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-opacity-10 
                                        ${member.tier === 'legend' ? 'border-amber-500 text-amber-500 bg-amber-500' : 
                                          member.tier === 'master' ? 'border-purple-500 text-purple-500 bg-purple-500' : 
                                          'border-zinc-600 text-zinc-400 bg-zinc-500'}`
                                    }>
                                        {member.tier.toUpperCase()} TIER
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

        </main>
        
        {/* Simple Footer */}
        <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-zinc-600 text-xs mt-12 pb-20">
            <p>© {new Date().getFullYear()} BotlLab - {brewery.name} Public Profile</p>
        </footer>
    </div>
  );
}
