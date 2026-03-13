'use client';
// ZWEI WELTEN Phase 2 / Phase 3: Consumer-Navigation
// Kein Brewery-Kontext — für Trinker (app_mode='drinker')

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FlaskConical,
  Heart,
  Globe,
  MessageSquare,
  Menu,
  Beaker,
  Trophy,
  Archive,
} from 'lucide-react';
import { GlobalHeader } from '@/app/components/ui/GlobalHeader/GlobalHeader';
import { useState } from 'react';
import { useHeaderData } from '@/lib/hooks/useHeaderData';

const desktopTabs = [
  { name: 'Übersicht', path: '/my-cellar', icon: Home, exact: true },
  { name: 'Sammlung', path: '/my-cellar/collection', icon: FlaskConical },
  { name: 'Favoriten', path: '/my-cellar/favorites', icon: Heart },
  { name: 'Stash', path: '/my-cellar/stash', icon: Archive },
  { name: 'Taste DNA', path: '/my-cellar/taste-dna', icon: Beaker },
  { name: 'Rangliste', path: '/my-cellar/leaderboard', icon: Trophy },
];

export default function ConsumerHeader() {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);
  const { setIsMobileMenuOpen } = useHeaderData(); // Just to close menu on mobile

  // Split tabs for Desktop (4+2 Concept)
  const primaryTabs = desktopTabs.slice(0, 4);
  const secondaryTabs = desktopTabs.slice(4);

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  const rightActions = (
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

      <div className="h-4 w-px bg-border mx-2"></div>

      {/* Discover Icon */}
      <div
        className="relative flex h-9 w-9 items-center justify-center"
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
    </div>
  );

  const customMobileLinks = (
    <div className="mb-4">
      <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-2">Mein Keller</p>
      <div className="space-y-1">
        {desktopTabs.map(tab => {
          const active = isActive(tab.path, tab.exact);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${active ? 'bg-brand-bg text-brand' : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </Link>
          );
        })}
      </div>
      <div className="h-px bg-border mx-2 my-4"></div>
    </div>
  );

  return (
    <GlobalHeader 
       colorZone="personal"
       rightActions={rightActions}
       customMobileLinks={customMobileLinks}
    />
  );
}
