'use client';

import Link from "next/link";
import Logo from "./Logo";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTierConfig } from "@/lib/tier-system";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('logo_url, tier, display_name')
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

  async function handleLogout() {
    await signOut();
    setShowMenu(false);
    // Refresh wird im Context behandelt
  }

  const tierConfig = profile ? getTierConfig(profile.tier || 'lehrling') : getTierConfig('lehrling');

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-4 items-center">
          {pathname === '/discover' ? (
            <Link 
              href="/" 
              className="text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
            >
              Startseite
            </Link>
          ) : (
            <Link 
              href="/discover" 
              className="text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
            >
              Entdecken
            </Link>
          )}
          
          {loading ? (
            <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse"></div>
          ) : user ? (
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
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg"
                    style={{ backgroundColor: `${tierConfig.color}20` }}
                >
                    <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierConfig.color }}></div>
                    <img src={tierConfig.avatarPath} alt="Avatar" className="w-full h-full object-cover" />
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
                      href="/dashboard/profile"
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
            
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Menu</p>

            {pathname === '/discover' ? (
              <Link 
                href="/" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3"
              >
                <span>🏠</span> Startseite
              </Link>
            ) : (
              <Link 
                href="/discover" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3"
              >
                <span>🌍</span> Entdecken
              </Link>
            )}

            <div className="h-px bg-zinc-800 my-2"></div>

            {loading ? (
              <div className="py-2 px-3 text-zinc-500 text-sm">Lade...</div>
            ) : user ? (
              <>
                 <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl mb-2">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-white font-bold overflow-hidden relative">
                        {profile?.logo_url ? (
                          <img src={profile.logo_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierConfig.color }}></div>
                    </div>
                    <div>
                        <span className="block font-bold text-white text-sm">
                          {profile?.display_name || 'Mein Profil'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: tierConfig.color }}>
                            {tierConfig.displayName}
                        </span>
                    </div>
                 </div>
                 
                 <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3">
                   <span>📊</span> Dashboard
                 </Link>
                 <Link href="/dashboard/profile" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3">
                   <span>⚙️</span> Einstellungen
                 </Link>
                 <button onClick={handleLogout} className="w-full text-left p-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition flex items-center gap-3">
                   <span>🚪</span> Abmelden
                 </button>
              </>
            ) : (
              <div className="space-y-2 mt-2">
                 <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Mitglied werden</p>
                 <Link 
                   href="/login"
                   onClick={() => setIsMobileMenuOpen(false)} 
                   className="flex items-center justify-center w-full py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition"
                 >
                   Login
                 </Link>
                 <Link 
                   href="/login"
                   onClick={() => setIsMobileMenuOpen(false)} 
                   className="flex items-center justify-center w-full py-4 bg-white text-black rounded-xl font-black hover:bg-cyan-400 transition shadow-lg"
                 >
                   🚀 Jetzt Starten
                 </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
