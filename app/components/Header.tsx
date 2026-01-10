'use client';

import Link from "next/link";
import Logo from "./Logo";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const pathname = usePathname();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('logo_url, brewery_name')
        .eq('id', user.id)
        .single();
      if (profileData) {
        setProfile(profileData);
      }
    }
    setLoading(false);
  }

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
        <div className="flex gap-4 items-center">
          {pathname === '/discover' ? (
            <Link 
              href="/" 
              className="hidden sm:block text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
            >
              Startseite
            </Link>
          ) : (
            <Link 
              href="/discover" 
              className="hidden sm:block text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
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
                <span className="hidden sm:inline text-sm font-bold text-zinc-400 group-hover:text-white transition">
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
                className="hidden sm:block text-sm font-bold text-zinc-400 hover:text-white px-4 py-2 transition"
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
      </div>
    </nav>
  );
}
