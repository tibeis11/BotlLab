'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/hooks/useSupabase';
import DiscoverBrewCard, { type DiscoverBrew } from '@/app/components/DiscoverBrewCard';
import CustomSelect from '@/app/components/CustomSelect';
import { useAuth } from '@/app/context/AuthContext';
import { Heart, Search, Filter, Calendar, Beaker, Factory, Globe } from 'lucide-react';

export default function FavoritesPage() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [brews, setBrews] = useState<DiscoverBrew[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

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
        const formattedBrews: DiscoverBrew[] = (brewsData || []).map((b: any) => ({
            ...b,
            brewery: Array.isArray(b.breweries) ? b.breweries[0] : b.breweries,
            user_has_liked: true,
            // Map JSON data fields to top-level properties expected by BrewCard
            abv: b.data?.abv || b.data?.est_abv,
            ibu: b.data?.ibu,
            ebc: b.data?.color,
            original_gravity: b.data?.original_gravity || b.data?.og
        }));

        setBrews(formattedBrews);

    } catch (err) {
        console.error('Error loading favorites:', err);
    } finally {
        setLoading(false);
    }
  }

  // Filter & Sort
  const filteredBrews = brews
    .filter(b => {
        const term = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(term) || 
               (b.style || '').toLowerCase().includes(term) ||
               (b.brewery?.name || '').toLowerCase().includes(term);
    })
    .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortOrder === 'name') return a.name.localeCompare(b.name);
        return 0;
    });

  // Derived Stats
  const stats = {
      total: brews.length,
      styles: new Set(brews.map(b => b.style || 'Other')).size
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center p-12 min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-like"></div>
        </div>
    );
  }

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
       {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
            <div>
                 <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-like bg-like/10 border border-like/20">
                        Favoriten
                    </span>
                 </div>
                <h1 className="text-3xl font-black text-text-primary tracking-tight leading-none mb-2">Deine Merkliste</h1>
                <p className="text-sm text-text-muted">Rezepte und Sude, die du mit einem "Like" markiert hast.</p>
            </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">
        
        {/* --- LEFT COLUMN: SIDEBAR --- */}
        <div className="space-y-6 lg:sticky lg:top-8 z-20">
             {/* Stats Grid */}
             <div className="grid grid-cols-2 gap-3">
                 <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-like/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-like/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="text-like text-xs font-bold uppercase tracking-wider relative z-10">Likes</div>
                    <div className="text-2xl font-mono font-bold text-like relative z-10">{stats.total}</div>
                </div>
                 <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-border-hover transition-colors">
                    <div className="text-text-muted text-xs font-bold uppercase tracking-wider relative z-10">Styles</div>
                    <div className="text-2xl font-mono font-bold text-text-secondary relative z-10">{stats.styles}</div>
                </div>
            </div>

            {/* Sort Options */}
             <div className="hidden lg:block md:bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <Filter className="w-4 h-4 text-text-muted" />
                        Sortieren
                    </h3>
                </div>
                <div className="p-2 space-y-1">
                     <button
                        onClick={() => setSortOrder('newest')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'newest' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Calendar className="w-3.5 h-3.5" />
                            Neueste zuerst
                        </div>
                        {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-like"></div>}
                     </button>
                     <button
                        onClick={() => setSortOrder('oldest')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                         <div className="flex items-center gap-3">
                             <Calendar className="w-3.5 h-3.5" />
                             Älteste zuerst
                        </div>
                        {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-like"></div>}
                     </button>
                      <button
                        onClick={() => setSortOrder('name')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'name' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                         <div className="flex items-center gap-3">
                            <Factory className="w-3.5 h-3.5" />
                            Name (A-Z)
                        </div>
                        {sortOrder === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-like"></div>}
                     </button>
                </div>
             </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Favoriten durchsuchen..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-border rounded-2xl py-2 pl-10 pr-4 text-sm text-text-primary focus:border-like/50 focus:ring-1 focus:ring-like/20 focus:outline-none transition-all placeholder:text-text-disabled"
                        />
                </div>

                <div className="lg:hidden">
                    <CustomSelect
                        value={sortOrder}
                        onChange={(val: any) => setSortOrder(val)}
                        options={[
                            { value: 'newest', label: 'Neueste zuerst' },
                            { value: 'oldest', label: 'Älteste zuerst' },
                            { value: 'name', label: 'Name (A-Z)' }
                        ]}
                    />
                </div>
            </div>

            {filteredBrews.length === 0 ? (
                <div className="text-center py-24 md:bg-surface rounded-2xl border border-border border-dashed">
                    <div className="flex justify-center mb-4 opacity-50"><Heart className="w-12 h-12 text-text-disabled" /></div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Noch keine Favoriten</h3>
                    <p className="text-text-muted mb-6 max-w-md mx-auto text-sm">
                        Du hast noch keine Rezepte geliked. Stöbere durch die Community, um interessante Sude zu finden!
                    </p>
                    <Link 
                        href="/discover" 
                        className="inline-flex items-center gap-2 px-6 py-2 bg-text-primary hover:bg-text-secondary text-background font-bold rounded-xl transition text-xs"
                    >
                        <Globe className="w-3.5 h-3.5" /> Jetzt entdecken
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBrews.map(brew => (
                        <DiscoverBrewCard key={brew.id} brew={brew} currentUserId={user?.id} />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

