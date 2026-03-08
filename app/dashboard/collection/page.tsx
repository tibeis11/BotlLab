'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import CrownCap from '@/app/components/CrownCap';
import CustomSelect from '@/app/components/CustomSelect';
import { 
    Search, 
    Filter,  
    Crown, 
    Factory, 
    Calendar,
    ArrowUpDown
} from 'lucide-react';

export default function CollectionPage() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [caps, setCaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

  useEffect(() => {
    async function loadCollection() {
      if (!user) return;

      const { data, error } = await supabase
        .from('collected_caps')
        .select(`
          collected_at,
          cap_tier,
          brews (
            id,
            name,
            style,
            cap_url,
            brew_type,
            remix_parent_id,
            profiles (
              display_name,
              logo_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('collected_at', { ascending: false });

      if (!error && data) {
        setCaps(data);
      }
      setLoading(false);
    }
    if (user) loadCollection();
  }, [user]);

  // Derived Stats
  const stats = {
      total: caps.length,
      breweries: new Set(caps.map(c => c.brews?.profiles?.display_name)).size
  };

  // Filter & Sort
  const filteredCaps = caps
    .filter(c => {
        if (!c.brews) return false;
        const term = searchQuery.toLowerCase();
        return c.brews.name.toLowerCase().includes(term) || 
               (c.brews.style || '').toLowerCase().includes(term) ||
               (c.brews.profiles?.display_name || '').toLowerCase().includes(term);
    })
    .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime();
        if (sortOrder === 'oldest') return new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime();
        if (sortOrder === 'name') return (a.brews?.name || '').localeCompare(b.brews?.name || '');
        return 0;
    });

  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
     );
  }

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
            <div>
                 <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-accent-purple bg-surface border border-border-subtle">
                        Trophäenschrank
                    </span>
                 </div>
                <h1 className="text-3xl font-black text-text-primary tracking-tight leading-none mb-2">Meine Sammlung</h1>
                <p className="text-sm text-text-muted">Deine persönliche Reise durch die Welt der Craft-Getränke.</p>
            </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">
        
        {/* --- LEFT COLUMN: SIDEBAR --- */}
        <div className="space-y-6 lg:sticky lg:top-8 z-20">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                 <div className="bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-border-hover transition-colors">
                    <div className="text-text-muted text-xs font-bold uppercase tracking-wider relative z-10">Kronkorken</div>
                    <div className="text-2xl font-mono font-bold text-brand relative z-10">{stats.total}</div>
                </div>
                 <div className="bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-border-hover transition-colors">
                    <div className="text-text-muted text-xs font-bold uppercase tracking-wider relative z-10">Brauereien</div>
                    <div className="text-2xl font-mono font-bold text-text-secondary relative z-10">{stats.breweries}</div>
                </div>
            </div>

            {/* Sort & Filters */}
            <div className="hidden lg:block bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between">
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
                        {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                     </button>
                     <button
                        onClick={() => setSortOrder('oldest')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                        <div className="flex items-center gap-3">
                             <Calendar className="w-3.5 h-3.5" />
                             Älteste zuerst
                        </div>
                        {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                     </button>
                     <button
                        onClick={() => setSortOrder('name')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'name' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                         <div className="flex items-center gap-3">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            Name (A-Z)
                        </div>
                        {sortOrder === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                     </button>
                </div>
            </div>
            


        </div>

        {/* --- MAIN CONTENT: GRID --- */}
        <div className="space-y-6">
             {/* Search */}
             <div className="flex flex-col gap-4">
                <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Sammlung durchsuchen..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary focus:border-brand/50 focus:ring-1 focus:ring-brand/20 focus:outline-none transition-all placeholder:text-text-disabled"
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

            {filteredCaps.length === 0 ? (
                 <div className="bg-surface border border-border rounded-2xl p-16 text-center space-y-6">
                    <div className="flex justify-center mb-4 opacity-50"><Crown className="w-12 h-12 text-text-disabled" strokeWidth={1} /></div>
                    <h2 className="text-xl font-bold text-text-primary">Noch leer hier</h2>
                    <p className="text-text-muted max-w-md mx-auto text-sm">
                        Keine Ergebnisse gefunden. Scanne Getränke, um deine Sammlung zu erweitern.
                    </p>
                    {caps.length === 0 && (
                        <div className="pt-4">
                            <Link 
                                href="/discover"
                                className="inline-flex items-center justify-center px-6 py-2 rounded-xl bg-brand text-background text-xs font-bold hover:opacity-90 transition"
                            >
                                Rezepte entdecken
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCaps.map((item, idx) => {
                    const brew = item.brews;
                    const profile = brew?.profiles;
                    
                    if (!brew) return null;

                    return (
                    <Link
                        key={idx}
                        href={`/brew/${brew.id}`}
                        className="group bg-surface border border-border hover:border-border-hover rounded-2xl p-6 flex flex-col items-center transition-all hover:bg-surface-hover"
                    >
                        {/* Cap Visualization */}
                        <div className="relative mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                            <div className="absolute inset-0 bg-brand/20 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-all duration-700" />
                            <CrownCap 
                                content={brew.cap_url} 
                                tier={(item.cap_tier as import('@/lib/cap-tier').CapTier) ?? 'zinc'} 
                                size="md"
                                className="drop-shadow-2xl"
                            />
                        </div>

                        {/* Info */}
                        <div className="text-center w-full space-y-1 z-10">
                            <h3 className="font-bold text-sm text-text-primary leading-tight group-hover:text-brand transition-colors line-clamp-1">
                                {brew.name}
                            </h3>
                            
                            <div className="flex items-center justify-center gap-1.5 opacity-60">
                                <span className="text-[10px] font-bold tracking-normal text-text-muted">
                                    {(brew.style || 'Standard').toUpperCase()}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border-subtle mt-3">
                                {profile?.logo_url ? (
                                    <img src={profile.logo_url} className="w-4 h-4 rounded-full grayscale group-hover:grayscale-0 transition-all opacity-50 group-hover:opacity-100" />
                                ) : <Factory className="w-3 h-3 text-text-disabled" />}
                                <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider truncate max-w-full">
                                    {profile?.display_name || 'Unbekannt'}
                                </span>
                            </div>
                        </div>
                    </Link>
                    );
                })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

