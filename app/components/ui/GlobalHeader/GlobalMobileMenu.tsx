'use client';

import Link from "next/link";
import { 
  Beaker,
  Beer,
  Factory,
  FlaskConical,
  Gem,
  Globe, 
  Heart,
  Home,
  Archive,
  LayoutDashboard, 
  LogOut, 
  MessageSquare, 
  Package,
  Settings, 
  Tag,
  Thermometer,
  TrendingUp,
  Trophy,
  Users,
  X,
  Calculator
} from 'lucide-react';
import { useState, useEffect } from "react";
import Logo from "../../Logo";
import NotificationBell from "../../NotificationBell";
import UserAvatar from "../../UserAvatar";

interface GlobalMobileMenuProps {
  user: any;
  profile: any;
  userBreweries: any[];
  activeBreweryId: string | null;
  activeBreweryName: string | null;
  scrollbarCompensation: number;
  initialTab?: 'personal' | 'team' | 'discover';
  onClose: () => void;
  onLogout: () => void;
  // Overrides if needed by wrappers
  customLinks?: React.ReactNode;
}

export function GlobalMobileMenu({
  user,
  profile,
  userBreweries,
  activeBreweryId,
  activeBreweryName,
  scrollbarCompensation,
  initialTab = 'personal',
  onClose,
  onLogout,
  customLinks
}: GlobalMobileMenuProps) {
  const [mobileTab, setMobileTab] = useState<'personal' | 'team' | 'discover'>(initialTab);
  
  // Whenever initialTab updates from parent, reset mobileTab (optional, but good for UX)
  useEffect(() => {
    setMobileTab(initialTab);
  }, [initialTab]);

  const isDrinker = profile?.app_mode === 'drinker';
  const homeUrl = isDrinker ? '/my-cellar' : '/dashboard';

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    const availableTabs: Array<'personal' | 'team' | 'discover'> = ['personal'];
    if (!isDrinker) availableTabs.push('team');
    availableTabs.push('discover');

    const currentIndex = availableTabs.indexOf(mobileTab);

    if (isLeftSwipe && currentIndex < availableTabs.length - 1) {
      setMobileTab(availableTabs[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      setMobileTab(availableTabs[currentIndex - 1]);
    }
  };

  return (
    <div 
      className="lg:hidden fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex flex-col h-full w-full" style={{ paddingRight: `${scrollbarCompensation}px` }}>
        
        {/* 1. Header with Close */}
        <div className="border-b border-border-subtle bg-background p-3">
          <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-6">
            <div className="flex items-center gap-6" onClick={onClose}>
              <Logo /> 
            </div>
            <div className="flex items-center gap-4">
              {user && <NotificationBell />}
              <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Segmented Control Area */}
        {user && (
          <div className="p-4 border-b border-border-subtle bg-background">
            <div className="flex bg-surface p-1 rounded-xl overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setMobileTab('personal')}
                className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'personal' ? 'bg-brand/10 text-brand shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
              >
                <FlaskConical className={`w-4 h-4 ${mobileTab === 'personal' ? 'grayscale-0' : 'grayscale'}`} />
                {isDrinker ? 'Mein Keller' : 'Dashboard'}
              </button>
              {!isDrinker && (
                <button 
                  onClick={() => setMobileTab('team')}
                  className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'team' ? 'bg-accent-orange/10 text-accent-orange shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  <Factory className="w-4 h-4" />
                  Brauerei
                </button>
              )}
              <button 
                onClick={() => setMobileTab('discover')}
                className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'discover' ? 'bg-accent-purple/10 text-accent-purple shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
              >
                <Globe className="w-4 h-4" />
                Entdecken
              </button>
            </div>
          </div>
        )}

        {/* 2. Scrollable Content Area */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          
          {/* NOT LOGGED IN VIEW */}
          {!user && (
            <div className="space-y-6 flex flex-col items-center justify-center h-full">
              <Link href="/login?intent=brew" onClick={onClose} className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-cyan-400 transition">
                Anmelden
              </Link>
              <div className="grid grid-cols-1 gap-4 w-full">
                <Link href="/discover" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition border-b border-border-subtle">
                  <Globe className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Entdecken</span> <span className="ml-auto text-text-disabled">→</span>
                </Link>
                <Link href="/tools" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition border-b border-border-subtle">
                  <Calculator className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Tools</span> <span className="ml-auto text-text-disabled">→</span>
                </Link>
                <Link href="/pricing" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition border-b border-border-subtle">
                  <Gem className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Preise</span> <span className="ml-auto text-text-disabled">→</span>
                </Link>
                <Link href="/forum" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition border-b border-border-subtle">
                  <MessageSquare className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Forum</span> <span className="ml-auto text-text-disabled">→</span>
                </Link>
              </div>
            </div>
          )}

          {/* LOGGED IN VIEWS */}
          {user && mobileTab === 'personal' && (
             <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">

                 {/* Custom Links or List for Tools */}
                 {customLinks && initialTab === 'personal' ? (
                    <div className="mb-4" onClick={onClose}>
                      {customLinks}
                    </div>
                 ) : (
                   <div>
                    <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">{isDrinker ? 'Mein Keller' : 'Dashboard'}</p>
                    <div className="divide-y divide-border/50">
                       <Link href={homeUrl} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                          {isDrinker ? <Home className="w-5 h-5 text-text-secondary" /> : <LayoutDashboard className="w-5 h-5 text-text-secondary" />} <span className="font-bold text-sm text-text-primary">{isDrinker ? 'Übersicht' : 'Dashboard'}</span> <span className="ml-auto text-text-disabled">→</span>
                       </Link>
                       <Link href={isDrinker ? '/my-cellar/collection' : '/dashboard/collection'} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                          <FlaskConical className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Sammlung</span> <span className="ml-auto text-text-disabled">→</span>
                       </Link>
                       <Link href={isDrinker ? '/my-cellar/favorites' : '/dashboard/favorites'} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                          <Heart className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Favoriten</span> <span className="ml-auto text-text-disabled">→</span>
                       </Link>
                       {isDrinker ? (
                         <>
                           <Link href="/my-cellar/stash" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                              <Archive className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Stash</span> <span className="ml-auto text-text-disabled">→</span>
                           </Link>
                           <Link href="/my-cellar/taste-dna" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                              <Beaker className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Taste DNA</span> <span className="ml-auto text-text-disabled">→</span>
                           </Link>
                           <Link href="/my-cellar/leaderboard" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                              <Trophy className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Rangliste</span> <span className="ml-auto text-text-disabled">→</span>
                           </Link>
                         </>
                       ) : (
                         <Link href="/dashboard/achievements" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                            <Trophy className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Achievements</span> <span className="ml-auto text-text-disabled">→</span>
                         </Link>
                       )}
                    </div>
                 </div>
                 )}
             </div>
          )}

          {user && mobileTab === 'team' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                   {activeBreweryId ? (
                       <>

                         {/* Team Quick Actions or Custom Links */}
                         {customLinks && initialTab === 'team' ? (
                            <div className="mb-4" onClick={onClose}>
                               {customLinks}
                            </div>
                         ) : (
                            <div>
                               <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Team Ansicht</p>
                               <div className="divide-y divide-border/50">
                                  <Link href={`/team/${activeBreweryId}`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                     <LayoutDashboard className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Team-Dashboard</span> <span className="ml-auto text-text-disabled">→</span>
                                  </Link>
                                  <Link href={`/team/${activeBreweryId}/feed`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <MessageSquare className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Feed</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                               <Link href={`/team/${activeBreweryId}/brews`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <Beer className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Rezepte</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                               <Link href={`/team/${activeBreweryId}/sessions`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <Thermometer className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Sessions</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                               <Link href={`/team/${activeBreweryId}/inventory`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <Package className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Inventar</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                               <Link href={`/team/${activeBreweryId}/labels`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition" title="Etiketten">
                                  <Tag className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Etiketten</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                               <Link href={`/team/${activeBreweryId}/analytics`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <TrendingUp className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Analytics</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                               <Link href={`/team/${activeBreweryId}/members`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <Users className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Mitglieder</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                               <Link href={`/team/${activeBreweryId}/settings`} onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                                  <Settings className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Einstellungen</span> <span className="ml-auto text-text-disabled">→</span>
                               </Link>
                            </div>
                         </div>
                         )}

                         {/* Switchable Teams */}
                         {userBreweries.length > 1 && (
                             <div>
                                <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-3">Team wechseln</p>
                                <div className="space-y-2">
                                   {userBreweries.filter(b => b.id !== activeBreweryId).map(b => (
                                       <Link key={b.id} href={`/team/${b.id}`} onClick={onClose} className="w-full text-left bg-surface/30 border border-border/50 p-3 rounded-xl flex items-center justify-between hover:bg-surface transition">
                                          <span className="text-sm font-bold text-text-secondary">{b.name}</span>
                                          <span className="text-[10px] bg-surface-hover text-text-muted px-2 py-1 rounded">Zu diesem Team</span>
                                       </Link>
                                   ))}
                                </div>
                             </div>
                         )}
                       </>
                   ) : (
                       <div className="text-center py-12 px-6 bg-surface/30 rounded-2xl border border-border border-dashed flex flex-col items-center">
                          <Factory className="w-10 h-10 opacity-50 mb-4" />
                          <h3 className="font-bold text-text-primary mb-2">Kein Team</h3>
                          <p className="text-sm text-text-muted mb-6">Du bist aktuell keinem Brauerei-Team zugeordnet.</p>
                          <Link href="/dashboard/team/create" onClick={onClose} className="inline-block bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-orange-400 hover:text-white transition">
                             Team Gründen
                          </Link>
                       </div>
                   )}
              </div>
          )}

          {user && mobileTab === 'discover' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">

                   <div>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest px-1 mb-1">Community</p>
                      <div className="divide-y divide-border/50">
                          <Link href="/discover" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                              <Globe className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Rezepte</span> <span className="ml-auto text-text-disabled">→</span>
                          </Link>
                          <Link href="/forum" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                              <MessageSquare className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Forum</span> <span className="ml-auto text-text-disabled">→</span>
                          </Link>
                          <Link href="/tools" onClick={onClose} className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface/30 transition">
                              <Calculator className="w-5 h-5 text-text-secondary" /> <span className="font-bold text-sm text-text-primary">Tools</span> <span className="ml-auto text-text-disabled">→</span>
                          </Link>
                      </div>
                   </div>
              </div>
          )}

        </div>

        {/* 3. Footer (Fixed) */}
        {user && (
          <div className="p-4 border-t border-border bg-background pb-8">
            {profile && (
              <div className="flex items-center justify-between bg-surface/50 p-3 rounded-2xl mb-3">
                 <div className="flex items-center gap-3">
                     <UserAvatar src={profile?.logo_url} name={profile?.display_name} userId={profile?.id} tier={profile?.subscription_tier} sizeClass="w-10 h-10" />
                     <div>
                         <p className="text-sm font-bold text-text-primary leading-tight">{profile.display_name}</p>
                     </div>
                 </div>
                 <Link href="/account" onClick={onClose} className="p-2 bg-surface-hover hover:bg-surface-hover/70 rounded-lg text-text-secondary hover:text-text-primary transition">
                    <Settings className="w-5 h-5" />
                 </Link>
              </div>
            )}
            
            <button
             onClick={() => { onLogout(); onClose(); }}
             className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition"
            >
             <LogOut className="w-4 h-4" /> Abmelden
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
