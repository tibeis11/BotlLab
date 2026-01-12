'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Logo from '../../components/Logo';
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
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Sammlung', path: '/dashboard/collection', icon: '🏅' },
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
          <div className="hidden md:flex gap-6 text-sm font-medium items-center border-l border-zinc-800 pl-6 h-8">
            {breweryId && (
              <div 
                className="relative group"
                onMouseEnter={() => setShowBreweryMenu(true)}
                onMouseLeave={() => setShowBreweryMenu(false)}
              >
                <div className="flex items-center gap-1">
                    <Link href={`/team/${breweryId}`} className="group-hover:text-cyan-400 text-zinc-400 transition flex items-center gap-2">
                        🏭 <span className={userBreweries.length > 1 ? 'border-b border-dashed border-zinc-600' : ''}>{activeBreweryName || 'Brauerei'}</span>
                    </Link>
                    {userBreweries.length > 1 && (
                        <span className="text-[10px] text-zinc-600 ml-1">▼</span>
                    )}
                </div>
                
                {showBreweryMenu && userBreweries.length > 1 && (
                    <div className="absolute left-0 top-full pt-2 w-48 z-50">
                         <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                             <p className="px-3 py-2 text-[10px] text-zinc-500 uppercase font-bold border-b border-zinc-800 bg-zinc-950">Team wechseln</p>
                             {userBreweries.map(b => (
                                 <button
                                    key={b.id}
                                    onClick={() => handleSwitchBrewery(b.id)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition flex items-center gap-2 ${breweryId === b.id ? 'text-cyan-400 font-bold bg-zinc-800/50' : 'text-zinc-300'}`}
                                 >
                                    {breweryId === b.id && <span className="text-cyan-500">●</span>}
                                    {b.name}
                                 </button>
                             ))}
                        </div>
                    </div>
                )}
              </div>
            )}
            
            <Link href="/discover" className="hover:text-cyan-400 text-zinc-400 transition flex items-center gap-2">
              🌍 Entdecken
            </Link>
          </div>
        </div>
        
        {/* Desktop Navigation (Dashboard Context) */}
        <div className="hidden md:flex gap-1 text-sm font-medium items-center">
          {tabs.map(tab => {
            // Dashboard root matches only exact, others match prefix
            const isActive = tab.path === '/dashboard' 
              ? pathname === '/dashboard'
              : (pathname === tab.path || pathname?.startsWith(tab.path + '/'));
              
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
          
          <div className="h-4 w-px bg-zinc-800 mx-2"></div>
          
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
              <div className="flex flex-col items-start leading-none">
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
                    href="/dashboard/profile"
                    className="block w-full px-4 py-3 text-white hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2"
                  >
                    ✏️ Profil bearbeiten
                  </Link>

                  <Link 
                    href="/dashboard/account"
                    className="block w-full px-4 py-3 text-white hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2"
                  >
                    🔐 Kontoeinstellungen
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
        <button 
          className="md:hidden p-2 text-zinc-400 hover:text-white"
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

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute w-full bg-zinc-950 border-b border-zinc-800 animate-in slide-in-from-top-2 fade-in duration-200 shadow-2xl z-40 max-h-[90vh] overflow-y-auto left-0 top-full">
            <div className="p-4 space-y-2">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Persönlicher Bereich</p>
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
            
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Team Bereich</p>
            
            {userBreweries.length > 0 ? (
                <>
                    <Link 
                        href={`/team/${breweryId}`}
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="p-3 rounded-xl text-sm font-bold bg-zinc-900/50 hover:bg-zinc-900 transition flex items-center justify-between gap-3 text-cyan-400 border border-zinc-800 mb-2"
                    >
                        <div className="flex items-center gap-3">
                            <span>🏭</span>
                            <span>{activeBreweryName}</span>
                        </div>
                        <span className="text-xs opacity-50">Öffnen →</span>
                    </Link>
                    
                    {userBreweries.length > 1 && (
                            <div className="pl-4 border-l border-zinc-800 ml-2 space-y-1 mt-2">
                                <p className="text-[10px] uppercase text-zinc-600 font-bold mb-1 pl-2">Wechseln zu:</p>
                                {userBreweries.filter(b => b.id !== breweryId).map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => handleSwitchBrewery(b.id)}
                                    className="w-full text-left p-2 rounded-lg hover:bg-zinc-900 transition flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-white"
                                >
                                    <span>↳</span> {b.name}
                                </button>
                                ))}
                            </div>
                    )}
                </>
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
                href="/dashboard/profile" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3"
            >
                <span>✏️</span> Profil bearbeiten
            </Link>
            <Link 
                href="/dashboard/account" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3"
            >
                <span>🔐</span> Account & Einstellungen
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
