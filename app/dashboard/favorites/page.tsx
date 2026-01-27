'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BrewCard from '@/app/components/BrewCard';
import { useAuth } from '@/app/context/AuthContext';

// Simplified Brew type compatible with BrewCard
type Brew = {
  id: string;
  name: string;
  style: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  brew_type?: string | null;
  data?: any;
  remix_parent_id?: string | null;
  brewery?: { id?: string; name: string; team_name?: string; logo_url?: string | null } | null; 
  ratings?: { rating: number }[] | null;
  likes_count?: number; 
  user_has_liked?: boolean;
};

export default function FavoritesPage() {
  const { user } = useAuth();
  const [brews, setBrews] = useState<Brew[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        loadFavorites();
    }
  }, [user]);

  async function loadFavorites() {
    setLoading(true);
    
    try {
        // 1. Get likes for current user
        const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('brew_id')
            .eq('user_id', user!.id);
            
        if (likesError) throw likesError;
        
        const likedBrewIds = (likesData || []).map((l: any) => l.brew_id);
        
        if (likedBrewIds.length === 0) {
            setBrews([]);
            setLoading(false);
            return;
        }

        // 2. Fetch details for these brews
        const { data: brewsData, error: brewsError } = await supabase
            .from('brews')
            .select('id,name,style,image_url,created_at,user_id,brew_type,data,remix_parent_id,breweries(id,name,logo_url),ratings(rating),likes_count')
            .in('id', likedBrewIds)
            .order('created_at', { ascending: false });

        if (brewsError) throw brewsError;

        // 3. Format data (we know user_has_liked is true for all these)
        const formattedBrews: Brew[] = (brewsData || []).map((b: any) => ({
            ...b,
            brewery: Array.isArray(b.breweries) ? b.breweries[0] : b.breweries,
            user_has_liked: true
        }));

        setBrews(formattedBrews);

    } catch (err) {
        console.error('Error loading favorites:', err);
    } finally {
        setLoading(false);
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-2xl font-black text-white mb-2">Deine Favoriten</h1>
            <p className="text-zinc-400">Rezepte, die du mit einem "Like" markiert hast.</p>
        </div>
        <div className="px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800 text-sm font-bold text-zinc-400">
            {brews.length} {brews.length === 1 ? 'Rezept' : 'Rezepte'}
        </div>
      </div>

      {brews.length === 0 ? (
        <div className="text-center py-24 bg-zinc-900/50 rounded-2xl border border-zinc-900 border-dashed">
            <div className="text-6xl mb-4">💔</div>
            <h3 className="text-xl font-bold text-white mb-2">Noch keine Favoriten</h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                Du hast noch keine Rezepte geliked. Stöbere durch die Community, um interessante Sude zu finden!
            </p>
            <Link 
                href="/discover" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow-lg shadow-cyan-900/20"
            >
                🌍 Jetzt entdecken
            </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {brews.map(brew => (
                <BrewCard key={brew.id} brew={brew} />
            ))}
        </div>
      )}
    </div>
  );
}
