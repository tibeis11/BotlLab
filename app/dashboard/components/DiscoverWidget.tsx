'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import BrewCard from '@/app/components/BrewCard';
import { Flame } from 'lucide-react';

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
                // Fetch public brews with likes_count...
                
                const { data, error } = await supabase
                    .from('brews')
                    .select('id,name,style,image_url,created_at,likes_count,breweries(name,logo_url,moderation_status)')
                    .eq('is_public', true)
                    .neq('moderation_status', 'pending') 
                    .order('likes_count', { ascending: false }) 
                    .limit(5);

                if (error) throw error;

                // Transform data
                const formatted = (data || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    style: b.style,
                    image_url: b.image_url,
                    created_at: b.created_at,
                    likes_count: b.likes_count || 0,
                    brewery: {
                        name: b.breweries?.name || 'Unbekannt',
                        logo_url: (b.breweries?.moderation_status === 'pending') ? null : b.breweries?.logo_url
                    }
                }));

                // If user is logged in, fetch which of these brews the user has liked
                try {
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData?.user;
                    if (user) {
                        const ids = formatted.map(f => f.id);
                        const { data: likes } = await supabase
                            .from('likes')
                            .select('brew_id')
                            .in('brew_id', ids);

                        const likedIds = new Set((likes || []).map((l: any) => l.brew_id));

                        const withLikes = formatted.map(f => ({ ...f, user_has_liked: likedIds.has(f.id) }));
                        setTrendingBrews(withLikes as TrendingBrew[] & { user_has_liked?: boolean }[]);
                    } else {
                        setTrendingBrews(formatted);
                    }
                } catch (e) {
                    console.error('Error fetching user likes for trending:', e);
                    setTrendingBrews(formatted);
                }
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
        <div className="bg-transparent md:bg-gradient-to-br md:from-zinc-900 md:to-zinc-950 border-none md:border md:border-zinc-800 rounded-none md:rounded-3xl p-0 md:p-6 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                        <Flame size={20} />
                    </div>
                    Angesagt in der Community
                </h3>
                <Link href="/discover" className="hidden md:flex text-xs font-bold text-cyan-400 hover:text-cyan-300 transition items-center gap-1">
                    Alles anzeigen <span>→</span>
                </Link>
            </div>

            {/* Scroll Container */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:scrollbar-thin md:[&::-webkit-scrollbar]:block md:scrollbar-thumb-zinc-700 md:scrollbar-track-transparent md:-mx-6 md:px-6">
                {trendingBrews.map(brew => (
                    <div key={brew.id} className="min-w-[280px] w-[280px] snap-center">
                        <BrewCard brew={{
                            ...brew,
                            brewery: brew.brewery,
                            likes_count: brew.likes_count,
                        }} forceVertical />
                    </div>
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
