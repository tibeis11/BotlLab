'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import CrownCap from '@/app/components/CrownCap';

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

  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin text-4xl">🟡</div>
        </div>
     );
  }

  return (
    <div className="space-y-12">
      
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
        <div>
           <div className="flex items-center gap-2 mb-4">
              <span className="text-purple-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-purple-950/30 border border-purple-500/20 shadow-sm shadow-purple-900/20">
                  Trophäenschrank
              </span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Meine Sammlung</h1>
           <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
             Deine persönliche Reise durch die Welt der Craft-Getränke. 
             Hier werden alle Kronkorken aufbewahrt, die du gescannt hast.
           </p>
        </div>
        
        <div className="lg:justify-self-end">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col min-w-[200px]">
               <span className="text-xs uppercase font-bol text-zinc-500 tracking-widest mb-1">Gesamt</span>
               <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-white">{caps.length}</span>
                   <span className="text-sm text-zinc-500 font-bold">Kronkorken</span>
               </div>
            </div>
        </div>
      </div>

      {caps.length === 0 ? (
        <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl p-16 text-center space-y-6">
          <div className="text-7xl mb-6 opacity-50">🫙</div>
          <h2 className="text-2xl font-black text-white">Noch leer hier</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            Scanne eine Flasche und klicke auf <span className="text-amber-400 font-bold">"Kronkorken einsammeln"</span>, um deine Trophäensammlung zu starten.
          </p>
          <div className="pt-4">
              <Link 
                href="/discover"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-zinc-100 text-black font-bold hover:bg-white transition"
              >
                Rezepte entdecken
              </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {caps.map((item, idx) => {
            const brew = item.brews;
            const profile = brew?.profiles;
            
            if (!brew) return null;

            return (
              <Link
                key={idx}
                href={`/brew/${brew.id}`}
                className="group relative flex flex-col items-center"
              >
                {/* Cap Container */}
                <div className="relative mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                   {/* Glow Effect */}
                   <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                   
                   <CrownCap 
                     content={brew.cap_url} 
                     tier="zinc" // Defaulting to zinc for uniform look, or could be dynamic
                     size="md"
                     className="drop-shadow-2xl"
                   />

                   {/* Remix Badge (Floating near cap) */}
                   {brew.remix_parent_id && (
                     <div className="absolute -top-2 -right-2 bg-purple-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-400/50 shadow-lg transform rotate-12">
                        Remix
                     </div>
                   )}
                </div>

                {/* Content Section */}
                <div className="text-center w-full px-1 space-y-1.5 z-10">
                    <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                         <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                            {brew.style || 'Standard'}
                         </span>
                    </div>

                    <h3 className="font-bold text-sm text-white leading-tight group-hover:text-amber-400 transition-colors line-clamp-2 min-h-[2.5em]">
                        {brew.name}
                    </h3>

                    <div className="flex items-center justify-center gap-1.5 pt-1">
                        {profile?.logo_url ? (
                            <img src={profile.logo_url} className="w-4 h-4 rounded-full opacity-50 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                        ) : null}
                         <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider truncate max-w-full">
                            {profile?.display_name || 'Unbekannt'}
                        </span>
                    </div>
                </div>

                {/* Date Collected Tooltip/Badge Style */}
                <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-full shadow-xl">
                        {new Date(item.collected_at).toLocaleDateString()}
                    </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
