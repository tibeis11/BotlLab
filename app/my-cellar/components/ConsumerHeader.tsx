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
import UserAvatar from '@/app/components/UserAvatar';
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
  const [subscriptionTier, setSubscriptionTier] = useState<string | undefined>(undefined);
  const [borderColor, setBorderColor] = useState('border-border');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Split tabs for Desktop (4+2 Concept)
  const primaryTabs = desktopTabs.slice(0, 4);
  const secondaryTabs = desktopTabs.slice(4);

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
        setSubscriptionTier(data.subscription_tier);
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
      <header className="border-b border-border-subtle bg-background/80 backdrop-blur-md sticky top-0 z-[3000]">
        <div className="max-w-[1920px] w-full mx-auto px-6 py-3 flex items-center justify-between">

          {/* Left: Logo */}
          <div className="flex items-center gap-6">
            <Link href="/my-cellar">
              <Logo />
            </Link>
          </div>

          {/* Right: Navigation + Actions */}
          <div className="flex items-center gap-2">

            {/* Desktop Tabs */}
            <div className="hidden lg:flex items-center gap-1 mr-2">
              {primaryTabs.map(tab => {
                const active = isActive(tab.path, tab.exact);
                return (
                  <Link
                    key={tab.path}
                    href={tab.path}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${active ? 'bg-brand-bg text-brand' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </Link>
                );
              })}

              {secondaryTabs.length > 0 && (
                <div
                  className="relative ml-2"
                  onMouseEnter={() => setShowMoreMenu(true)}
                  onMouseLeave={() => setShowMoreMenu(false)}
                >
                  <button
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${showMoreMenu ? 'text-text-primary bg-surface-hover' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
                  >
                    <Menu className="w-4 h-4" />
                    <span>Mehr</span>
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-full pt-2 w-48 z-40">
                      <div className="bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 p-1">
                        {secondaryTabs.map(tab => {
                          const active = isActive(tab.path, tab.exact);
                          return (
                            <Link
                              key={tab.path}
                              href={tab.path}
                              className={`px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 rounded-lg ${active ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}`}
                            >
                              <tab.icon className="w-4 h-4" />
                              <span>{tab.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-border mx-2 hidden lg:block"></div>

            {/* Discover Icon */}
            <div
              className="relative hidden lg:flex h-9 w-9 items-center justify-center"
              onMouseEnter={() => setShowDiscoverMenu(true)}
              onMouseLeave={() => setShowDiscoverMenu(false)}
            >
              <Link href="/discover" className="text-text-muted hover:text-text-primary transition-colors">
                <Globe className="w-5 h-5" />
              </Link>
              {showDiscoverMenu && (
                <div className="absolute right-0 top-full pt-4 w-48 z-50">
                  <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 px-1 py-1">
                    <Link href="/discover" className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg">
                      <FlaskConical className="w-4 h-4" /><span>Rezepte</span>
                    </Link>
                    <Link href="/forum" className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg">
                      <MessageSquare className="w-4 h-4" /><span>Forum</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden lg:block">
              <NotificationBell />
            </div>

            {/* Profile Menu */}
            <div
              className="relative hidden lg:block"
              onMouseEnter={() => setShowProfileMenu(true)}
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              <button className="flex items-center gap-0 xl:gap-3 pl-1 pr-1 xl:pr-4 py-1 rounded-full bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition group">
                <UserAvatar src={avatarUrl} name={userName} userId={user?.id} tier={subscriptionTier} sizeClass="w-8 h-8" className="shadow-lg" />
                <div className="hidden xl:flex flex-col items-start leading-none">
                  <span className="truncate max-w-[120px] font-bold text-text-primary text-sm">
                    {userName || 'Profil'}
                  </span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full pt-2 w-56 z-50">
                  <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-border bg-surface-hover/50">
                      <p className="text-xs text-text-disabled uppercase tracking-widest font-bold mb-1">Angemeldet als</p>
                      <p className="font-bold text-text-primary truncate">{userName}</p>
                    </div>
                    <div className="p-1">
                      <Link href="/account" className="block w-full px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition text-sm font-medium flex items-center gap-3 text-left">
                        <Settings className="w-4 h-4" /> Einstellungen
                      </Link>
                      {user && (
                        <Link href={`/brewer/${user.id}`} className="block w-full px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition text-sm font-medium flex items-center gap-3 text-left">
                          <User className="w-4 h-4" /> Öffentliches Profil
                        </Link>
                      )}
                    </div>
                    <div className="p-1 border-t border-border">
                      <Link href="/team/create" className="block w-full px-3 py-2 text-brand hover:bg-brand-bg hover:text-brand-hover rounded-lg transition text-sm font-bold flex items-center gap-3 text-left">
                        <Beaker className="w-4 h-4" /> Brauer werden
                      </Link>
                      <button onClick={handleSignOut} className="block w-full px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition text-sm font-medium flex items-center gap-3 text-left">
                        <LogOut className="w-4 h-4" /> Abmelden
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <div className="flex items-center gap-2 lg:hidden">
              <NotificationBell />
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 lg:hidden supports-[backdrop-filter]:bg-background/80">
          <div className="border-b border-border-subtle bg-background p-3">
            <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-4">
              <Link href="/my-cellar" onClick={() => setIsMobileMenuOpen(false)}>
                <Logo />
              </Link>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-text-muted hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {desktopTabs.map(tab => (
              <Link
                key={tab.path}
                href={tab.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive(tab.path, tab.exact) ? 'bg-brand-bg text-brand' : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'}`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </Link>
            ))}

            <div className="h-px bg-border mx-2 my-4"></div>
            <p className="px-4 text-xs font-bold text-text-disabled uppercase tracking-widest mb-2">Entdecken</p>
            <Link href="/discover" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all">
              <FlaskConical className="w-5 h-5" /> Rezepte
            </Link>
            <Link href="/forum" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all">
              <MessageSquare className="w-5 h-5" /> Forum
            </Link>
          </div>

          <div className="p-4 border-t border-border bg-background pb-8">
            <div className="flex items-center gap-3 mb-4 px-2">
              <UserAvatar src={avatarUrl} name={userName} userId={user?.id} tier={subscriptionTier} sizeClass="w-10 h-10" />
              <p className="font-bold text-text-primary">{userName}</p>
            </div>
            <Link
              href="/team/create"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-brand-bg border border-brand/30 text-brand hover:border-brand/60 transition mb-3"
            >
              <Beaker className="w-6 h-6 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">Brauer werden</p>
                <p className="text-xs text-text-muted">Gründe deine eigene Brauerei</p>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} className="bg-surface hover:bg-surface-hover text-text-secondary p-3 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" /> Einstellungen
              </Link>
              <button onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }} className="bg-surface hover:bg-red-900/20 text-red-400 p-3 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Abmelden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
