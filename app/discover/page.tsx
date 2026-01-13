'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import BrewCard from '../components/BrewCard';

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
  likes?: { count: number }[] | null;
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
      .select('id,name,style,image_url,created_at,user_id,brew_type,data,remix_parent_id,breweries(name,logo_url),ratings(rating),likes(count)')
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
        user_has_liked: likedIds.has(b.id)
      }));
    } else {
      // For guests, none are liked
      brewsData = brewsData.map(b => ({
        ...b,
        user_has_liked: false
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

  const list = useMemo(() => {
    let items = brews.filter(b => {
      const matchesSearch = !search || (b.name?.toLowerCase().includes(search.toLowerCase()) || (b.style||'').toLowerCase().includes(search.toLowerCase()));
      const matchesStyle = styleFilter === 'all' || b.style === styleFilter;
      return matchesSearch && matchesStyle;
    });

    const avg = (b: Brew) => {
      const rs = b.ratings || [];
      if (rs.length === 0) return 0;
      return Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10;
    };

    if (sort === 'top') items = items.sort((a, b) => avg(b) - avg(a));
    if (sort === 'most_rated') items = items.sort((a, b) => (b.ratings?.length||0) - (a.ratings?.length||0));
    if (sort === 'newest') items = items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  }, [brews, search, styleFilter, sort]);

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
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:border-cyan-600"
          />
          <select
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2"
          >
            {styles.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'Alle Stile' : s}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2"
          >
            <option value="top">Top bewertet</option>
            <option value="most_rated">Meist bewertet</option>
            <option value="newest">Neueste</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-zinc-900/40 rounded-2xl border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
            {list.map(brew => (
              <BrewCard key={brew.id} brew={brew} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
