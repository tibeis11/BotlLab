'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import BrewCard from '../components/BrewCard';
import CustomSelect from '../components/CustomSelect';
import { Flame, Star, Sparkles, Search, Filter } from 'lucide-react';

type Brew = {
  id: string;
  name: string;
  style: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  brew_type?: string | null;
  abv?: number;
  ibu?: number;
  ebc?: number;
  original_gravity?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  remix_parent_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breweries?: any; 
  ratings?: { rating: number }[] | null;
  likes_count?: number; 
  user_has_liked?: boolean;
  brewery?: { id: string; name: string; team_name?: string; logo_url?: string } | null;
};

export default function DiscoverPage() {
  // Singleton imported
  const [brews, setBrews] = useState<Brew[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [sort, setSort] = useState<'newest'|'top'|'most_rated'>('top');

  useEffect(() => {
    loadBrews();
  }, []);

  async function loadBrews() {
    setLoading(true);
    
    // 1. Get current user to check for owned likes
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Fetch public brews
    const { data, error } = await supabase
      .from('brews')
      .select('id,name,style,image_url,created_at,user_id,brew_type,data,remix_parent_id,moderation_status,breweries!left(id,name,logo_url),ratings(rating),likes_count')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading brews:', JSON.stringify(error, null, 2));
    }

    let brewsData = (data || []).map(b => {
      return {
        ...b,
        abv: b.data?.abv ? parseFloat(b.data.abv) : undefined,
        ibu: b.data?.ibu ? parseInt(b.data.ibu, 10) : undefined,
        ebc: b.data?.color ? parseInt(b.data.color, 10) : undefined,
        original_gravity: b.data?.original_gravity || b.data?.og || b.data?.plato ? parseFloat(String(b.data.original_gravity || b.data.og || b.data.plato)) : undefined,
        brewery: Array.isArray(b.breweries) ? b.breweries[0] : b.breweries,
      };
    }) as Brew[];

    // 3. If logged in, cross-reference likes
    if (user) {
      const { data: likesData } = await supabase
        .from('likes')
        .select('brew_id')
        .eq('user_id', user.id);

      const likedIds = new Set((likesData || []).map((l: any) => l.brew_id));

      brewsData = brewsData.map(b => ({
        ...b,
        user_has_liked: likedIds.has(b.id),
      }));
    } else {
      // For guests, none are liked
      brewsData = brewsData.map(b => ({
        ...b,
        user_has_liked: false,
      }));
    }
    
    setBrews(brewsData);
    setLoading(false);
  }

  const styles = useMemo(() => {
    const s = new Set<string>();
    brews.forEach(b => { if (b.style) s.add(b.style); });
    return ['all', ...Array.from(s).sort()];
  }, [brews]);

  const avg = (b: Brew) => {
    const rs = b.ratings || [];
    if (rs.length === 0) return 0;
    return Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10;
  };

  const trending = useMemo(() => {
    return [...brews].sort((a,b) => (b.likes_count||0) - (a.likes_count||0)).slice(0, 10);
  }, [brews]);

  const topRated = useMemo(() => {
    return [...brews]
      .filter(b => (b.ratings?.length || 0) > 0)
      .sort((a,b) => avg(b) - avg(a))
      .slice(0, 10);
  }, [brews]);

  const newest = useMemo(() => {
    return [...brews].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  }, [brews]);

  const isFiltering = search.length > 0 || styleFilter !== 'all';

  const list = useMemo(() => {
    let items = brews.filter(b => {
      const matchesSearch = !search || (b.name?.toLowerCase().includes(search.toLowerCase()) || (b.style||'').toLowerCase().includes(search.toLowerCase()));
      const matchesStyle = styleFilter === 'all' || b.style === styleFilter;
      return matchesSearch && matchesStyle;
    });

    if (sort === 'top') items = items.sort((a, b) => avg(b) - avg(a));
    if (sort === 'most_rated') items = items.sort((a, b) => (b.ratings?.length || 0) - (a.ratings?.length || 0));
    if (sort === 'newest') items = items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  }, [brews, search, styleFilter, sort]);

  const styleOptions = styles.map(s => ({
      value: s,
      label: s === 'all' ? 'Alle Stile' : s
  }));

  const sortOptions = [
      { value: 'top', label: 'Top bewertet' },
      { value: 'most_rated', label: 'Meist bewertet' },
      { value: 'newest', label: 'Neueste' }
  ];

  const Section = ({ title, items, icon }: { title: string, items: Brew[], icon: React.ReactNode }) => (
    <div className="mb-12">
      <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3 text-white">
        <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
            {icon}
        </div>
        {title}
        <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded ml-auto md:ml-2 font-mono uppercase tracking-wider">Top 10</span>
      </h2>
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 md:scrollbar md:scrollbar-thumb-zinc-700 md:scrollbar-track-zinc-900 md:scrollbar-thin md:pb-2 md:mb-2 md:border-b md:border-zinc-900 md:-mx-6 md:px-6">
        {items.map(brew => (
          <div key={brew.id} className="min-w-[280px] w-[280px] snap-center">
            <BrewCard brew={brew} forceVertical />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-800 pb-8 mb-8">
            <div>
                 <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">Discover</p>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Finde neue Kreationen</h1>
                 <p className="text-zinc-400 max-w-xl">
                    Öffentliche Rezepte der Community – sortiere nach Stil, Bewertung oder Neuheit.
                 </p>
            </div>
        </header>

        {/* Controls */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche nach Name oder Stil..."
                className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-cyan-800 focus:ring-1 focus:ring-cyan-800 h-full text-sm font-medium text-white transition-all placeholder:text-zinc-600"
            />
          </div>
          <CustomSelect
            value={styleFilter}
            onChange={setStyleFilter}
            options={styleOptions}
            placeholder="Stil wählen"
          />
          <CustomSelect
            value={sort}
            onChange={(val) => setSort(val as 'newest' | 'top' | 'most_rated')}
            options={sortOptions}
            placeholder="Sortierung"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-zinc-900/40 rounded-2xl border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div>
            {!isFiltering ? (
              <div className="space-y-4">
                 <Section icon={<Flame className="w-5 h-5 text-orange-500" />} title="Gerade angesagt" items={trending} />
                 <Section icon={<Star className="w-5 h-5 text-yellow-500" />} title="Am besten bewertet" items={topRated} />
                 <Section icon={<Sparkles className="w-5 h-5 text-purple-500" />} title="Neuheiten" items={newest} />
                 
                 <div className="mt-16 pt-8 border-t border-zinc-900">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                            <Filter className="w-5 h-5 text-zinc-400" />
                        </div>
                        Alle Rezepte
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
                      {list.map(brew => (
                        <BrewCard key={brew.id} brew={brew} />
                      ))}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
                {list.length > 0 ? (
                  list.map(brew => (
                    <BrewCard key={brew.id} brew={brew} />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center text-zinc-500">
                    Keine Rezepte gefunden.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
