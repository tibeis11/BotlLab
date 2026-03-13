'use client';
// ZWEI WELTEN Phase 2 / Phase 3: Brewer-Navigation (Dashboard)
// ColorZone="personal" da Dashboard eher auf den User bezogen ist,
// jedoch mit Zugriff auf seine Brauereien.

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Beer, 
  FlaskConical, 
  Globe, 
  LayoutDashboard, 
  MessageSquare, 
  Heart,
  Trophy,
  Factory
} from 'lucide-react';
import { useState } from 'react';
import { GlobalHeader } from '@/app/components/ui/GlobalHeader/GlobalHeader';
import { useHeaderData } from '@/lib/hooks/useHeaderData';

export default function AdminHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breweryIdParams = searchParams.get('breweryId') || undefined;

  // We rely on useHeaderData to get breweries + active brewery info
  const headerData = useHeaderData(breweryIdParams);
  const { userBreweries, activeBreweryId, setIsMobileMenuOpen } = headerData;

  const [showBreweryMenu, setShowBreweryMenu] = useState(false);
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);

  const handleSwitchBrewery = (id: string) => {
    if (id === activeBreweryId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('breweryId', id);
    window.location.href = `${pathname}?${params.toString()}`;
  };

  const tabs = [
    { name: 'Sammlung', path: '/dashboard/collection', icon: FlaskConical },
    { name: 'Favoriten', path: '/dashboard/favorites', icon: Heart },
    { name: 'Achievements', path: '/dashboard/achievements', icon: Trophy },
  ];

  const rightActions = (
    <div className="hidden lg:flex gap-1 text-sm font-medium items-center mr-2">
      <Link 
        href="/dashboard" 
        title="Dashboard"
        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname === '/dashboard' ? 'bg-brand-bg text-brand' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}`}
      >
        <LayoutDashboard className="w-4 h-4" />
        <span className="hidden xl:inline">Dashboard</span>
      </Link>

      {tabs.map(tab => {
        const isActive = tab.path === '/dashboard' 
          ? pathname === '/dashboard'
          : (pathname === tab.path || pathname?.startsWith(tab.path + '/'));
          
        return (
          <Link 
            key={tab.path} 
            href={tab.path}
            title={tab.name}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-brand-bg text-brand' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden xl:inline">{tab.name}</span>
          </Link>
        );
      })}

      <div className="h-4 w-px bg-border mx-2"></div>
        
      {/* Team Dropdown/Switcher */}
      {activeBreweryId && (
        <div 
          className="relative group"
          onMouseEnter={() => setShowBreweryMenu(true)}
          onMouseLeave={() => setShowBreweryMenu(false)}
        >
          <button 
            title="Team / Brauerei"
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
          >
              <Factory className="w-5 h-5" />
          </button>
          
          {showBreweryMenu && (
              <div className="absolute right-0 top-full pt-2 w-56 z-50">
                  <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 p-1">
                      <Link 
                          href={`/team/${activeBreweryId}`}
                          className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg"
                      >
                          <LayoutDashboard className="w-4 h-4" /> <span>Team-Dashboard</span>
                      </Link>
                      
                      <div className="h-px bg-border my-1 mx-2"></div>
                      
                      {userBreweries.length > 1 && (
                          <>
                          <div className="h-px bg-border my-1 mx-2"></div>
                          <p className="px-3 py-2 text-[10px] text-text-disabled uppercase font-black tracking-wider">Team wechseln</p>
                          {userBreweries.filter(b => b.id !== activeBreweryId).map(b => (
                                  <button
                                  key={b.id}
                                  onClick={() => handleSwitchBrewery(b.id)}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-hover hover:text-text-primary text-text-muted transition flex items-center gap-2 group font-bold"
                                  >
                                  <span className="opacity-50 group-hover:opacity-100 transition">↳</span>
                                  <span className="truncate">{b.name}</span>
                                  </button>
                          ))}
                          </>
                      )}
                  </div>
              </div>
          )}
        </div>
      )}

      {/* Discover Icon */}
      <div 
        className="relative flex h-9 w-9 items-center justify-center ml-1"
        onMouseEnter={() => setShowDiscoverMenu(true)}
        onMouseLeave={() => setShowDiscoverMenu(false)}
      >
        <Link href="/discover" className="text-text-muted hover:text-text-primary transition-colors">
            <Globe className="w-5 h-5" />
        </Link>
        {showDiscoverMenu && (
            <div className="absolute right-0 top-full pt-2 w-48 z-50">
                <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 px-1 py-1">
                    <Link href="/discover" className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg">
                        <Beer className="w-4 h-4" />
                        <span>Rezepte</span>
                    </Link>
                    <Link href="/forum" className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg">
                        <MessageSquare className="w-4 h-4" />
                        <span>Forum</span>
                    </Link>
                </div>
            </div>
        )}
      </div>
    </div>
  );

  const customMobileLinks = (
    <div className="mb-4">
      <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-2">Dashboard</p>
      <div className="space-y-1">
        <Link
          href="/dashboard"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${pathname === '/dashboard' ? 'bg-brand-bg text-brand' : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        {tabs.map(tab => {
          const isActive = tab.path === '/dashboard' 
            ? pathname === '/dashboard'
            : (pathname === tab.path || pathname?.startsWith(tab.path + '/'));
          return (
            <Link
              key={tab.path}
              href={tab.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? 'bg-brand-bg text-brand' : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'}`}
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
       breweryId={breweryIdParams}
       rightActions={rightActions}
       customMobileLinks={customMobileLinks}
    />
  );
}