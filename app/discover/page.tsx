'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Header from '../components/Header';

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
  breweries?: any; // Handling Supabase's tendency to return arrays for joins
  ratings?: { rating: number }[] | null;
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
    const { data } = await supabase
      .from('brews')
      .select('id,name,style,image_url,created_at,user_id,brew_type,data,remix_parent_id,breweries(name,logo_url),ratings(rating)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    setBrews((data || []) as Brew[]);
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
            {list.map(brew => {
              const brewery = Array.isArray(brew.breweries) ? brew.breweries[0] : brew.breweries;
              const rs = brew.ratings || [];
              const avg = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;

              return (
              <Link
                key={brew.id}
                href={`/brew/${brew.id}`}
                className="group bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg hover:border-zinc-600 transition flex flex-col h-full"
              >
                {/* Main Image Area */}
                <div className="aspect-video relative bg-zinc-950 overflow-hidden">
                  {brew.image_url ? (
                    <img
                        src={brew.image_url}
                        alt={brew.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950/50">
                        <span className="text-5xl mb-3 grayscale opacity-30">🍺</span>
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Kein Label</span>
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  
                  {/* Top Left: Style Badge */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
                    <span className="bg-black/80 backdrop-blur-md text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider border border-white/5 font-bold text-white shadow-sm">
                        {brew.style || 'Standard'}
                    </span>
                  </div>

                  {/* Top Right: Remix Badge */}
                  {brew.remix_parent_id && (
                    <div className="absolute top-3 right-3 z-10">
                       <span className="bg-black/60 backdrop-blur-md text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider border border-purple-500/30 font-bold text-purple-400 shadow-sm">
                            Remix
                        </span>
                    </div>
                  )}

                  {/* Bottom Right: Rating Badge */}
                   {avg > 0 && (
                        <div className="absolute bottom-3 right-3 pointer-events-none z-10">
                            <div className="bg-black/80 backdrop-blur-md text-amber-400 font-black px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/5 shadow-lg">
                                <span>⭐</span>
                                <span className="text-white">{avg.toFixed(1)}</span>
                                <span className="text-zinc-500 font-normal">({rs.length})</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col flex-1 gap-4">
                    <div>
                        <h3 className="font-black text-xl leading-tight text-white group-hover:text-cyan-400 transition line-clamp-2 mb-2">
                            {brew.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            {brewery?.logo_url ? (
                                <img src={brewery.logo_url} className="w-5 h-5 rounded-full object-cover border border-zinc-800" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] border border-zinc-700">🏭</div>
                            )}
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">
                                {brewery?.name || 'Unbekannt'}
                            </span>
                        </div>
                    </div>
                    
                </div>
              </Link>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
