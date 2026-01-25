'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import BrewCard from '../components/BrewCard';
import CustomSelect from '../components/CustomSelect';

type Brew = {
  id: string;
  name: string;
  style: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  brew_type?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  remix_parent_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breweries?: any; 
  ratings?: { rating: number }[] | null;
  likes_count?: number; 
  user_has_liked?: boolean;
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
      .select('id,name,style,image_url,created_at,user_id,brew_type,data,remix_parent_id,moderation_status,breweries(name,logo_url),ratings(rating),likes_count')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading brews:', JSON.stringify(error, null, 2));
    }

    let brewsData = (data || []) as Brew[];

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
        brewery: b.breweries ? { name: b.breweries.name, logo_url: b.breweries.logo_url } : undefined
      }));
    } else {
      // For guests, none are liked
      brewsData = brewsData.map(b => ({
        ...b,
        user_has_liked: false,
        brewery: b.breweries ? { name: b.breweries.name, logo_url: b.breweries.logo_url } : undefined
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

  const Section = ({ title, items }: { title: string, items: Brew[] }) => (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        {title}
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full font-normal">Top 10</span>
      </h2>
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 md:scrollbar md:scrollbar-thumb-zinc-700 md:scrollbar-track-zinc-900 md:scrollbar-thin md:pb-2 md:mb-2 md:border-b md:border-zinc-800 md:-mx-6 md:px-6">
        {items.map(brew => (
          <div key={brew.id} className="min-w-[280px] w-[280px] snap-center">
            <BrewCard brew={brew} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 pt-28">
        <header className="mb-8">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">Discover</p>
          <h1 className="text-4xl font-black">Finde neue Kreationen</h1>
          <p className="text-zinc-400 mt-2">Öffentliche Rezepte der Community – sortiere nach Stil, Bewertung oder Neuheit.</p>
        </header>

        {/* Controls */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name oder Stil..."
            className="bg-zinc-950 border-2 border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-cyan-600 h-12 text-sm font-bold text-white transition-all"
          />
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
                 <Section title="🔥 Gerade angesagt" items={trending} />
                 <Section title="⭐ Am besten bewertet" items={topRated} />
                 <Section title="✨ Neuheiten" items={newest} />
                 
                 <div className="mt-16 pt-8 border-t border-zinc-800">
                    <h2 className="text-2xl font-bold mb-6">Alle Rezepte</h2>
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
    </div>
  );
}
