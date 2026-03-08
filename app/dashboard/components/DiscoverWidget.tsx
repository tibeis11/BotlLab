'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import Link from 'next/link';
import DiscoverBrewCard from '@/app/components/DiscoverBrewCard';
import { Compass } from 'lucide-react';

interface TrendingBrew {
    id: string;
    name: string;
    style: string;
    image_url: string;
    created_at: string;
    user_id: string;
    brewery: { id: string, name: string, logo_url: string | null };
    likes_count: number;
    abv?: number;
    ibu?: number;
    ebc?: number;
    original_gravity?: number;
}

export default function DiscoverWidget() {
    const supabase = useSupabase();
    const [trendingBrews, setTrendingBrews] = useState<TrendingBrew[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTrending() {
            try {
                const { data, error } = await supabase
                    .from('brews')
                    .select('id,name,style,image_url,created_at,user_id,likes_count,data,breweries(id,name,logo_url,moderation_status)')
                    .eq('is_public', true)
                    .neq('moderation_status', 'pending') 
                    .order('likes_count', { ascending: false }) 
                    .limit(5);

                if (error) throw error;

                const formatted = (data || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    style: b.style,
                    image_url: b.image_url,
                    created_at: b.created_at,
                    user_id: b.user_id,
                    likes_count: b.likes_count || 0,
                    abv: b.data?.abv ? parseFloat(b.data.abv) : undefined,
                    ibu: b.data?.ibu ? parseInt(b.data.ibu, 10) : undefined,
                    ebc: b.data?.color ? parseInt(b.data.color, 10) : undefined,
                    original_gravity: b.data?.original_gravity || b.data?.og || b.data?.plato ? parseFloat(String(b.data.original_gravity || b.data.og || b.data.plato)) : undefined,
                    brewery: {
                        id: b.breweries?.id || '',
                        name: b.breweries?.name || 'Unbekannt',
                        logo_url: (b.breweries?.moderation_status === 'pending') ? null : b.breweries?.logo_url
                    }
                }));

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
            <div className="min-h-[200px] animate-pulse flex items-center justify-center">
                <span className="text-text-disabled font-bold text-sm">Lade angesagte Rezepte...</span>
            </div>
        );
    }

    if (trendingBrews.length === 0) return null;

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trendingBrews.map(brew => (
                <div key={brew.id} className="min-w-[280px] w-[280px] snap-start first:ml-0">
                    <DiscoverBrewCard brew={{
                        ...brew,
                        brewery: brew.brewery,
                        likes_count: brew.likes_count,
                    }} variant="portrait" />
                </div>
            ))}
            <Link 
                href="/discover"
                className="min-w-[100px] snap-center bg-surface border border-border-subtle border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-text-muted hover:text-text-primary hover:bg-surface-hover hover:border-border-hover transition-all group"
            >
                <Compass size={24} className="opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70 group-hover:opacity-100">Mehr...</span>
            </Link>
        </div>
    );
}
