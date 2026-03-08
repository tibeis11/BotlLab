'use client';

import Link from "next/link";
import { 
  Beaker,
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
import { usePathname } from "next/navigation";
import { getUserBreweries, getActiveBrewery } from "@/lib/supabase";
import { useSupabase } from "@/lib/hooks/useSupabase";
import { useAuth } from "../context/AuthContext";

import { getBreweryBranding } from "@/lib/actions/premium-actions";
import { getTierBorderColor } from "@/lib/premium-config";
import UserAvatar from "./UserAvatar";

export default function Header({ breweryId, discoverSearchSlot, discoverMobileActions, forumSearchSlot, forumMobileActions }: { breweryId?: string; discoverSearchSlot?: React.ReactNode; discoverMobileActions?: React.ReactNode; forumSearchSlot?: React.ReactNode; forumMobileActions?: React.ReactNode }) {
  const supabase = useSupabase();
  const { user, loading, signOut } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('logo_url, display_name, subscription_tier, app_mode')
          .eq('id', user.id)
          .single();
        
        if (!cancelled) {
          if (profileData) {
            setProfile(profileData);
          } else if (profileError && profileError.code === 'PGRST116') {
            // Profile does not exist (likely created before trigger was active or improved)
            console.warn("User has no profile, attempting to cure...");
            
            // Construct a default profile
            const fallbackName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Brewer';
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                display_name: fallbackName,
                subscription_tier: 'free',
                subscription_status: 'active',
                ai_credits_used_this_month: 0
              });
            
            if (!createError) {
              // Set local state immediately to avoid reload need
              setProfile({ 
                display_name: fallbackName, 
                logo_url: null, 
                tier: 'lehrling', 
                subscription_tier: 'free' 
              });
            } else {
              console.error("Failed to auto-create profile", createError);
              // Optional: Force logout if state is unrecoverable?
              // await signOut(); 
            }
          }
        }

        // 2. Breweries
        const allBreweries = await getUserBreweries(user.id, supabase);
        if (!cancelled && allBreweries) setUserBreweries(allBreweries);

        // 3. Active Brewery
        let selectedBrewery = null;
        if (breweryId) {
             selectedBrewery = allBreweries?.find(b => b.id === breweryId);
        }
        
        // Fallback or override logic could go here if needed
        // Assuming getUserBreweries returns {id, name, ...}
        if (!selectedBrewery && allBreweries && allBreweries.length > 0) {
             // Maybe try to get from DB setting if we want perfect parity, but simple for now:
             const dbActive = await getActiveBrewery(user.id, supabase);
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

  const isDrinker = profile?.app_mode === 'drinker';
  const homeUrl = isDrinker ? '/my-cellar' : '/dashboard';
  const tierBorderClass = getTierBorderColor(profile?.subscription_tier);

  return (
    <>
    <nav className="border-b border-border-subtle bg-background/80 p-3 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-[1920px] w-full mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="flex-shrink-0">
          <Logo />
        </Link>

        {/* Search slot — rendered between logo and nav on desktop */}
        {(discoverSearchSlot || forumSearchSlot) && (
          <div className="hidden md:flex flex-1 justify-center px-4 min-w-0">
            {discoverSearchSlot || forumSearchSlot}
          </div>
        )}
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2 items-center flex-shrink-0">

          <Link 
            href="/pricing"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-text-muted hover:text-text-primary hover:bg-surface-hover/50"
          >
            <Gem className="w-4 h-4" />
            <span className="hidden xl:inline">Preise</span>
          </Link>

          {!forumSearchSlot && (
            <Link 
              href="/forum"
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-text-muted hover:text-text-primary hover:bg-surface-hover/50"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden xl:inline">Forum</span>
            </Link>
          )}

          {!discoverSearchSlot && (
            <Link 
              href="/discover" 
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-text-muted hover:text-text-primary hover:bg-surface-hover/50"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden xl:inline">Entdecken</span>
            </Link>
          )}
          
          <div className="h-4 w-px bg-border mx-2"></div>
          {loading ? (
            <div className="w-10 h-10 bg-surface-hover rounded-full animate-pulse"></div>
          ) : user ? (
            <>
            <NotificationBell />
            <div 
              className="relative"
              onMouseEnter={() => setShowMenu(true)}
              onMouseLeave={() => setShowMenu(false)}
            >
              <Link 
                href={homeUrl} 
                className="group flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition"
              >
                <UserAvatar src={profile?.logo_url} name={profile?.display_name} userId={profile?.id} tier={profile?.subscription_tier} sizeClass="w-8 h-8" className="shadow-lg" />
                <div className="flex flex-col items-start leading-none">
                    <span className="truncate max-w-[120px] font-bold text-text-primary text-sm">
                        {profile?.display_name || 'Profil'}
                    </span>
                </div>
              </Link>

              {showMenu && (
                <div className="absolute top-full right-0 pt-2 w-48 z-50">
                  <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                    <Link
                      href={homeUrl}
                      className="block px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" /> {isDrinker ? 'Mein Keller' : 'Dashboard'}
                    </Link>
                    {isDrinker && (
                      <Link
                        href="/team/create"
                        className="block px-4 py-3 text-sm text-brand hover:bg-surface-hover hover:text-brand-hover transition flex items-center gap-2 font-medium"
                      >
                        <Beaker className="w-4 h-4" /> Brauer werden →
                      </Link>
                    )}
                    <Link
                      href="/account"
                      className="block px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Einstellungen
                    </Link>
                    <div className="border-t border-border"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-surface-hover hover:text-red-300 transition flex items-center gap-2"
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
                href="/login?intent=brew" 
                className="text-sm font-bold text-text-secondary hover:text-text-primary px-4 py-2 transition"
              >
                Login
              </Link>
              <Link 
                href="/login?intent=brew" 
                className="text-sm font-bold bg-white text-black px-6 py-2 rounded-full hover:bg-cyan-400 hover:scale-105 transition transform"
              >
                Starten
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button & Notification */}
        <div className="md:hidden flex items-center gap-3">
          {discoverMobileActions}
          {forumMobileActions}
          {user && <NotificationBell />}
          <button 
            className="p-2 text-text-secondary hover:text-text-primary"
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
            className="lg:hidden fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-background/80"
        >
            <div className="flex flex-col h-full w-full" style={{ paddingRight: `${scrollbarCompensation}px` }}>
            
            {/* 1. Header with Close (Aligned with Main Header) */}
            <div className="border-b border-border-subtle bg-background p-3">
               <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-6">
                   <div className="flex items-center gap-6" onClick={() => setIsMobileMenuOpen(false)}>
                      <Logo /> 
                   </div>
                   <div className="flex items-center gap-4">
                     {user && <NotificationBell />}
                     <button 
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 text-text-secondary hover:text-text-primary"
                     >
                       <X className="w-6 h-6" />
                     </button>
                   </div>
               </div>
            </div>

            {/* Segmented Control Area (Only if logged in) */}
            {user && (
            <div className="p-4 border-b border-border-subtle bg-background">
               <div className="flex bg-surface p-1 rounded-xl overflow-x-auto no-scrollbar">
                    <button 
                      onClick={() => setMobileTab('personal')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'personal' ? 'bg-surface-hover text-text-primary shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                      <FlaskConical className={`w-4 h-4 ${mobileTab === 'personal' ? 'grayscale-0' : 'grayscale'}`} />
                      {isDrinker ? 'Mein Keller' : 'Labor'}
                    </button>
                    {!isDrinker && (
                      <button 
                        onClick={() => setMobileTab('team')}
                        className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'team' ? 'bg-brand-bg text-brand shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                      >
                        <Factory className="w-4 h-4" />
                        Brauerei
                      </button>
                    )}
                    <button 
                      onClick={() => setMobileTab('discover')}
                      className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'discover' ? 'bg-purple-900/50 text-purple-300 shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
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
                            href="/login?intent=brew"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-cyan-400 transition"
                        >
                            Anmelden
                        </Link>
                        <div className="grid grid-cols-1 gap-4 w-full">
                                <Link
                                    href="/discover"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition border-b border-border-subtle"
                                >
                                    <Globe className="w-5 h-5 text-text-secondary" />
                                    <span className="font-bold text-sm text-text-primary">Entdecken</span>
                                    <span className="ml-auto text-text-disabled">→</span>
                                </Link>
                                <Link
                                    href="/pricing"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition border-b border-border-subtle"
                                >
                                    <Gem className="w-5 h-5 text-text-secondary" />
                                    <span className="font-bold text-sm text-text-primary">Preise</span>
                                    <span className="ml-auto text-text-disabled">→</span>
                                </Link>
                                <Link
                                    href="/forum"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition border-b border-border-subtle"
                                >
                                    <MessageSquare className="w-5 h-5 text-text-secondary" />
                                    <span className="font-bold text-sm text-text-primary">Forum</span>
                                    <span className="ml-auto text-text-disabled">→</span>
                                </Link>
                        </div>
                    </div>
                )}

                {/* LOGGED IN VIEWS */}
                {user && mobileTab === 'personal' && (
                   <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                       
                       {/* Dashboard Hero */}
                       <Link 
                          href={homeUrl}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block bg-gradient-to-br from-surface-hover to-surface border border-border-hover p-5 rounded-2xl relative overflow-hidden group"
                       >
                          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <LayoutDashboard className="w-16 h-16" />
                          </div>
                          <p className="text-xs text-text-secondary uppercase font-black tracking-widest mb-1">Übersicht</p>
                          <h3 className="text-2xl font-black text-text-primary mb-2">{isDrinker ? 'Mein Keller' : 'Dashboard'}</h3>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                             <span>Alles im Blick</span>
                             <span>→</span>
                          </div>
                       </Link>

                       {/* List for Tools */}
                       <div>
                          <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                          <div className="divide-y divide-border/50">
                             <Link href={isDrinker ? '/my-cellar/collection' : '/dashboard/collection'} onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                <FlaskConical className="w-5 h-5" /> <span className="font-bold text-sm text-text-primary">Sammlung</span> <span className="ml-auto text-text-disabled">→</span>
                             </Link>
                             <Link href={isDrinker ? '/my-cellar/favorites' : '/dashboard/favorites'} onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                <Heart className="w-5 h-5" /> <span className="font-bold text-sm text-text-primary">Favoriten</span> <span className="ml-auto text-text-disabled">→</span>
                             </Link>
                             {!isDrinker && (
                               <Link href="/dashboard/achievements" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <Trophy className="w-5 h-5" /> <span className="font-bold text-sm text-text-primary">Achievements</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                             )}
                             {isDrinker && (
                               <Link href="/team/create" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition text-brand hover:text-brand-hover">
                                  <Beaker className="w-5 h-5" /> <span className="font-bold text-sm">Brauer werden</span> <span className="ml-auto">→</span>
                               </Link>
                             )}
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
                                  <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                                  <div className="divide-y divide-border/50">
                                     <Link
                                      href={`/team/${activeBreweryId}/feed`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                     >
                                        <MessageSquare className="w-5 h-5 text-text-secondary" />
                                        <span className="font-bold text-sm text-text-primary">Feed</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/brews`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                     >
                                        <Beer className="w-5 h-5 text-text-secondary" />
                                        <span className="font-bold text-sm text-text-primary">Rezepte</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/sessions`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                     >
                                        <Thermometer className="w-5 h-5 text-text-secondary" />
                                        <span className="font-bold text-sm text-text-primary">Sessions</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/inventory`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                     >
                                        <Package className="w-5 h-5 text-text-secondary" />
                                        <span className="font-bold text-sm text-text-primary">Inventar</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/labels`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                      title="Etiketten"
                                     >
                                        <Tag className="w-5 h-5 text-text-secondary" />
                                        <span className="font-bold text-sm text-text-primary">Etiketten</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/analytics`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                     >
                                        <TrendingUp className="w-5 h-5 text-text-secondary" />
                                        <span className="font-bold text-sm text-text-primary">Analytics</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/members`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                     >
                                        <Users className="w-5 h-5 text-text-secondary" />
                                        <span className="font-bold text-sm text-text-primary">Mitglieder</span>
                                        <span className="ml-auto text-text-disabled">→</span>
                                     </Link>
                                     <Link
                                      href={`/team/${activeBreweryId}/settings`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                     >
                                        <Settings className="w-5 h-5 text-text-secondary" />
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
                                         {userBreweries.filter(b => b.id !== activeBreweryId).map(b => (
                                             <Link
                                                key={b.id}
                                                href={`/team/${b.id}`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full text-left bg-surface/30 border border-border/50 p-3 rounded-xl flex items-center justify-between hover:bg-surface transition"
                                             >
                                                <span className="text-sm font-bold text-text-secondary">{b.name}</span>
                                                <span className="text-[10px] bg-surface-hover text-text-muted px-2 py-1 rounded">Zu diesem Team</span>
                                             </Link>
                                         ))}
                                      </div>
                                   </div>
                               )}
                             </>
                         ) : (
                             <div className="text-center py-12 px-6 bg-surface/30 rounded-2xl border border-border border-dashed flex flex-col items-center">
                                 <Factory className="w-10 h-10 opacity-50 mb-4" />
                                 <h3 className="font-bold text-text-primary mb-2">Kein Team</h3>
                                 <p className="text-sm text-text-muted mb-6">Du bist aktuell keinem Brauerei-Team zugeordnet.</p>
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
                              <p className="text-sm text-text-secondary mb-4">Finde Inspiration, tausche dich aus und entdecke neue Rezepte.</p>
                        </div>

                         <div>
                            <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Community</p>
                            <div className="divide-y divide-border/50">
                                <Link
                                    href="/discover"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                >
                                    <Globe className="w-5 h-5 text-text-secondary" />
                                    <span className="font-bold text-sm text-text-primary">Rezepte</span>
                                    <span className="ml-auto text-text-disabled">→</span>
                                </Link>
                                <Link
                                    href="/forum"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition"
                                >
                                    <MessageSquare className="w-5 h-5 text-text-secondary" />
                                    <span className="font-bold text-sm text-text-primary">Forum</span>
                                    <span className="ml-auto text-text-disabled">→</span>
                                </Link>
                            </div>
                         </div>
                    </div>
                )}

            </div>

             {/* 3. Footer (Fixed) */}
             {user && (
                 <div className="p-4 border-t border-border bg-background pb-8">
               {profile && (
                <div className="flex items-center justify-between bg-surface/50 p-3 rounded-2xl mb-3">
                    <div className="flex items-center gap-3">
                        <UserAvatar src={profile?.logo_url} name={profile?.display_name} userId={profile?.id} tier={profile?.subscription_tier} sizeClass="w-10 h-10" />
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">{profile.display_name}</p>
                        </div>
                    </div>
                    <Link
                       href="/account"
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-2 bg-surface-hover hover:bg-surface-hover/70 rounded-lg text-text-secondary hover:text-text-primary transition"
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
