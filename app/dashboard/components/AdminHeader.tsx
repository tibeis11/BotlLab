'use client';

import Link from 'next/link';
import { 
  Beer, 
  FlaskConical, 
  Factory, 
  Globe, 
  LayoutDashboard, 
  LogOut, 
  MessageSquare, 
  Package, 
  Settings, 
  Tag, 
  Thermometer, 
  TrendingUp, 
  Users, 
  Heart,
  Trophy
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Logo from '../../components/Logo';
import NotificationBell from '../../components/NotificationBell';
import { supabase, getActiveBrewery, getUserBreweries } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryBranding } from '@/lib/actions/premium-actions';
import UserAvatar from '@/app/components/UserAvatar';

export default function AdminHeader() {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const [userName, setUserName] = useState<string | null>(null);
  const [userLogoUrl, setUserLogoUrl] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string | null>(null);
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
          .select('display_name, logo_url, subscription_tier')
          .eq('id', user.id)
          .single();
          
        if (!isMounted) return;
        
        if (profile) {
          setUserName(profile.display_name || user.email?.split('@')[0] || 'Brauer');
          setUserLogoUrl(profile.logo_url || null);
          setUserTier(profile.subscription_tier || null);
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
    { name: 'Sammlung', path: '/dashboard/collection', icon: FlaskConical },
    { name: 'Favoriten', path: '/dashboard/favorites', icon: Heart },
    { name: 'Achievements', path: '/dashboard/achievements', icon: Trophy },
  ];

  return (
    <>
    <nav className="border-b border-border bg-background/80 p-3 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-[1920px] w-full mx-auto px-6 flex justify-between items-center">
        
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        
        {/* Desktop Navigation (Dashboard Context) */}
        <div className="hidden lg:flex gap-1 text-sm font-medium items-center">
          

          
          {/* Manual Dashboard Link */}
          <Link 
            href="/dashboard" 
            title="Dashboard"
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname === '/dashboard' ? 'bg-brand-bg text-brand' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
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
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-brand-bg text-brand' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden xl:inline">{tab.name}</span>
              </Link>
            );
          })}
          
          <div className="h-4 w-px bg-border mx-2"></div>
            
            {/* Team Dropdown/Switcher Right Aligned */}
            {breweryId && (
                <div 
                  className="relative group"
                  onMouseEnter={() => setShowBreweryMenu(true)}
                  onMouseLeave={() => setShowBreweryMenu(false)}
                >
                  <button 
                    title="Team / Brauerei"
                    className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
                  >
                      <Factory className="w-5 h-5" />
                  </button>
                  
                  {showBreweryMenu && (
                      <div className="absolute right-0 top-full pt-2 w-56 z-50">
                           <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 p-1">
                               
                               {/* Team Dashboard Link */}
                               <Link 
                                   href={`/team/${breweryId}`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg"
                               >
                                   <LayoutDashboard className="w-4 h-4" /> <span>Team-Dashboard</span>
                               </Link>
                               
                               <div className="h-px bg-border my-1 mx-2"></div>
                               
                               {/* Team Quick Links */}
                               <Link 
                                   href={`/team/${breweryId}/brews`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg"
                               >
                                   <Beer className="w-4 h-4" /> <span>Rezepte</span>
                               </Link>
                               <Link 
                                   href={`/team/${breweryId}/sessions`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg"
                               >
                                   <Thermometer className="w-4 h-4" /> <span>Sessions</span>
                               </Link>

                               <div className="h-px bg-border my-1 mx-2"></div>
                               
                               {/* Team Settings */}
                               <Link 
                                   href={`/team/${breweryId}/settings`}
                                   className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg"
                               >
                                   <Settings className="w-4 h-4" /> <span>Einstellungen</span>
                               </Link>

                               {userBreweries.length > 1 && (
                                  <>
                                   <div className="h-px bg-border my-1 mx-2"></div>
                                   <p className="px-3 py-2 text-[10px] text-text-disabled uppercase font-black tracking-wider">Team wechseln</p>
                                   {userBreweries.filter(b => b.id !== breweryId).map(b => (
                                       <button
                                          key={b.id}
                                          onClick={() => handleSwitchBrewery(b.id)}
                                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-hover hover:text-text-primary text-text-muted transition flex items-center gap-2 group font-bold"
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

            {/* Discover Icon */}
            <div 
              className="relative group h-9 w-9 flex items-center justify-center ml-1"
              onMouseEnter={() => setShowDiscoverMenu(true)}
              onMouseLeave={() => setShowDiscoverMenu(false)}
            >
              <Link href="/discover" className="text-text-muted hover:text-text-primary transition-colors">
                  <Globe className="w-5 h-5" />
              </Link>
              
              {showDiscoverMenu && (
                  <div className="absolute right-0 top-full pt-2 w-48 z-50">
                          <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 px-1 py-1">
                              <Link 
                                  href="/discover" 
                                  className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg"
                              >
                                  <Beer className="w-4 h-4" />
                                  <span>Rezepte</span>
                              </Link>
                              <Link 
                                  href="/forum" 
                                  className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg"
                              >
                                  <MessageSquare className="w-4 h-4" />
                                  <span>Forum</span>
                              </Link>
                          </div>
                  </div>
              )}
            </div>

          <NotificationBell />
          
          {/* Profile Menu */}
          <div 
            className="relative"
            onMouseEnter={() => setShowProfileMenu(true)}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <button className="flex items-center gap-0 xl:gap-3 pl-1 pr-1 xl:pr-4 py-1 rounded-full bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition group">
              <UserAvatar src={userLogoUrl} name={userName} userId={userId} tier={userTier} sizeClass="w-8 h-8" />
              <div className="hidden xl:flex flex-col items-start leading-none">
                <span className="truncate max-w-[120px] font-bold text-text-primary text-sm">
                    {userName || 'Profil'}
                </span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full pt-2 w-56 z-50">
                <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">Konto</p>
                    <p className="font-bold text-text-primary truncate">{userName}</p>
                  </div>

                  <Link 
                    href="/account"
                    className="block w-full px-4 py-3 text-text-primary hover:bg-surface-hover transition text-sm font-medium flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Einstellungen
                  </Link>

                  {userId && (
                    <Link 
                      href={`/brewer/${userId}`}
                      target="_blank"
                      className="block w-full px-4 py-3 text-text-primary hover:bg-surface-hover transition text-sm font-medium flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" /> Öffentliches Profil
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-3 text-error hover:bg-surface-hover transition text-sm font-medium flex items-center gap-2 text-left border-t border-border"
                  >
                    <LogOut className="w-4 h-4" /> Abmelden
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
            className="p-2 text-text-muted hover:text-text-primary"
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
            className="lg:hidden fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-background/80"
        >
            <div className="flex flex-col h-full w-full" style={{ paddingRight: `${scrollbarCompensation}px` }}>
            
            {/* 1. Header with Close (Exakt nach Pixeln ausgerichtet am Main Header) */}
            <div className="border-b border-border bg-background p-3">
               <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-6">
                   <div className="flex items-center gap-6" onClick={() => setIsMobileMenuOpen(false)}>
                      <Logo /> 
                   </div>
                   <div className="flex items-center gap-2">
                     <NotificationBell />
                     <button 
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 text-text-muted hover:text-text-primary"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   </div>
               </div>
            </div>

            {/* Segmented Control Area */}
            <div className="p-4 border-b border-border bg-background">
               <div className="flex bg-surface p-1 rounded-xl overflow-x-auto no-scrollbar">
                    <button 
                      onClick={() => setMobileTab('personal')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'personal' ? 'bg-surface-hover text-text-primary shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                      <FlaskConical className={`w-4 h-4 ${mobileTab === 'personal' ? 'grayscale-0' : 'grayscale'}`} />
                      Labor
                    </button>
                    <button 
                      onClick={() => setMobileTab('team')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'team' ? 'bg-brand-bg text-brand shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                      <Factory className="w-4 h-4" />
                      Brauerei
                    </button>
                    <button 
                      onClick={() => setMobileTab('discover')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'discover' ? 'bg-surface-raised text-accent-purple shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                      <Globe className="w-4 h-4" />
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
                          className="block bg-surface border border-border p-5 rounded-2xl relative overflow-hidden group"
                       >
                          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <LayoutDashboard className="w-16 h-16" />
                          </div>
                          <p className="text-xs text-text-muted uppercase font-black tracking-widest mb-1">Übersicht</p>
                          <h3 className="text-2xl font-black text-text-primary mb-2">Dashboard</h3>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                             <span>Alles im Blick</span>
                             <span>→</span>
                          </div>
                       </Link>

                       {/* List for Tools */}
                       <div>
                          <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                          <div className="divide-y divide-border-subtle">
                             {tabs.map(tab => (
                                <Link
                                   key={tab.path}
                                   href={tab.path}
                                   onClick={() => setIsMobileMenuOpen(false)}
                                   className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                >
                                   <tab.icon className="w-5 h-5" />
                                   <span className="font-bold text-sm text-text-primary">{tab.name}</span>
                                   <span className="ml-auto text-text-disabled">→</span>
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
                               <div className="bg-brand-bg border border-brand-dim p-5 rounded-2xl">
                                  <div className="flex justify-between items-start mb-4">
                                     <div>
                                        <p className="text-[10px] text-brand font-black uppercase tracking-widest mb-1">Aktives Team</p>
                                        <h3 className="text-xl font-bold text-text-primary leading-tight">{activeBreweryName}</h3>
                                     </div>
                                     <div className="bg-brand-bg text-brand p-2 rounded-lg">
                                        <Factory className="w-5 h-5" />
                                     </div>
                                  </div>
                                  
                                  <Link 
                                     href={`/team/${breweryId}`}
                                     onClick={() => setIsMobileMenuOpen(false)}
                                     className="w-full block text-center bg-brand-bg hover:opacity-80 text-brand font-bold py-3 rounded-xl border border-brand-dim transition"
                                  >
                                     Zum Team-Dashboard
                                  </Link>
                               </div>

                               {/* Team Quick Actions */}
                               <div>
                                  <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                                  <div className="divide-y divide-border-subtle">
                                     <Link
                                      href={`/team/${breweryId}/feed`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                     >
                                        <MessageSquare className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Feed</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/brews`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                     >
                                        <Beer className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Rezepte</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/sessions`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                     >
                                        <Thermometer className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Sessions</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/inventory`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                     >
                                        <Package className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Inventar</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/labels`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                      title="Etiketten"
                                     >
                                        <Tag className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Etiketten</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/analytics`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                     >
                                        <TrendingUp className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Analytics</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/members`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                     >
                                        <Users className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Mitglieder</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${breweryId}/settings`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                     >
                                        <Settings className="w-5 h-5 text-text-muted" />
                                        <span className="font-bold text-sm text-text-primary">Einstellungen</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                  </div>
                               </div>

                               {/* Switchable Teams */}
                               {userBreweries.length > 1 && (
                                   <div>
                                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-3">Team wechseln</p>
                                      <div className="space-y-2">
                                         {userBreweries.filter(b => b.id !== breweryId).map(b => (
                                             <button
                                                key={b.id}
                                                onClick={() => handleSwitchBrewery(b.id)}
                                                className="w-full text-left bg-surface border border-border p-3 rounded-xl flex items-center justify-between hover:bg-surface-hover transition"
                                             >
                                                <span className="text-sm font-bold text-text-muted">{b.name}</span>
                                                <span className="text-[10px] bg-surface-raised text-text-muted px-2 py-1 rounded">Wechseln</span>
                                             </button>
                                         ))}
                                      </div>
                                   </div>
                               )}
                             </>
                         ) : (
                             <div className="text-center py-12 px-6 bg-surface-sunken rounded-2xl border border-border-subtle border-dashed flex flex-col items-center">
                                 <Factory className="w-10 h-10 opacity-50 mb-4" />
                                 <h3 className="font-bold text-text-primary mb-2">Kein Team</h3>
                                 <p className="text-sm text-text-muted mb-6">Du bist aktuell keinem Brauerei-Team zugeordnet.</p>
                                 <Link
                                    href="/dashboard/team/create"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="inline-block bg-brand text-background font-bold px-6 py-3 rounded-xl hover:opacity-90 transition"
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
                        <div className="bg-surface border border-border p-5 rounded-2xl">
                              <div className="flex justify-between items-start mb-4">
                                 <div>
                                    <p className="text-[10px] text-accent-purple font-black uppercase tracking-widest mb-1">BotlLab Community</p>
                                    <h3 className="text-xl font-bold text-text-primary leading-tight">Entdecken</h3>
                                 </div>
                                 <div className="bg-accent-purple/10 text-accent-purple p-2 rounded-lg">
                                    <Globe className="w-5 h-5" />
                                 </div>
                              </div>
                              <p className="text-sm text-text-muted mb-4">Finde Inspiration, tausche dich aus und entdecke neue Rezepte.</p>
                        </div>

                         <div>
                            <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Community</p>
                            <div className="divide-y divide-border-subtle">
                                <Link
                                    href="/discover"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                >
                                    <Globe className="w-5 h-5 text-text-muted" />
                                    <span className="font-bold text-sm text-text-primary">Rezepte</span>
                                    <span className="ml-auto text-text-disabled">→</span>
                                </Link>
                                <Link
                                    href="/forum"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover transition"
                                >
                                    <MessageSquare className="w-5 h-5 text-text-muted" />
                                    <span className="font-bold text-sm text-text-primary">Forum</span>
                                    <span className="ml-auto text-text-disabled">→</span>
                                </Link>
                            </div>
                         </div>
                    </div>
                )}

            </div>

            {/* 3. Footer (Fixed) */}
            <div className="p-4 border-t border-border bg-background pb-8">
               {userName && (
                <div className="flex items-center justify-between bg-surface p-3 rounded-2xl mb-3">
                    <div className="flex items-center gap-3">
                        <UserAvatar src={userLogoUrl} name={userName} userId={userId} tier={userTier} sizeClass="w-10 h-10" />
                        <div>
                            <p className="text-sm font-bold text-text-primary leading-tight">{userName}</p>
                        </div>
                    </div>
                    <Link
                       href="/account"
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 bg-surface-raised hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-primary transition"
                    >
                       <Settings className="w-5 h-5" />
                    </Link>
                </div>
               )}
               
               <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-error hover:bg-error-bg hover:text-error transition"
               >
                <LogOut className="w-4 h-4" /> Abmelden
               </button>
         </div>
          </div>
        </div>
      )}
    </>
  );
}
