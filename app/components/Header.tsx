'use client';

import Link from "next/link";
import Logo from "./Logo";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          setUser(user);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('logo_url, brewery_name')
            .eq('id', user.id)
            .single();
          if (!cancelled && profileData) {
            setProfile(profileData);
          }
        }
      } catch (e) {
        // noop; ensure we always clear loading state below
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('logo_url, brewery_name')
          .eq('id', nextUser.id)
          .single();
        if (!cancelled && profileData) setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);


  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setShowMenu(false);
    window.location.reload();
  }

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
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 transition"
              >
                {profile?.logo_url ? (
                  <img 
                    src={profile.logo_url} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500/30 group-hover:border-cyan-500 transition"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm border-2 border-cyan-500/30 group-hover:border-cyan-500 transition">
                    {profile?.brewery_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition">
                  {profile?.brewery_name || 'Mein Profil'}
                </span>
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
        <div className="md:hidden bg-zinc-950/95 border-b border-zinc-800 animate-in slide-in-from-top-5 fade-in duration-200">
          <div className="px-6 py-4 flex flex-col space-y-4">
            {pathname === '/discover' ? (
              <Link 
                href="/" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-bold text-zinc-400 hover:text-white transition"
              >
                Startseite
              </Link>
            ) : (
              <Link 
                href="/discover" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-bold text-zinc-400 hover:text-white transition"
              >
                Entdecken
              </Link>
            )}

            <div className="h-px bg-zinc-800 my-2"></div>

            {loading ? (
              <div className="py-2 text-zinc-500">Lade...</div>
            ) : user ? (
              <>
                 <div className="flex items-center gap-3 mb-2">
                    {profile?.logo_url ? (
                      <img src={profile.logo_url} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {profile?.brewery_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="font-bold text-white">
                      {profile?.brewery_name || 'Mein Profil'}
                    </span>
                 </div>
                 
                 <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition py-1 flex items-center gap-2">
                   <span>📊</span> Dashboard
                 </Link>
                 <Link href="/dashboard/profile" onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition py-1 flex items-center gap-2">
                   <span>⚙️</span> Einstellungen
                 </Link>
                 <button onClick={handleLogout} className="text-red-500 hover:text-red-400 transition py-1 text-left flex items-center gap-2">
                   <span>🚪</span> Abmelden
                 </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                 <Link 
                   href="/login"
                   onClick={() => setIsMobileMenuOpen(false)} 
                   className="text-center w-full py-3 bg-zinc-800 rounded-full text-zinc-200 font-bold hover:bg-zinc-700 transition"
                 >
                   Login
                 </Link>
                 <Link 
                   href="/login"
                   onClick={() => setIsMobileMenuOpen(false)} 
                   className="text-center w-full py-3 bg-white text-black rounded-full font-bold hover:bg-cyan-400 transition"
                 >
                   Jetzt Starten
                 </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
