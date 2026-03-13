'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    MessageSquare, 
    Beer, 
    Thermometer, 
    Package, 
    Tag, 
    TrendingUp, Globe, 
    Users, 
    Settings, 
    Medal, 
    Heart, 
    Trophy,
    Gift,
    LayoutGrid,
    ArrowLeft
} from 'lucide-react';
import { useHeaderData } from '@/lib/hooks/useHeaderData';
import { getBreweryBranding } from '@/lib/actions/premium-actions';
import Logo from '@/app/components/Logo';
import { GlobalHeader } from '@/app/components/ui/GlobalHeader/GlobalHeader';

interface SquadHeaderProps {
    breweryId: string;
    isMember: boolean;
}

export default function SquadHeader({ breweryId, isMember }: SquadHeaderProps) {
    const pathname = usePathname();
    const { setIsMobileMenuOpen } = useHeaderData(breweryId);
    
    // UI State
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);
    
    // Data State
    const [branding, setBranding] = useState<{ logoUrl: string | null; breweryName: string | null; isPremiumBranding: boolean }>({
        logoUrl: null,
        breweryName: null,
        isPremiumBranding: false
    });

    // Fetch Branding
    useEffect(() => {
        if (breweryId) {
            getBreweryBranding(breweryId).then(res => {
                setBranding(res);
            });
        }
    }, [breweryId]);

    const tabs = [
        { name: 'Dashboard', path: `/team/${breweryId}/dashboard`, icon: LayoutDashboard },
        { name: 'Feed', path: `/team/${breweryId}/feed`, icon: MessageSquare },
        { name: 'Rezepte', path: `/team/${breweryId}/brews`, icon: Beer },
        { name: 'Sessions', path: `/team/${breweryId}/sessions`, icon: Thermometer },
        { name: 'Inventar', path: `/team/${breweryId}/inventory`, icon: Package },
        { name: 'Etiketten', path: `/team/${breweryId}/labels`, icon: Tag },
        { name: 'Analytics', path: `/team/${breweryId}/analytics`, icon: TrendingUp },
        { name: 'Bounties', path: `/team/${breweryId}/bounties`, icon: Gift },
    ];

    const adminTabs: { name: string, path: string, icon: any }[] = [];
    if(isMember) {
        adminTabs.push({ name: 'Mitglieder', path: `/team/${breweryId}/members`, icon: Users });
        adminTabs.push({ name: 'Einstellungen', path: `/team/${breweryId}/settings`, icon: Settings });
    }
    
    // Split for Desktop Cleanup (4+1 Concept)
    const primaryTabs = tabs.slice(0, 4);
    const secondaryTabs = tabs.slice(4);

    const leftContent = (
      <div className="flex items-center gap-6">
          <Link href={`/team/${breweryId}`} className="flex items-center gap-3">
              <Logo 
                  overrideText={branding.breweryName || undefined}
                  imageSrc={branding.logoUrl || "/brand/logo.svg"}
              />
          </Link>
          <Link href="/dashboard" className="hidden lg:flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg bg-surface-hover/50 hover:bg-surface-hover transition-all border border-border/50">
             <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
      </div>
    );

    const rightActions = (
      <div className="hidden lg:flex items-center gap-1">
          {primaryTabs.map(tab => {
              const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
              return (
                  <Link 
                      key={tab.path} 
                      href={tab.path}
                      title={tab.name}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border/50' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
                  >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden xl:inline">{tab.name}</span>
                  </Link>
              );
          })}

          {/* Tools / Management Concept */}
          <div 
              className="relative ml-2"
              onMouseEnter={() => setShowAdminMenu(true)}
              onMouseLeave={() => setShowAdminMenu(false)}
          >
              <button
                  title="Tools & Management" 
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${showAdminMenu ? 'text-text-primary bg-surface-hover' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
              >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden xl:inline">Tools</span>
                  <span className="text-[10px] ml-1">▼</span>
              </button>
              
              {showAdminMenu && (
                  <div className="absolute right-0 top-full pt-2 w-56 z-40">
                      <div className="bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 p-1">
                          <div className="px-3 py-2 text-xs font-bold text-text-disabled uppercase tracking-widest">Tools</div>
                          {secondaryTabs.map(tab => {
                               const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                               return (
                                  <Link 
                                      key={tab.path} 
                                      href={tab.path}
                                      className={`px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 rounded-lg ${isActive ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border/50' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
                                  >
                                      <tab.icon className="w-4 h-4" />
                                      <span>{tab.name}</span>
                                  </Link>
                               )
                          })}
                          
                          {adminTabs.length > 0 && (
                              <>
                                  <div className="h-px bg-border my-1 mx-2"></div>
                                  <div className="px-3 py-2 text-xs font-bold text-text-disabled uppercase tracking-widest">Admin</div>
                                  {adminTabs.map(tab => {
                                      const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                                      return (
                                          <Link 
                                              key={tab.path} 
                                              href={tab.path}
                                              className={`px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 rounded-lg ${isActive ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border/50' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
                                          >
                                              <tab.icon className="w-4 h-4" />
                                              <span>{tab.name}</span>
                                          </Link>
                                      )
                                  })}
                              </>
                          )}
                      </div>
                  </div>
              )}
          </div>

          <div className="h-4 w-px bg-border mx-2"></div>

          {/* Discover Icon */}
          <div 
            className="relative flex h-9 w-9 items-center justify-center ml-1"
            onMouseEnter={() => setShowDiscoverMenu(true)}
            onMouseLeave={() => setShowDiscoverMenu(false)}
          >
            <Link 
              href="/discover" 
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
            >
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
      <div>
        <p className="text-xs text-brand font-bold uppercase tracking-widest px-1 mb-1">Team Ansicht</p>
        <div className="divide-y divide-border/50">
          {tabs.map(tab => {
            const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
            return (
              <Link
                key={tab.path}
                href={tab.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition ${isActive ? 'bg-surface/30' : ''}`}
              >
                <tab.icon className={`w-5 h-5 ${isActive ? 'text-brand' : 'text-text-secondary'}`} />
                <span className={`font-bold text-sm ${isActive ? 'text-brand' : 'text-text-primary'}`}>{tab.name}</span>
                <span className="ml-auto text-text-disabled">→</span>
              </Link>
            );
          })}
          {adminTabs.length > 0 && adminTabs.map(tab => {
              const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
              return (
                  <Link
                    key={tab.path}
                    href={tab.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition ${isActive ? 'bg-surface/30' : ''}`}
                  >
                    <tab.icon className={`w-5 h-5 ${isActive ? 'text-brand' : 'text-text-secondary'}`} />
                    <span className={`font-bold text-sm ${isActive ? 'text-brand' : 'text-text-primary'}`}>{tab.name}</span>
                    <span className="ml-auto text-text-disabled">→</span>
                  </Link>
              )
          })}
        </div>
        <div className="h-px bg-border mx-2 my-4"></div>
      </div>
    );

    return (
      <GlobalHeader 
         colorZone="team"
         breweryId={breweryId}
         showLogo={false} // Since we provide custom Logo with branding in leftContent
         leftContent={leftContent}
         rightActions={rightActions}
         customMobileLinks={customMobileLinks}
      />
    );
}