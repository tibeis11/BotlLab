'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Logo from '../../components/Logo';
import NotificationBell from '../../components/NotificationBell';
import { supabase, getActiveBrewery, getUserBreweries } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { getTierConfig } from '@/lib/tier-system';
import { getBreweryBranding } from '@/lib/actions/premium-actions';

export default function AdminHeader() {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const [userName, setUserName] = useState<string | null>(null);
  const [tierData, setTierData] = useState<{ path: string, color: string, name: string } | null>(null);
  const [breweryId, setBreweryId] = useState<string | null>(null);
  const [activeBreweryName, setActiveBreweryName] = useState<string | null>(null);
  const [branding, setBranding] = useState<{ logoUrl: string | null; breweryName: string | null; isPremiumBranding: boolean }>({
    logoUrl: null,
    breweryName: null,
    isPremiumBranding: false
  });
  const [userBreweries, setUserBreweries] = useState<any[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBreweryMenu, setShowBreweryMenu] = useState(false);
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollbarCompensation, setScrollbarCompensation] = useState(0);
  const [mobileTab, setMobileTab] = useState<'personal' | 'team' | 'discover'>('personal');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Lock Body Scroll when Mobile Menu is Open
  useEffect(() => {
    if (isMobileMenuOpen) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        setScrollbarCompensation(scrollbarWidth);
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
        document.body.style.paddingRight = '0px';
        setScrollbarCompensation(0);
    }
    return () => {
        document.body.style.overflow = 'unset';
        document.body.style.paddingRight = '0px';
    };
  }, [isMobileMenuOpen]);

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
          
          // Fetch Branding for high-tier breweries
          getBreweryBranding(selectedBrewery.id).then(res => {
              if (isMounted) setBranding(res);
          });
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
    <>
    <nav className="border-b border-zinc-900 bg-zinc-950/80 p-3 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-[1920px] w-full mx-auto px-6 flex justify-between items-center">
        
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Logo 
              overrideText={branding.breweryName || undefined}
              imageSrc={branding.logoUrl || "/brand/logo.svg"}
            />
          </Link>

          {/* Left Desktop Navigation (External Context) */}
          <div className="hidden lg:flex gap-6 text-sm font-medium items-center border-l border-zinc-800 pl-6 h-8">
            {/* Entdecken Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setShowDiscoverMenu(true)}
              onMouseLeave={() => setShowDiscoverMenu(false)}
            >
              <button 
                  title="Entdecken"
                  className={`rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname.startsWith('/discover') ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
              >
                  <span>🌍</span>
                  <span className="hidden xl:inline">Entdecken</span>
                  <span className="text-[10px] ml-1">▼</span>
              </button>
              
              {showDiscoverMenu && (
                  <div className="absolute left-0 top-full pt-4 w-48 z-50">
                          <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 px-1 py-1">
                              <Link 
                                  href="/discover" 
                                  className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                              >
                                  <span>🍺</span>
                                  <span>Rezepte</span>
                              </Link>
                              <div className="px-3 py-2 text-sm font-bold flex items-center gap-3 text-zinc-600 cursor-not-allowed">
                                  <span>💬</span>
                                  <div>
                                      <span className="block">Forum</span>
                                      <span className="text-[9px] uppercase tracking-wider block font-black">Demnächst</span>
                                  </div>
                              </div>
                          </div>
                  </div>
              )}
            </div>

            {/* Team Dropdown */}
            {breweryId && (
                <div 
                  className="relative group"
                  onMouseEnter={() => setShowBreweryMenu(true)}
                  onMouseLeave={() => setShowBreweryMenu(false)}
                >
                  <button 
                    title="Team"
                    className={`rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname.startsWith('/team') ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
                  >
                      <span>🏭</span>
                      <span className="hidden xl:inline">Team</span>
                      <span className="text-[10px] ml-1">▼</span>
                  </button>
                  
                  {showBreweryMenu && (
                      <div className="absolute left-0 top-full pt-4 w-56 z-50">
                           <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 p-1">
                               
                               {/* Team Dashboard Link */}
                               <Link 
                                   href={`/team/${breweryId}`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>📊</span> <span>Team-Dashboard</span>
                               </Link>
                               
                               <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                               
                               {/* Team Quick Links */}
                               <Link 
                                   href={`/team/${breweryId}/feed`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>💬</span> <span>Feed</span>
                               </Link>
                               <Link 
                                   href={`/team/${breweryId}/brews`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>🍺</span> <span>Rezepte</span>
                               </Link>
                               <Link 
                                   href={`/team/${breweryId}/sessions`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>🌡️</span> <span>Sessions</span>
                               </Link>
                               <Link 
                                   href={`/team/${breweryId}/inventory`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>📦</span> <span>Inventar</span>
                               </Link>
                               <Link 
                                   href={`/team/${breweryId}/analytics`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>📈</span> <span>Analytics</span>
                               </Link>
                               
                               <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                               
                               {/* Team Settings */}
                               <Link 
                                   href={`/team/${breweryId}/members`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>👥</span> <span>Mitglieder</span>
                               </Link>
                               <Link 
                                   href={`/team/${breweryId}/settings`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                               >
                                   <span>⚙️</span> <span>Einstellungen</span>
                               </Link>

                               {userBreweries.length > 1 && (
                                  <>
                                   <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                                   <p className="px-3 py-2 text-[10px] text-zinc-600 uppercase font-black tracking-wider">Team wechseln</p>
                                   {userBreweries.filter(b => b.id !== breweryId).map(b => (
                                       <button
                                          key={b.id}
                                          onClick={() => handleSwitchBrewery(b.id)}
                                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 hover:text-white text-zinc-400 transition flex items-center gap-2 group font-bold"
                                       >
                                          <span className="opacity-50 group-hover:opacity-100 transition">↳</span>
                                          <span className="truncate">{b.name}</span>
                                       </button>
                                   ))}
                                  </>
                               )}
                          </div>
                      </div>
                  )}
                </div>
            )}
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
            <button className="flex items-center gap-0 xl:gap-3 pl-1 pr-1 xl:pr-4 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition group">
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

    </nav>
    
    {/* Mobile Navigation - Redesigned "Smart Drawer" */}
    {/* Moved OUTSIDE the nav to avoid backdrop-filter issues destroying fixed positioning context */}
    {isMobileMenuOpen && (
        <div 
            className="lg:hidden fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-zinc-950/80"
        >
            <div className="flex flex-col h-full w-full" style={{ paddingRight: `${scrollbarCompensation}px` }}>
            
            {/* 1. Header with Close (Exakt nach Pixeln ausgerichtet am Main Header) */}
            <div className="border-b border-zinc-900 bg-zinc-950 p-3">
               <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-6">
                   <div className="flex items-center gap-6" onClick={() => setIsMobileMenuOpen(false)}>
                      <Logo 
                        overrideText={branding.breweryName || undefined}
                        imageSrc={branding.logoUrl || "/brand/logo.svg"}
                      /> 
                   </div>
                   <div className="flex items-center gap-2">
                     <NotificationBell />
                     <button 
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 text-zinc-400 hover:text-white"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   </div>
               </div>
            </div>

            {/* Segmented Control Area */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-950">
               <div className="flex bg-zinc-900 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    <button 
                      onClick={() => setMobileTab('personal')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'personal' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <span className={mobileTab === 'personal' ? 'grayscale-0' : 'grayscale'}>🧪</span>
                      Labor
                    </button>
                    <button 
                      onClick={() => setMobileTab('team')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'team' ? 'bg-cyan-950 text-cyan-400 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <span>🏭</span>
                      Brauerei
                    </button>
                    <button 
                      onClick={() => setMobileTab('discover')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'discover' ? 'bg-purple-900/50 text-purple-300 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <span>🌍</span>
                      Entdecken
                    </button>
               </div>
            </div>

            {/* 2. Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {mobileTab === 'personal' && (
                   <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                       
                       {/* Dashboard Hero */}
                       <Link 
                          href="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 p-5 rounded-2xl relative overflow-hidden group"
                       >
                          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <span className="text-6xl">📊</span>
                          </div>
                          <p className="text-xs text-zinc-400 uppercase font-black tracking-widest mb-1">Übersicht</p>
                          <h3 className="text-2xl font-black text-white mb-2">Dashboard</h3>
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                             <span>Alles im Blick</span>
                             <span>→</span>
                          </div>
                       </Link>

                       {/* List for Tools */}
                       <div>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                          <div className="divide-y divide-zinc-900/50">
                             {tabs.map(tab => (
                                <Link
                                   key={tab.path}
                                   href={tab.path}
                                   onClick={() => setIsMobileMenuOpen(false)}
                                   className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                >
                                   <span className="text-xl">{tab.icon}</span>
                                   <span className="font-bold text-sm text-zinc-200">{tab.name}</span>
                                   <span className="ml-auto text-zinc-600">→</span>
                                </Link>
                             ))}
                          </div>
                       </div>
                   </div>
                )}

                {mobileTab === 'team' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                         {breweryId ? (
                             <>
                               {/* Active Brewery Hero */}
                               <div className="bg-gradient-to-br from-cyan-950/40 to-cyan-900/10 border border-cyan-900/50 p-5 rounded-2xl">
                                  <div className="flex justify-between items-start mb-4">
                                     <div>
                                        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-1">Aktives Team</p>
                                        <h3 className="text-xl font-bold text-white leading-tight">{activeBreweryName}</h3>
                                     </div>
                                     <span className="bg-cyan-500/10 text-cyan-400 p-2 rounded-lg">🏭</span>
                                  </div>
                                  
                                  <Link 
                                     href={`/team/${breweryId}`}
                                     onClick={() => setIsMobileMenuOpen(false)}
                                     className="w-full block text-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold py-3 rounded-xl border border-cyan-500/20 transition"
                                  >
                                     Zum Team-Dashboard
                                  </Link>
                               </div>

                               {/* Team Quick Actions */}
                               <div>
                                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                                  <div className="divide-y divide-zinc-900/50">
                                     <Link
                                      href={`/team/${breweryId}/feed`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <span className="text-xl">💬</span>
                                        <span className="font-bold text-sm text-zinc-200">Feed</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/brews`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <span className="text-xl">🍺</span>
                                        <span className="font-bold text-sm text-zinc-200">Rezepte</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/sessions`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <span className="text-xl">🌡️</span>
                                        <span className="font-bold text-sm text-zinc-200">Sessions</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/inventory`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <span className="text-xl">📦</span>
                                        <span className="font-bold text-sm text-zinc-200">Inventar</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/analytics`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <span className="text-xl">📈</span>
                                        <span className="font-bold text-sm text-zinc-200">Analytics</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/members`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <span className="text-xl">👥</span>
                                        <span className="font-bold text-sm text-zinc-200">Mitglieder</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/settings`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <span className="text-xl">⚙️</span>
                                        <span className="font-bold text-sm text-zinc-200">Einstellungen</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                  </div>
                               </div>

                               {/* Switchable Teams */}
                               {userBreweries.length > 1 && (
                                   <div>
                                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-3">Team wechseln</p>
                                      <div className="space-y-2">
                                         {userBreweries.filter(b => b.id !== breweryId).map(b => (
                                             <button
                                                key={b.id}
                                                onClick={() => handleSwitchBrewery(b.id)}
                                                className="w-full text-left bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-xl flex items-center justify-between hover:bg-zinc-900 transition"
                                             >
                                                <span className="text-sm font-bold text-zinc-400">{b.name}</span>
                                                <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded">Wechseln</span>
                                             </button>
                                         ))}
                                      </div>
                                   </div>
                               )}
                             </>
                         ) : (
                             <div className="text-center py-12 px-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                                 <span className="text-4xl mb-4 block opacity-50">🏚️</span>
                                 <h3 className="font-bold text-white mb-2">Kein Team</h3>
                                 <p className="text-sm text-zinc-500 mb-6">Du bist aktuell keinem Brauerei-Team zugeordnet.</p>
                                 <Link
                                    href="/dashboard/team/create" // Assuming route
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="inline-block bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 transition"
                                 >
                                    Team Gründen
                                 </Link>
                             </div>
                         )}
                    </div>
                )}

                {mobileTab === 'discover' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Discover Hero */}
                        <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/10 border border-purple-900/50 p-5 rounded-2xl">
                              <div className="flex justify-between items-start mb-4">
                                 <div>
                                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">BotlLab Community</p>
                                    <h3 className="text-xl font-bold text-white leading-tight">Entdecken</h3>
                                 </div>
                                 <span className="bg-purple-500/10 text-purple-400 p-2 rounded-lg">🌍</span>
                              </div>
                              <p className="text-sm text-zinc-400 mb-4">Finde Inspiration, tausche dich aus und entdecke neue Rezepte.</p>
                        </div>

                         <div>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-1">Community</p>
                            <div className="divide-y divide-zinc-900/50">
                                <Link
                                    href="/discover"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                >
                                    <span className="text-xl">🌍</span>
                                    <span className="font-bold text-sm text-zinc-200">Rezepte</span>
                                    <span className="ml-auto text-zinc-600">→</span>
                                </Link>
                                <div className="w-full flex items-center gap-4 py-4 px-2 opacity-30 cursor-not-allowed">
                                    <span className="text-xl">💬</span>
                                    <div>
                                        <span className="font-bold text-sm text-zinc-400 block">Forum</span>
                                        <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">Demnächst</span>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                )}

            </div>

            {/* 3. Footer (Fixed) */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950 pb-8">
               {tierData && (
                <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-2xl mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs overflow-hidden relative border border-zinc-700 bg-zinc-800">
                            <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierData.color }}></div>
                            <img src={tierData.path} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">{userName}</p>
                            <p className="text-[10px] uppercase font-black tracking-wide" style={{ color: tierData.color }}>{tierData.name}</p>
                        </div>
                    </div>
                    <Link
                       href="/dashboard/account"
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition"
                    >
                       ⚙️
                    </Link>
                </div>
               )}
               
               <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition"
               >
                <span>🚪</span> Abmelden
               </button>
         </div>
          </div>
        </div>
      )}
    </>
  );
}
