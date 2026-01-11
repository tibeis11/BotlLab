'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CollectionPage() {
  const [caps, setCaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('collected_caps')
        .select(`
          collected_at,
          brews (
            id,
            name,
            style,
            cap_url,
            brew_type,
            profiles (
              brewery_name
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
    loadCollection();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 animate-pulse text-zinc-500">Lade Sammlung...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🟡</span>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">Trophäenschrank</p>
        </div>
        <h1 className="text-3xl md:text-4xl font-black">Meine Kronkorken</h1>
        <p className="text-zinc-400 mt-2">Jeder gescannte Sud hinterlässt ein digitales Sammlerstück.</p>
      </div>

      {caps.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <div className="text-6xl mb-4">🫙</div>
          <h2 className="text-xl font-bold">Noch keine Kronkorken gesammelt</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Scanne eine Flasche und klicke auf "Kronkorken einsammeln", um deine Sammlung zu starten.
          </p>
          <Link 
            href="/discover"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl transition font-bold"
          >
            Sude entdecken
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {caps.map((item, idx) => {
            const brew = item.brews;
            return (
              <div 
                key={idx} 
                className="group relative bg-zinc-950 border border-zinc-900 rounded-3xl p-6 transition hover:border-cyan-500/30 hover:bg-zinc-900 flex flex-col items-center text-center space-y-4"
              >
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition duration-500" />
                
                {/* The Cap Badge */}
                <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 shadow-xl relative flex items-center justify-center overflow-hidden z-10">
                   <div className="absolute inset-0 opacity-10 pointer-events-none">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="absolute w-0.5 h-full left-1/2 -translate-x-1/2 bg-zinc-500" style={{ transform: `rotate(${i * 30}deg)` }} />
                      ))}
                   </div>
                   {brew.cap_url ? (
                     brew.cap_url.length < 5 ? (
                       <span className="text-4xl">{brew.cap_url}</span>
                     ) : (
                       <img src={brew.cap_url} className="w-full h-full object-cover rounded-full" />
                     )
                   ) : (
                     <span className="text-2xl opacity-20">🟡</span>
                   )}
                </div>

                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase text-cyan-500 tracking-tighter mb-1">
                    {brew.style || 'Brew'}
                  </p>
                  <h3 className="font-bold text-sm line-clamp-1 group-hover:text-cyan-400 transition">
                    {brew.name}
                  </h3>
                  <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold tracking-widest">
                    {brew.profiles?.brewery_name || 'Unbekannt'}
                  </p>
                </div>
                
                <Link 
                  href={`/brew/${brew.id}`}
                  className="absolute inset-0"
                  aria-label="Sud ansehen"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
