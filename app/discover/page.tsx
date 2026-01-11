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
        ) : list.length === 0 ? (
          <div className="text-center p-12 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-zinc-500">Keine Rezepte gefunden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map(brew => (
              <Link key={brew.id} href={`/brew/${brew.id}`} className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition">
                <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                  {brew.image_url ? (
                    <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-700">🍺</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                    <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
                      {brew.brew_type === 'beer' ? '🍺 Bier' : 
                      brew.brew_type === 'wine' ? '🍷 Wein' : 
                      brew.brew_type === 'cider' ? '🍎 Cider' :
                      brew.brew_type === 'mead' ? '🍯 Met' :
                      brew.brew_type === 'softdrink' ? '🥤 Softdrink' : '🍺'}
                    </span>

                    {brew.remix_parent_id ? (
                        <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-amber-500 text-[10px] font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
                          ♻️ Remix
                        </span>
                    ) : (
                        <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-emerald-500 text-[10px] font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
                          ✓ Original
                        </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const brewery = Array.isArray(brew.breweries) ? brew.breweries[0] : brew.breweries;
                      return (
                        <>
                          {brewery?.logo_url ? (
                            <img src={brewery.logo_url} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">🏭</div>
                          )}
                          <div className="flex-1 truncate">
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">{brewery?.name || 'Unbekannte Brauerei'}</p>
                            <h3 className="font-bold text-white truncate">{brew.name}</h3>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center justify-between text-sm text-zinc-400">
                    <span>{brew.style || '—'}</span>
                    <span>
                      {(() => {
                        const rs = brew.ratings || [];
                        const avg = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;
                        return (
                          <span className="flex items-center gap-1">
                            <span className={avg > 0 ? 'text-yellow-500' : 'text-zinc-600'}>★</span>
                            <span className="text-white font-bold">{avg.toFixed(1)}</span>
                            <span className="text-zinc-500">({rs.length})</span>
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
