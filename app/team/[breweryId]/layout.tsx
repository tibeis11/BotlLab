'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function TeamLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ breweryId: string }>;
}) {
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const pathname = usePathname();
  const { breweryId } = use(params);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (breweryId) loadBrewery();
  }, [breweryId]);

  async function loadBrewery() {
    setLoading(true);
    const { data, error } = await supabase
      .from('breweries')
      .select('*')
      .eq('id', breweryId)
      .maybeSingle();
      
    if (data) {
      setBrewery(data);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data: member } = await supabase
              .from('brewery_members')
              .select('id')
              .eq('brewery_id', breweryId)
              .eq('user_id', user.id)
              .maybeSingle();
          
          setIsMember(!!member);
      }
    } else {
        console.error("Brewery not found", error);
    }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Lade Team...</div>;
  if (!brewery) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Brauerei nicht gefunden.</div>;

  const tabs = [
    { name: 'Rezepte', path: `/team/${breweryId}/brews` },
    { name: 'Inventar', path: `/team/${breweryId}/inventory` },
  ];

  if (isMember) {
      tabs.push({ name: 'Mitglieder', path: `/team/${breweryId}/members` });
      tabs.push({ name: 'Einstellungen', path: `/team/${breweryId}/settings` });
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200">
        <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="font-black text-xl tracking-tighter text-white">BotlLab</Link>
                <div className="flex gap-4">
                     <Link href="/dashboard" className="text-sm font-bold text-zinc-500 hover:text-white transition">Dashboard</Link>
                </div>
            </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
            <div className="mb-12 text-center">
                <div className="w-24 h-24 bg-zinc-900 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl border border-zinc-800 shadow-xl relative overflow-hidden">
                    {brewery.logo_url ? (
                        <img src={brewery.logo_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <span>🍺</span>
                    )}
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight mb-2">{brewery.name}</h1>
                <p className="text-zinc-500 flex items-center justify-center gap-2">
                    Brauerei Profil
                    {isMember && <span className="bg-cyan-950 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-cyan-900">Member</span>}
                </p>
            </div>

            <div className="flex justify-center mb-8">
                <div className="bg-zinc-900/50 p-1 rounded-xl flex gap-1 border border-zinc-800 backdrop-blur-sm flex-wrap justify-center">
                    {tabs.map(tab => {
                        const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                        return (
                            <Link 
                                key={tab.path} 
                                href={tab.path}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${isActive ? 'bg-cyan-950 text-cyan-400 shadow-lg shadow-cyan-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                            >
                                {tab.name}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {children}
        </main>
    </div>
  );
}
