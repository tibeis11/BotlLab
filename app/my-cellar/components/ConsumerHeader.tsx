'use client';
// ZWEI WELTEN Phase 2 / Phase 3 (vervollständigt): Consumer-Navigation
// Kein Brewery-Kontext — für Trinker (app_mode='drinker')

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  FlaskConical,
  Heart,
  Globe,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Beaker,
  Trophy,
  ArrowRight,
  User,
  Archive,
} from 'lucide-react';
import Logo from '@/app/components/Logo';
import NotificationBell from '@/app/components/NotificationBell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { getTierBorderColor } from '@/lib/premium-config';

const desktopTabs = [
  { name: 'Übersicht', path: '/my-cellar', icon: Home, exact: true },
  { name: 'Sammlung', path: '/my-cellar/collection', icon: FlaskConical },
  { name: 'Favoriten', path: '/my-cellar/favorites', icon: Heart },
  { name: 'Stash', path: '/my-cellar/stash', icon: Archive },
  { name: 'Taste DNA', path: '/my-cellar/taste-dna', icon: Beaker },
  { name: 'Rangliste', path: '/my-cellar/leaderboard', icon: Trophy },
];

export default function ConsumerHeader() {
  const { user, signOut } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const w = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${w}px`;
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
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, logo_url, subscription_tier')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setUserName(data.display_name || user.email?.split('@')[0] || 'Trinker');
        setAvatarUrl(data.logo_url);
        setBorderColor(getTierBorderColor(data.subscription_tier));
      });
  }, [user]);

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-900 h-14 flex items-center px-4">
        <div className="w-full max-w-6xl mx-auto flex items-center gap-4">

          {/* Logo */}
          <Link href="/my-cellar" className="flex-shrink-0 mr-2">
            <Logo className="h-7 w-auto" />
          </Link>

          {/* Desktop Tabs */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {desktopTabs.map((tab) => (
              <Link
                key={tab.path}
                href={tab.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive(tab.path, tab.exact)
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            ))}

            {/* Entdecken Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDiscoverMenu((v) => !v)}
                onBlur={() => setTimeout(() => setShowDiscoverMenu(false), 150)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  showDiscoverMenu
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Globe className="w-4 h-4" /> Entdecken
              </button>
              {showDiscoverMenu && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
                  <Link
                    href="/discover"
                    className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition flex items-center gap-2"
                  >
                    <FlaskConical className="w-4 h-4" /> Rezepte
                  </Link>
                  <Link
                    href="/forum"
                    className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Forum
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Right: Notifications + Profile */}
          <div className="flex items-center gap-2 ml-auto">
            {user && <NotificationBell />}

            {/* Profile button */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                onBlur={() => setTimeout(() => setShowProfileMenu(false), 150)}
                className={`w-8 h-8 rounded-full border-2 overflow-hidden flex items-center justify-center ${borderColor} bg-zinc-800 hover:brightness-110 transition`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide font-bold mb-0.5">Angemeldet als</p>
                    <p className="font-bold text-white truncate">{userName}</p>
                  </div>
                  <Link
                    href="/account"
                    className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Einstellungen
                  </Link>
                  {user && (
                    <Link
                      href={`/brewer/${user.id}`}
                      className="block px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> Mein Profil
                    </Link>
                  )}
                  <div className="border-t border-zinc-800 mx-2 my-1" />
                  {/* Brauer werden CTA */}
                  <Link
                    href="/team/create"
                    className="block px-4 py-3 text-sm text-cyan-400 hover:bg-zinc-800 hover:text-cyan-300 transition flex items-center gap-2 font-medium"
                  >
                    <Beaker className="w-4 h-4" /> Brauer werden →
                  </Link>
                  <div className="border-t border-zinc-800 mx-2 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Abmelden
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950/95 backdrop-blur flex flex-col pt-16 pb-8 px-4 md:hidden overflow-y-auto">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800">
            <div className={`w-10 h-10 rounded-full border-2 overflow-hidden ${borderColor} bg-zinc-800`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{userName}</p>
              <p className="text-xs text-zinc-500">Mein Keller</p>
            </div>
            <Link
              href="/account"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 mb-6">
            {desktopTabs.map((tab) => (
              <Link
                key={tab.path}
                href={tab.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition ${
                  isActive(tab.path, tab.exact)
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <tab.icon className="w-5 h-5" /> {tab.name}
              </Link>
            ))}
          </nav>

          <div className="border-t border-zinc-800 mb-4" />

          <p className="text-xs text-zinc-600 uppercase font-bold tracking-widest mb-2 px-2">Entdecken</p>
          <nav className="flex flex-col gap-1 mb-8">
            <Link href="/discover" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center gap-3 transition">
              <FlaskConical className="w-5 h-5" /> Rezepte
            </Link>
            <Link href="/forum" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center gap-3 transition">
              <MessageSquare className="w-5 h-5" /> Forum
            </Link>
          </nav>

          {/* Become Brewer CTA */}
          <Link
            href="/team/create"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-zinc-900 border border-cyan-800/40 text-cyan-300 hover:border-cyan-600/60 transition mb-6"
          >
            <Beaker className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">Brauer werden</p>
              <p className="text-xs text-zinc-400">Gründe deine eigene Brauerei</p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white hover:bg-zinc-900 transition mt-auto"
          >
            <LogOut className="w-5 h-5" /> Abmelden
          </button>
        </div>
      )}
    </>
  );
}
