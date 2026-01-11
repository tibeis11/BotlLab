'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Logo from '../../components/Logo';

export default function AdminHeader() {
  const [breweryName, setBreweryName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('brewery_name, logo_url')
          .eq('id', user.id)
          .single();
        
        if (data) {
          if (data.brewery_name) setBreweryName(data.brewery_name);
          if (data.logo_url) setLogoUrl(data.logo_url);
        }
      }
    }
    fetchProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
      <nav className="border-b border-border bg-surface/50 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          
          <Link href="/dashboard">
             <Logo />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 text-sm font-medium items-center">
            <Link href="/dashboard" className="hover:text-brand transition">Dashboard</Link>
            <Link href="/dashboard/brews" className="hover:text-brand transition">Meine Rezepte</Link>
            <Link href="/dashboard/collection" className="hover:text-brand transition">Meine Sammlung</Link>
            <Link href="/dashboard/bottles" className="hover:text-brand transition">Inventar</Link>
            <Link href="/discover" className="hover:text-brand transition">Entdecken</Link>
            
            <div className="h-4 w-px bg-zinc-700 mx-2"></div>
            
            <div 
              className="relative"
              onMouseEnter={() => setShowProfileMenu(true)}
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              <Link href="/dashboard/profile" className="flex items-center gap-2 hover:text-brand transition group">
                <div className="w-8 h-8 rounded-full bg-brand-dim/50 border border-cyan-700/50 flex items-center justify-center group-hover:bg-brand-dim transition text-xs overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span>🏰</span>
                  )}
                </div>
                <span className="truncate max-w-[150px] font-bold">
                  {breweryName || 'Mein Brau-Profil'}
                </span>
              </Link>

              {showProfileMenu && (
                <div className="absolute right-0 top-full pt-2 w-48 z-50">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link 
                      href="/dashboard/profile"
                      className="block w-full px-4 py-3 text-white hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2"
                    >
                      ⚙️ Profileinstellungen
                    </Link>
                    <Link 
                      href="/dashboard/account"
                      className="block w-full px-4 py-3 text-white hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2"
                    >
                      🔐 Kontoeinstellungen
                    </Link>
                    <Link 
                      href="/dashboard/collection"
                      className="block w-full px-4 py-3 text-white hover:bg-zinc-800 transition text-sm font-medium flex items-center gap-2"
                    >
                      🟡 Meine Sammlung
                    </Link>
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
          <div className="md:hidden pt-4 pb-2 animate-in slide-in-from-top-5 fade-in duration-200">
            <div className="flex flex-col gap-2 p-2">
              <Link href="/dashboard" className="p-4 rounded-xl hover:bg-zinc-900 transition flex items-center gap-3">📊 Dashboard</Link>
              <Link href="/dashboard/brews" className="p-4 rounded-xl hover:bg-zinc-900 transition flex items-center gap-3">📋 Rezepte</Link>
              <Link href="/dashboard/collection" className="p-4 rounded-xl hover:bg-zinc-900 transition flex items-center gap-3">🟡 Sammlung</Link>
              <Link href="/dashboard/bottles" className="p-4 rounded-xl hover:bg-zinc-900 transition flex items-center gap-3">🍾 Inventar</Link>
              <Link href="/discover" className="p-4 rounded-xl hover:bg-zinc-900 transition flex items-center gap-3">🌍 Entdecken</Link>
            </div>
          </div>
        )}
      </nav>
  );
}
