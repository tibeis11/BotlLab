'use client';

import Link from "next/link";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

  // Branding-Feature entfernt: Immer BotlLab-Logo anzeigen
  useEffect(() => {
    if (isMobileMenuOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('logo_url, tier, display_name, subscription_tier')
          .eq('id', user.id)
          .single();
        if (!cancelled && profileData) {
          setProfile(profileData);
        }
      } else {
        if (!cancelled) setProfile(null);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

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
    <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1920px] w-full mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-4 items-center">
          <Link 
            href="/pricing"
            className="text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
          >
            Preise
          </Link>

          <Link 
            href="/forum"
            className="text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
          >
            Forum
          </Link>
          
          <Link 
            href="/discover" 
            className="text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
          >
            Entdecken
          </Link>
          
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
                      className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                      📊 Dashboard
                    </Link>
                    <Link
                      href="/dashboard/account"
                      className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                      ⚙️ Einstellungen
                    </Link>
                    <div className="border-t border-zinc-800"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 transition"
                    >
                      🚪 Abmelden
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
          <div className="md:hidden fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-zinc-950/80">
              
              {/* 1. Header with Close (Aligned with Main Header) */}
              <div className="border-b border-zinc-900 bg-zinc-950 h-20 flex items-center justify-center">
                   <div className="w-full max-w-[1920px] px-6 flex items-center justify-between">
                   <div onClick={() => setIsMobileMenuOpen(false)}>
                      <Logo /> 
                   </div>
                   <div className="flex items-center gap-4">
                     {user && <NotificationBell />}
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

              {/* 2. Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {user ? (
                      /* LOGGED IN VIEW */
                      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                           {/* Dashboard Hero */}
                           <Link 
                              href="/dashboard"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block bg-gradient-to-br from-cyan-950/40 to-cyan-900/10 border border-cyan-900/50 p-5 rounded-2xl relative overflow-hidden group"
                           >
                              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <span className="text-6xl">📊</span>
                              </div>
                              <p className="text-xs text-cyan-500 uppercase font-black tracking-widest mb-1">Mein Bereich</p>
                              <h3 className="text-2xl font-black text-white mb-2">Dashboard</h3>
                              <div className="flex items-center gap-2 text-sm text-zinc-300">
                                 <span>Zurück ans Werk</span>
                                 <span>→</span>
                              </div>
                           </Link>

                           {/* Navigation Grid */}
                           <div>
                              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-3">Menu</p>
                              <div className="grid grid-cols-2 gap-3">
                                  <Link
                                      href="/discover"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition"
                                  >
                                      <span className="text-2xl mb-1">🌍</span>
                                      <span className="font-bold text-sm text-zinc-200">Entdecken</span>
                                  </Link>
                                  <Link
                                      href="/pricing"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition"
                                  >
                                      <span className="text-2xl mb-1">💎</span>
                                      <span className="font-bold text-sm text-zinc-200">Preise</span>
                                  </Link>
                              </div>
                           </div>
                      </div>
                  ) : (
                      /* PUBLIC VIEW */
                      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                           
                           <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl text-center">
                               <h3 className="text-2xl font-black text-white mb-2">Willkommen bei BotlLab</h3>
                               <p className="text-zinc-400 text-sm mb-6">Dein digitales Braulabor. Organisiere deine Sude, teile Rezepte und manage deine Inventory.</p>
                               
                               <div className="space-y-3">
                                   <Link 
                                     href="/login"
                                     onClick={() => setIsMobileMenuOpen(false)} 
                                     className="flex items-center justify-center w-full py-4 bg-white text-black rounded-xl font-black hover:bg-cyan-400 transition shadow-lg text-lg"
                                   >
                                     🚀 Jetzt Starten
                                   </Link>
                                   <Link 
                                     href="/login"
                                     onClick={() => setIsMobileMenuOpen(false)} 
                                     className="flex items-center justify-center w-full py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition"
                                   >
                                     Login
                                   </Link>
                               </div>
                           </div>

                           <div>
                              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-3">Navigation</p>
                              <div className="grid grid-cols-2 gap-3">
                                  <Link
                                      href="/discover"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition"
                                  >
                                      <span className="text-2xl mb-1">🌍</span>
                                      <span className="font-bold text-sm text-zinc-200">Entdecken</span>
                                  </Link>
                                  <Link
                                      href="/forum"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition"
                                  >
                                      <span className="text-2xl mb-1">💬</span>
                                      <span className="font-bold text-sm text-zinc-200">Forum</span>
                                  </Link>
                                  <Link
                                      href="/pricing"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition"
                                  >
                                      <span className="text-2xl mb-1">💎</span>
                                      <span className="font-bold text-sm text-zinc-200">Preise</span>
                                  </Link>
                              </div>
                           </div>
                      </div>
                  )}
              </div>

              {/* 3. Footer (Auth User Only) */}
              {user && (
                    <div className="p-4 border-t border-zinc-900 bg-zinc-950 pb-8">
                         <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-2xl mb-3">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs overflow-hidden relative border border-zinc-700 bg-zinc-800">
                                     <div className={`absolute inset-0 border-2 rounded-full opacity-50 ${tierBorderClass}`}></div>
                                     <img src={tierConfig.avatarPath} alt="Avatar" className="w-full h-full object-cover" />
                                 </div>
                                 <div className="overflow-hidden">
                                     <p className="text-sm font-bold text-white leading-tight truncate max-w-[150px]">{profile?.display_name || user?.email}</p>
                                     <p className="text-[10px] uppercase font-black tracking-wide" style={{ color: tierConfig.color }}>{tierConfig.displayName}</p>
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
                         
                         <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition"
                         >
                            <span>🚪</span> Abmelden
                         </button>
                    </div>
              )}
          </div>
      )}
    </>
  );
}
