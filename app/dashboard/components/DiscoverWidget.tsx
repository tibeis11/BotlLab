'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface TrendingBrew {
    id: string;
    name: string;
    style: string;
    image_url: string;
    brewery: { name: string, logo_url: string };
    likes_count: number;
}

export default function DiscoverWidget() {
    const [trendingBrews, setTrendingBrews] = useState<TrendingBrew[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTrending() {
            try {
                // Fetch public brews with likes_count, ordered by newness first, 
                // but we genuinely want "hot" ones. 
                // For performance, let's just fetch the 10 newest PUBLIC brews 
                // and show them as "New & Trending".
                
                const { data, error } = await supabase
                    .from('brews')
                    .select('id,name,style,image_url,likes_count,breweries(name,logo_url)')
                    .eq('is_public', true)
                    .order('likes_count', { ascending: false }) // Try sorting by likes directly
                    .limit(5);

                if (error) throw error;

                // Transform data
                const formatted = (data || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    style: b.style,
                    image_url: b.image_url,
                    likes_count: b.likes_count || 0,
                    brewery: {
                        name: b.breweries?.name || 'Unbekannt',
                        logo_url: b.breweries?.logo_url
                    }
                }));

                setTrendingBrews(formatted);
            } catch (e) {
                console.error("Error fetching trending brews", e);
            } finally {
                setLoading(false);
            }
        }
        fetchTrending();
    }, []);

    if (loading) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 min-h-[200px] animate-pulse flex items-center justify-center">
                <span className="text-zinc-600 font-bold">Lade angesagte Rezepte...</span>
            </div>
        );
    }

    if (trendingBrews.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🔥</span>
                    Angesagt in der Community
                </h3>
                <Link href="/discover" className="hidden md:flex text-xs font-bold text-cyan-400 hover:text-cyan-300 transition items-center gap-1">
                    Alles anzeigen <span>→</span>
                </Link>
            </div>

            {/* Scroll Container */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] md:scrollbar-thin [&::-webkit-scrollbar]:hidden md:[&::-webkit-scrollbar]:block md:scrollbar-thumb-zinc-700 md:scrollbar-track-transparent">
                {trendingBrews.map(brew => (
                    <Link 
                        key={brew.id} 
                        href={`/brew/${brew.id}`}
                        className="min-w-[200px] w-[200px] snap-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition group/card relative"
                    >
                        <div className="aspect-square bg-zinc-800 relative">
                            {brew.image_url ? (
                                <img src={brew.image_url} className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-3xl">🍺</div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
                                <span>❤️</span> {brew.likes_count}
                            </div>
                        </div>
                        <div className="p-3">
                            <h4 className="font-bold text-white text-sm truncate">{brew.name}</h4>
                            <p className="text-xs text-zinc-500 truncate mb-2">{brew.style || 'Unbekannter Stil'}</p>
                            
                            <div className="flex items-center gap-2 mt-auto">
                                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                                    {brew.brewery.logo_url ? <img src={brew.brewery.logo_url} className="w-full h-full object-cover"/> : <span className="text-[8px]">🏭</span>}
                                </div>
                                <span className="text-[10px] text-zinc-400 truncate max-w-[100px]">{brew.brewery.name}</span>
                            </div>
                        </div>
                    </Link>
                ))}
                
                {/* View More Card */}
                <Link 
                    href="/discover"
                    className="min-w-[100px] snap-center bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-white hover:bg-zinc-900 hover:border-zinc-700 transition"
                >
                    <span className="text-2xl">🌍</span>
                    <span className="text-xs font-bold">Mehr</span>
                </Link>
            </div>
        </div>
    );
}
