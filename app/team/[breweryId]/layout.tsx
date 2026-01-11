'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import Logo from '@/app/components/Logo';
import { getTierConfig } from '@/lib/tier-system';

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading, signOut } = useAuth();
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  
  // Profile state for header
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const pathname = usePathname();
  
  // Use a state latch to keep the ID even if useParams flickers
  const params = useParams();
  // Initialize lazily to avoid "Waiting" state on first render if params are ready
  const [breweryId, setBreweryId] = useState<string | null>(() => {
    const initialId = params?.breweryId as string;
    return (initialId && initialId !== 'undefined') ? initialId : null;
  });

  const tierConfig = userProfile ? getTierConfig(userProfile.tier || 'lehrling') : getTierConfig('lehrling');

  useEffect(() => {
    const freshId = params?.breweryId as string;
    if (freshId && freshId !== 'undefined') {
      setBreweryId(freshId);
    }
  }, [params]);

  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
        // router.push('/login'); // Handled by pages or middleware mostly
        return;
    }

    // Load user profile for header
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setUserProfile(data);
    });

    if (breweryId) {
        loadBrewery(breweryId);
    } 
    // Do NOT set loading=false here if ID is missing. Wait for the ID latch.
    
  }, [breweryId, user, authLoading]);

  async function loadBrewery(id: string) {
    setLoading(true);
    // Use the shared supabase client which should have the session
    const { data, error } = await supabase
      .from('breweries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (data) {
      setBrewery(data);
      
      if (user) {
          const { data: member } = await supabase
              .from('brewery_members')
              .select('id')
              .eq('brewery_id', id)
              .eq('user_id', user.id)
              .maybeSingle();
          
          setIsMember(!!member);
      }
    } else {
        console.error(`Brewery not found in DB. ID: "${id}"`);
        if (error) console.error("Supabase Error:", error);
    }
    setLoading(false);
  }

  if (loading) {
      if (!breweryId && !authLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Warte auf ID...</div>;
      return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Lade Team...</div>;
  }
  
  if (!brewery) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
        <p>Brauerei nicht gefunden.</p>
        <p className="text-xs font-mono opacity-50">ID: {breweryId || 'unbekannt'}</p>
        <Link href="/dashboard" className="text-white underline">Zurück zum Dashboard</Link>
    </div>
  );

  const tabs = [
    { name: 'Dashboard', path: `/team/${breweryId}/dashboard`, icon: '📊' },
    { name: 'Feed', path: `/team/${breweryId}/feed`, icon: '💬' },
    { name: 'Rezepte', path: `/team/${breweryId}/brews`, icon: '🍺' },
    { name: 'Inventar', path: `/team/${breweryId}/inventory`, icon: '📦' },
  ];

  const adminTabs: { name: string, path: string, icon: string }[] = [];
  if(isMember) {
      adminTabs.push({ name: 'Mitglieder', path: `/team/${breweryId}/members`, icon: '👥' });
      adminTabs.push({ name: 'Einstellungen', path: `/team/${breweryId}/settings`, icon: '⚙️' });
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200">
        <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                
                {/* Left: Logo & Exit */}
                <div className="flex items-center gap-6">
                    <Link href={`/team/${breweryId}`}>
                        <Logo />
                    </Link>
                    
                    <div className="hidden md:flex gap-6 text-sm font-medium items-center border-l border-zinc-800 pl-6 h-8">
                         <Link href="/dashboard" className="hover:text-cyan-400 transition flex items-center gap-2 text-zinc-400">
                             ↩ Mein Profil
                         </Link>
                    </div>
                </div>

                {/* Right: Team Navigation & Profile */}
                <div className="flex items-center gap-6">
                    
                    {/* Desktop Tabs */}
                    <div className="hidden md:flex items-center gap-1">
                        {tabs.map(tab => {
                            const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                            return (
                                <Link 
                                    key={tab.path} 
                                    href={tab.path}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-cyan-950/50 text-cyan-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.name}</span>
                                </Link>
                            );
                        })}

                        {/* Admin Dropdown */}
                        {adminTabs.length > 0 && (
                            <div 
                                className="relative ml-2"
                                onMouseEnter={() => setShowAdminMenu(true)}
                                onMouseLeave={() => setShowAdminMenu(false)}
                            >
                                <button className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${showAdminMenu ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}>
                                    <span>☰</span>
                                </button>
                                
                                {showAdminMenu && (
                                    <div className="absolute right-0 top-full pt-2 w-48 z-40">
                                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                            {adminTabs.map(tab => {
                                                const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                                                return (
                                                    <Link 
                                                        key={tab.path} 
                                                        href={tab.path}
                                                        className={`px-4 py-3 text-sm font-bold transition-all flex items-center gap-3 ${isActive ? 'bg-cyan-950/30 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                                                    >
                                                        <span>{tab.icon}</span>
                                                        <span>{tab.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-zinc-800 mx-2 hidden md:block"></div>

                    {/* Profile Menu */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setShowProfileMenu(true)}
                        onMouseLeave={() => setShowProfileMenu(false)}
                    >
                        <button className="flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition group">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg"
                                style={{ backgroundColor: `${tierConfig.color}20` }}
                            >
                                <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierConfig.color }}></div>
                                <img src={tierConfig.avatarPath} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col items-start leading-none hidden md:flex">
                                <span className="truncate max-w-[120px] font-bold text-white text-sm">
                                    {userProfile?.display_name || 'Profil'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5" style={{ color: tierConfig.color }}>
                                    {tierConfig.displayName}
                                </span>
                            </div>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 top-full pt-2 w-56 z-50">
                                <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Angemeldet als</p>
                                        <p className="font-bold text-white truncate">{userProfile?.display_name || user?.email}</p>
                                    </div>

                                    <div className="md:hidden border-b border-zinc-800">
                                        {/* Mobile Logic could go here, for now just profile actions */}
                                    </div>

                                    <Link
                                        href="/dashboard"
                                        className="block w-full px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-900 transition text-sm font-medium flex items-center gap-2 text-left"
                                    >
                                        � Mein Profil
                                    </Link>

                                    <button
                                        onClick={() => signOut()}
                                        className="block w-full px-4 py-3 text-red-400 hover:bg-red-500/10 transition text-sm font-medium flex items-center gap-2 text-left border-t border-zinc-800"
                                    >
                                        🚪 Abmelden
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
            {/* Context Banner - Simplified since Nav is now in Header */}
            {pathname === `/team/${breweryId}` && (
                <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-24 h-24 bg-zinc-900 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl border border-zinc-800 shadow-xl relative overflow-hidden ring-4 ring-black">
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
            )}

            {children}
        </main>
    </div>
  );
}
