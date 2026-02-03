'use client';

import Link from "next/link";
import { 
  Beer,
  Building2,
  Factory,
  FlaskConical,
  Gem,
  Globe, 
  Heart,
  LayoutDashboard, 
  LogOut, 
  Menu, 
  MessageSquare, 
  Package,
  Rocket,
  Search, 
  Settings, 
  Tag,
  Thermometer,
  TrendingUp,
  Trophy,
  Users,
  X 
} from 'lucide-react';
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase, getUserBreweries, getActiveBrewery } from "@/lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTierConfig } from "@/lib/tier-system";
import { getBreweryBranding } from "@/lib/actions/premium-actions";
import { getTierBorderColor } from "@/lib/premium-config";

export default function Header({ breweryId }: { breweryId?: string }) {
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileTab, setMobileTab] = useState<'personal' | 'team' | 'discover'>('personal');
  const [userBreweries, setUserBreweries] = useState<any[]>([]);
  const [activeBreweryId, setActiveBreweryId] = useState<string | null>(breweryId || null);
  const [activeBreweryName, setActiveBreweryName] = useState<string | null>(null);
  const [scrollbarCompensation, setScrollbarCompensation] = useState(0);

  // Branding-Feature entfernt: Immer BotlLab-Logo anzeigen
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
    let cancelled = false;

    async function loadData() {
      if (user) {
        // 1. Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('logo_url, tier, display_name, subscription_tier')
          .eq('id', user.id)
          .single();
        
        if (!cancelled && profileData) {
          setProfile(profileData);
        }

        // 2. Breweries
        const allBreweries = await getUserBreweries(user.id);
        if (!cancelled) setUserBreweries(allBreweries);

        // 3. Active Brewery
        let selectedBrewery = null;
        if (breweryId) {
             selectedBrewery = allBreweries.find(b => b.id === breweryId);
        }
        
        // Fallback or override logic could go here if needed
        // Assuming getUserBreweries returns {id, name, ...}
        if (!selectedBrewery && allBreweries.length > 0) {
             // Maybe try to get from DB setting if we want perfect parity, but simple for now:
             const dbActive = await getActiveBrewery(user.id);
             selectedBrewery = dbActive || allBreweries[0];
        }

        if (!cancelled && selectedBrewery) {
             setActiveBreweryId(selectedBrewery.id);
             setActiveBreweryName(selectedBrewery.name);
        }

      } else {
        if (!cancelled) {
            setProfile(null);
            setUserBreweries([]);
            setActiveBreweryId(null);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user, breweryId]);

  // Branding-Feature entfernt

  async function handleLogout() {
    await signOut();
    setShowMenu(false);
    // Refresh wird im Context behandelt
  }

  const tierConfig = profile ? getTierConfig(profile.tier || 'lehrling') : getTierConfig('lehrling');
  const avatarUrl = profile?.logo_url || tierConfig.avatarPath;
  const tierBorderClass = getTierBorderColor(profile?.subscription_tier);

  return (
    <>
    <nav className="border-b border-zinc-900 bg-zinc-950/80 p-3 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-[1920px] w-full mx-auto px-6 flex justify-between items-center">
        <Link href="/">
          <Logo />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2 items-center">

          <Link 
            href="/pricing"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50"
          >
            <Gem className="w-4 h-4" />
            <span className="hidden xl:inline">Preise</span>
          </Link>

          <Link 
            href="/forum"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden xl:inline">Forum</span>
          </Link>

          <Link 
            href="/discover" 
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden xl:inline">Entdecken</span>
          </Link>
          
          <div className="h-4 w-px bg-zinc-800 mx-2"></div>

          {loading ? (
            <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse"></div>
          ) : user ? (
            <>
            <NotificationBell />
            <div 
              className="relative"
              onMouseEnter={() => setShowMenu(true)}
              onMouseLeave={() => setShowMenu(false)}
            >
              <Link 
                href="/dashboard" 
                className="group flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition"
              >
                <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg bg-zinc-900 border-2 ${tierBorderClass}`}
                >
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col items-start leading-none">
                    <span className="truncate max-w-[120px] font-bold text-white text-sm">
                        {profile?.display_name || 'Profil'}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider mt-0.5" style={{ color: tierConfig.color }}>
                        {tierConfig.displayName}
                    </span>
                </div>
              </Link>

              {showMenu && (
                <div className="absolute top-full right-0 pt-2 w-48 z-50">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link
                      href="/dashboard/account"
                      className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Einstellungen
                    </Link>
                    <div className="border-t border-zinc-800"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 transition flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Abmelden
                    </button>
                  </div>
                </div>
              )}
            </div>
            </>
          ) : (
            <>
              <Link 
                href="/login" 
                className="text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
              >
                Login
              </Link>
              <Link 
                href="/login" 
                className="text-sm font-bold bg-white text-black px-6 py-2 rounded-full hover:bg-cyan-400 hover:scale-105 transition transform"
              >
                Starten
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button & Notification */}
        <div className="md:hidden flex items-center gap-4">
          {user && <NotificationBell />}
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
      
      {/* Mobile Menu Content - Redesigned Smart Drawer */}
      {isMobileMenuOpen && (
        <div 
            className="lg:hidden fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-zinc-950/80"
        >
            <div className="flex flex-col h-full w-full" style={{ paddingRight: `${scrollbarCompensation}px` }}>
            
            {/* 1. Header with Close (Aligned with Main Header) */}
            <div className="border-b border-zinc-900 bg-zinc-950 p-3">
               <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-6">
                   <div className="flex items-center gap-6" onClick={() => setIsMobileMenuOpen(false)}>
                      <Logo /> 
                   </div>
                   <div className="flex items-center gap-4">
                     {user && <NotificationBell />}
                     <button 
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 text-zinc-400 hover:text-white"
                     >
                       <X className="w-6 h-6" />
                     </button>
                   </div>
               </div>
            </div>

            {/* Segmented Control Area (Only if logged in) */}
            {user && (
            <div className="p-4 border-b border-zinc-900 bg-zinc-950">
               <div className="flex bg-zinc-900 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    <button 
                      onClick={() => setMobileTab('personal')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'personal' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <FlaskConical className={`w-4 h-4 ${mobileTab === 'personal' ? 'grayscale-0' : 'grayscale'}`} />
                      Labor
                    </button>
                    <button 
                      onClick={() => setMobileTab('team')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'team' ? 'bg-cyan-950 text-cyan-400 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Factory className="w-4 h-4" />
                      Brauerei
                    </button>
                    <button 
                      onClick={() => setMobileTab('discover')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'discover' ? 'bg-purple-900/50 text-purple-300 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Globe className="w-4 h-4" />
                      Entdecken
                    </button>
               </div>
            </div>
            )}

            {/* 2. Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* NOT LOGGED IN VIEW */}
                {!user && (
                    <div className="space-y-6 flex flex-col items-center justify-center h-full">
                        <Link 
                            href="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-cyan-400 transition"
                        >
                            Anmelden
                        </Link>
                        <div className="grid grid-cols-1 gap-4 w-full">
                                <Link
                                    href="/discover"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition border-b border-zinc-900"
                                >
                                    <Globe className="w-5 h-5 text-zinc-400" />
                                    <span className="font-bold text-sm text-zinc-200">Entdecken</span>
                                    <span className="ml-auto text-zinc-600">→</span>
                                </Link>
                                <Link
                                    href="/pricing"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition border-b border-zinc-900"
                                >
                                    <Gem className="w-5 h-5 text-zinc-400" />
                                    <span className="font-bold text-sm text-zinc-200">Preise</span>
                                    <span className="ml-auto text-zinc-600">→</span>
                                </Link>
                                <Link
                                    href="/forum"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition border-b border-zinc-900"
                                >
                                    <MessageSquare className="w-5 h-5 text-zinc-400" />
                                    <span className="font-bold text-sm text-zinc-200">Forum</span>
                                    <span className="ml-auto text-zinc-600">→</span>
                                </Link>
                        </div>
                    </div>
                )}

                {/* LOGGED IN VIEWS */}
                {user && mobileTab === 'personal' && (
                   <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                       
                       {/* Dashboard Hero */}
                       <Link 
                          href="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 p-5 rounded-2xl relative overflow-hidden group"
                       >
                          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <LayoutDashboard className="w-16 h-16" />
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
                             <Link href="/dashboard/collection" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition">
                                <FlaskConical className="w-5 h-5" /> <span className="font-bold text-sm text-zinc-200">Sammlung</span> <span className="ml-auto text-zinc-600">→</span>
                             </Link>
                             <Link href="/dashboard/favorites" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition">
                                <Heart className="w-5 h-5" /> <span className="font-bold text-sm text-zinc-200">Favoriten</span> <span className="ml-auto text-zinc-600">→</span>
                             </Link>
                             <Link href="/dashboard/achievements" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition">
                                <Trophy className="w-5 h-5" /> <span className="font-bold text-sm text-zinc-200">Achievements</span> <span className="ml-auto text-zinc-600">→</span>
                             </Link>
                          </div>
                       </div>
                   </div>
                )}

                {user && mobileTab === 'team' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                         {activeBreweryId ? (
                             <>
                               {/* Active Brewery Hero */}
                               <div className="bg-gradient-to-br from-cyan-950/40 to-cyan-900/10 border border-cyan-900/50 p-5 rounded-2xl">
                                  <div className="flex justify-between items-start mb-4">
                                     <div>
                                        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-1">Aktives Team</p>
                                        <h3 className="text-xl font-bold text-white leading-tight">{activeBreweryName}</h3>
                                     </div>
                                     <div className="bg-cyan-500/10 text-cyan-400 p-2 rounded-lg">
                                        <Factory className="w-5 h-5" />
                                     </div>
                                  </div>
                                  
                                  <Link 
                                     href={`/team/${activeBreweryId}`}
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
                                      href={`/team/${activeBreweryId}/feed`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <MessageSquare className="w-5 h-5 text-zinc-400" />
                                        <span className="font-bold text-sm text-zinc-200">Feed</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/brews`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <Beer className="w-5 h-5 text-zinc-400" />
                                        <span className="font-bold text-sm text-zinc-200">Rezepte</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/sessions`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <Thermometer className="w-5 h-5 text-zinc-400" />
                                        <span className="font-bold text-sm text-zinc-200">Sessions</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/inventory`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <Package className="w-5 h-5 text-zinc-400" />
                                        <span className="font-bold text-sm text-zinc-200">Inventar</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/labels`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                      title="Etiketten"
                                     >
                                        <Tag className="w-5 h-5 text-zinc-400" />
                                        <span className="font-bold text-sm text-zinc-200">Etiketten</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/analytics`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <TrendingUp className="w-5 h-5 text-zinc-400" />
                                        <span className="font-bold text-sm text-zinc-200">Analytics</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/members`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <Users className="w-5 h-5 text-zinc-400" />
                                        <span className="font-bold text-sm text-zinc-200">Mitglieder</span>
                                        <span className="ml-auto text-zinc-600">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/settings`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                     >
                                        <Settings className="w-5 h-5 text-zinc-400" />
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
                                         {userBreweries.filter(b => b.id !== activeBreweryId).map(b => (
                                             <Link
                                                key={b.id}
                                                href={`/team/${b.id}`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full text-left bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-xl flex items-center justify-between hover:bg-zinc-900 transition"
                                             >
                                                <span className="text-sm font-bold text-zinc-400">{b.name}</span>
                                                <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded">Zu diesem Team</span>
                                             </Link>
                                         ))}
                                      </div>
                                   </div>
                               )}
                             </>
                         ) : (
                             <div className="text-center py-12 px-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed flex flex-col items-center">
                                 <Factory className="w-10 h-10 opacity-50 mb-4" />
                                 <h3 className="font-bold text-white mb-2">Kein Team</h3>
                                 <p className="text-sm text-zinc-500 mb-6">Du bist aktuell keinem Brauerei-Team zugeordnet.</p>
                                 <Link
                                    href="/dashboard/team/create"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="inline-block bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 transition"
                                 >
                                    Team Gründen
                                 </Link>
                             </div>
                         )}
                    </div>
                )}

                {user && mobileTab === 'discover' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Discover Hero */}
                        <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/10 border border-purple-900/50 p-5 rounded-2xl">
                              <div className="flex justify-between items-start mb-4">
                                 <div>
                                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">BotlLab Community</p>
                                    <h3 className="text-xl font-bold text-white leading-tight">Entdecken</h3>
                                 </div>
                                 <div className="bg-purple-500/10 text-purple-400 p-2 rounded-lg">
                                    <Globe className="w-5 h-5" />
                                 </div>
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
                                    <Globe className="w-5 h-5 text-zinc-400" />
                                    <span className="font-bold text-sm text-zinc-200">Rezepte</span>
                                    <span className="ml-auto text-zinc-600">→</span>
                                </Link>
                                <Link
                                    href="/forum"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                >
                                    <MessageSquare className="w-5 h-5 text-zinc-400" />
                                    <span className="font-bold text-sm text-zinc-200">Forum</span>
                                    <span className="ml-auto text-zinc-600">→</span>
                                </Link>
                            </div>
                         </div>
                    </div>
                )}

            </div>

             {/* 3. Footer (Fixed) */}
             {user && (
                 <div className="p-4 border-t border-zinc-900 bg-zinc-950 pb-8">
               {profile && (
                <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-2xl mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs overflow-hidden relative border border-zinc-700 bg-zinc-800`}>
                             <div className={`absolute inset-0 border-2 rounded-full opacity-50 ${tierBorderClass}`}></div>
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">{profile.display_name}</p>
                            <p className="text-[10px] uppercase font-black tracking-wide" style={{ color: tierConfig.color }}>{tierConfig.displayName}</p>
                        </div>
                    </div>
                    <Link
                       href="/dashboard/account"
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition"
                    >
                       <Settings className="w-5 h-5" />
                    </Link>
                </div>
               )}
               
               <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition"
               >
                <LogOut className="w-4 h-4" /> Abmelden
               </button>
             </div>
             )}

            </div>
          </div>
      )}                           

    </>
  );
}
