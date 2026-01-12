'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import CrownCap from '@/app/components/CrownCap';
import { useAuth } from '@/app/context/AuthContext';

export default function CollectionPage() {
  const { user } = useAuth();
  const [caps, setCaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
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
              display_name
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

  if (loading) {
    return <div className="flex items-center justify-center py-20 animate-pulse text-zinc-500">Lade Sammlung...</div>;
  }

  return (
    <div className="space-y-10 py-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-xl border border-cyan-500/20">🟡</div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">Trophäenschrank</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Meine Sammlung</h1>
          <p className="text-zinc-500 mt-3 max-w-lg leading-relaxed">
            Deine Reise durch die Welt der Craft-Getränke. Jeder gesammelte Kronkorken erzählt eine eigene Geschichte.
          </p>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-inner">
           <div className="text-left">
              <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Gesamt</p>
              <p className="text-2xl font-black text-white">{caps.length}</p>
           </div>
           <div className="h-8 w-px bg-zinc-800" />
           <div className="text-2xl">🏆</div>
        </div>
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
            Rezepte entdecken
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {caps.map((item, idx) => {
            const brew = item.brews;
            return (
              <div 
                key={idx} 
                className="group relative flex flex-col items-center"
              >
                {/* Visual Anchor */}
                <div className="relative mb-4">
                   <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                   <CrownCap 
                     content={brew.cap_url} 
                     tier="silver" 
                     size="md"
                     className="transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12 z-10"
                   />
                </div>

                <div className="text-center space-y-1 w-full px-2">
                  <p className="text-[10px] font-black uppercase text-cyan-500 tracking-tighter line-clamp-1">
                    {brew.style || 'Brew'}
                  </p>
                  <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">
                    {brew.name}
                  </h3>
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest flex items-center justify-center gap-1">
                    <span className="opacity-50">BY</span> {brew.profiles?.display_name || 'Anonymous'}
                  </p>
                </div>
                
                <Link 
                  href={`/brew/${brew.id}`}
                  className="absolute inset-0 z-20"
                  aria-label="Rezept ansehen"
                />
                
                {/* Date Badge */}
                <div className="absolute -top-2 -right-2 bg-zinc-900 border border-zinc-800 text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded-md text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                   {new Date(item.collected_at).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
