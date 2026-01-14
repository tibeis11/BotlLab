'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Logo from '../../components/Logo';
import NotificationBell from '../../components/NotificationBell';
import { supabase, getActiveBrewery, getUserBreweries } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { getTierConfig } from '@/lib/tier-system';

export default function AdminHeader() {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const [userName, setUserName] = useState<string | null>(null);
  const [tierData, setTierData] = useState<{ path: string, color: string, name: string } | null>(null);
  const [breweryId, setBreweryId] = useState<string | null>(null);
  const [activeBreweryName, setActiveBreweryName] = useState<string | null>(null);
  const [userBreweries, setUserBreweries] = useState<any[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBreweryMenu, setShowBreweryMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    async function fetchUserData() {
      if (!user) return;

      try {
        // Fetch User Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, tier')
          .eq('id', user.id)
          .single();
          
        if (!isMounted) return;
        
        if (profile) {
          setUserName(profile.display_name || user.email?.split('@')[0] || 'Brauer');
          const config = getTierConfig(profile.tier || 'lehrling');
          setTierData({
              path: config.avatarPath,
              color: config.color,
              name: config.displayName
          });
        }

        // 1. Get all breweries for the user
        const allBreweries = await getUserBreweries(user.id);
        if (isMounted) setUserBreweries(allBreweries);

        // 2. Determine active brewery
        // Priority: URL Param > Default Active (from DB)
        const paramBreweryId = searchParams.get('breweryId');
        let selectedBrewery = null;

        if (paramBreweryId) {
            selectedBrewery = allBreweries.find(b => b.id === paramBreweryId);
        }

        if (!selectedBrewery) {
             // Fallback to DB active brewery
             selectedBrewery = await getActiveBrewery(user.id);
        }

        // If still nothing, maybe just take the first one from the list?
        if (!selectedBrewery && allBreweries.length > 0) {
            selectedBrewery = allBreweries[0];
        }

        if (isMounted && selectedBrewery) {
          setBreweryId(selectedBrewery.id);
          setActiveBreweryName(selectedBrewery.name);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading header data:', err);
        }
      }
    }

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [user, searchParams]);

  async function handleLogout() {
    await signOut();
    // Router push is handled in AuthContext, but just in case:
    // router.push('/login'); 
  }

  function handleSwitchBrewery(id: string) {
    if (id === breweryId) return;
    
    // Construct new URL with param
    const params = new URLSearchParams(searchParams.toString());
    params.set('breweryId', id);
    
    router.push(`${pathname}?${params.toString()}`);
    setShowBreweryMenu(false);
    setIsMobileMenuOpen(false);
  }

  const tabs = [
    { name: 'Sammlung', path: '/dashboard/collection', icon: '🏅' },
    { name: 'Favoriten', path: '/dashboard/favorites', icon: '❤️' },
    { name: 'Achievements', path: '/dashboard/achievements', icon: '🏆' },
  ];

  return (
    <nav className="border-b border-zinc-900 bg-zinc-950/80 p-3 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Logo />
          </Link>

          {/* Left Desktop Navigation (External Context) */}
          <div className="hidden lg:flex gap-6 text-sm font-medium items-center border-l border-zinc-800 pl-6 h-8">
            <Link href="/discover" className="hover:text-cyan-400 text-zinc-400 transition flex items-center gap-2" title="Entdecken">
              <span>🌍</span>
              <span className="hidden xl:inline">Entdecken</span>
            </Link>
          </div>
        </div>
        
        {/* Desktop Navigation (Dashboard Context) */}
        <div className="hidden lg:flex gap-1 text-sm font-medium items-center">
          
          {/* Manual Dashboard Link */}
          <Link 
            href="/dashboard" 
            title="Dashboard"
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname === '/dashboard' ? 'bg-cyan-950/50 text-cyan-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
          >
            <span>📊</span>
            <span className="hidden xl:inline">Dashboard</span>
          </Link>

          {/* Team Dropdown (Moved from Left) */}
          {breweryId && (
              <div 
                className="relative group"
                onMouseEnter={() => setShowBreweryMenu(true)}
                onMouseLeave={() => setShowBreweryMenu(false)}
              >
                <button 
                  title="Team"
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname.startsWith('/team') ? 'bg-cyan-950/50 text-cyan-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
                >
                    <span>🏭</span>
                    <span className="hidden xl:inline">Team</span>
                    <span className="text-[10px] ml-1">▼</span>
                </button>
                
                {showBreweryMenu && (
                    <div className="absolute left-0 top-full pt-2 w-64 z-50">
                         <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                             
                             {/* Active Team Section */}
                             <div className="p-1">
                                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/50">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-1">
                                        Aktives Team
                                    </p>
                                    <p className="font-bold text-white text-sm truncate mb-3">
                                        {activeBreweryName || 'Brauerei'}
                                    </p>
                                    <Link 
                                        href={`/team/${breweryId}`} 
                                        className="block w-full text-center py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-400 font-bold text-xs transition border border-cyan-900/50 hover:border-cyan-700"
                                    >
                                        Team-Dashboard öffnen
                                    </Link>
                                </div>
                             </div>

                             {userBreweries.length > 1 && (
                                <div className="bg-zinc-900/50 border-t border-zinc-800 p-1">
                                 <p className="px-3 py-2 text-[10px] text-zinc-600 uppercase font-bold">Zu anderem Team wechseln</p>
                                 {userBreweries.filter(b => b.id !== breweryId).map(b => (
                                     <button
                                        key={b.id}
                                        onClick={() => handleSwitchBrewery(b.id)}
                                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-800 hover:text-white text-zinc-400 transition flex items-center gap-2 group"
                                     >
                                        <span className="opacity-50 group-hover:opacity-100 transition">↳</span>
                                        <span className="truncate">{b.name}</span>
                                     </button>
                                 ))}
                                </div>
                             )}
                        </div>
                    </div>
                )}
              </div>
          )}

          {tabs.map(tab => {
            // Dashboard root matches only exact, others match prefix
            const isActive = tab.path === '/dashboard' 
              ? pathname === '/dashboard'
              : (pathname === tab.path || pathname?.startsWith(tab.path + '/'));
              
            return (
              <Link 
                key={tab.path} 
                href={tab.path} 
                title={tab.name}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-cyan-950/50 text-cyan-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
              >
                <span>{tab.icon}</span>
                <span className="hidden xl:inline">{tab.name}</span>
              </Link>
            );
          })}
          
          <div className="h-4 w-px bg-zinc-800 mx-2"></div>

          <NotificationBell />
          
          {/* Profile Menu */}
          <div 
            className="relative"
            onMouseEnter={() => setShowProfileMenu(true)}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <button className="flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition group">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg"
                style={{ backgroundColor: tierData ? `${tierData.color}20` : '#333' }}
              >
                  <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierData?.color || '#555' }}></div>
                  <img src={tierData?.path || '/tiers/lehrling.png'} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="hidden xl:flex flex-col items-start leading-none">
                <span className="truncate max-w-[120px] font-bold text-white text-sm">
                    {userName || 'Profil'}
                </span>
                {tierData && (
                    <span className="text-[9px] font-black uppercase tracking-wider mt-0.5" style={{ color: tierData.color }}>
                        {tierData.name}
                    </span>
                )}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full pt-2 w-56 z-50">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Konto</p>
                    <p className="font-bold text-white truncate">{userName}</p>
                  </div>

                  <Link 
                    href="/dashboard/account"
                    className="block w-full px-4 py-3 text-white hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2"
                  >
                    ⚙️ Einstellungen
                  </Link>

                  {userId && (
                    <Link 
                      href={`/brewer/${userId}`}
                      target="_blank"
                      className="block w-full px-4 py-3 text-white hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2"
                    >
                      🌐 Öffentliches Profil
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-3 text-red-400 hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2 text-left border-t border-zinc-800"
                  >
                    🚪 Abmelden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <NotificationBell />
          <button 
            className="p-2 text-zinc-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute w-full bg-zinc-950 border-b border-zinc-800 animate-in slide-in-from-top-2 fade-in duration-200 shadow-2xl z-40 max-h-[90vh] overflow-y-auto left-0 top-full">
            <div className="p-4 space-y-2">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Persönlicher Bereich</p>
            
            <Link 
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${pathname === '/dashboard' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50' : 'text-zinc-400 border border-transparent hover:bg-zinc-900'}`}
            >
                <span>📊</span>
                <span>Dashboard</span>
            </Link>

            {tabs.map(tab => {
                const isActive = pathname === tab.path;
                return (
                    <Link 
                        key={tab.path} 
                        href={tab.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`p-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${isActive ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50' : 'text-zinc-400 border border-transparent hover:bg-zinc-900'}`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.name}</span>
                    </Link>
                );
            })}

            <div className="h-px bg-zinc-800 my-2"></div>
            
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Community</p>

            <Link 
                href="/discover"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3 mb-2"
            >
                <span>🌍</span>
                <span>Entdecken</span>
            </Link>

            <div className="h-px bg-zinc-800 my-2"></div>

            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Team Bereich</p>
            
            {userBreweries.length > 0 ? (
                <div className="space-y-1 px-1">
                    {/* Active Team */}
                    <Link 
                        href={`/team/${breweryId}`}
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="w-full p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-transparent border border-cyan-900/30 flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                         <div className="flex items-center gap-3">
                            <span className="text-lg">🏭</span>
                            <div>
                                <span className="block text-cyan-400 font-bold text-sm leading-none mb-0.5">{activeBreweryName}</span>
                                <span className="text-[10px] text-cyan-600 font-medium uppercase tracking-wide">Aktives Team</span>
                            </div>
                        </div>
                        <span className="w-8 h-8 rounded-full bg-cyan-900/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </span>
                    </Link>

                    {/* Other Teams */}
                    {userBreweries.filter(b => b.id !== breweryId).map(b => (
                        <button
                            key={b.id}
                            onClick={() => handleSwitchBrewery(b.id)}
                            className="w-full p-2 px-3 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition">
                                <span className="text-base grayscale text-zinc-500">🏠</span>
                                <span className="font-medium">{b.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-600 bg-zinc-900/50 border border-zinc-800/50 px-2 py-1 rounded group-hover:border-zinc-700 group-hover:text-zinc-400 transition">Wechseln</span>
                        </button>
                    ))}
                </div>
            ) : (
                    <p className="px-3 text-xs text-zinc-600 italic">Kein Team vorhanden.</p>
            )}
            
            <div className="h-px bg-zinc-800 my-2"></div>

            {tierData && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative border border-zinc-700">
                        <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierData.color }}></div>
                        <img src={tierData.path} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{userName}</p>
                        <p className="text-[10px] uppercase font-black" style={{ color: tierData.color }}>{tierData.name}</p>
                    </div>
                </div>
            )}

            <Link 
                href="/dashboard/account" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3"
            >
                <span>⚙️</span> Einstellungen
            </Link>
                
                <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition flex items-center gap-3"
                >
                <span>🚪</span> Abmelden
                </button>
            </div>
        </div>
      )}
    </nav>
  );
}
