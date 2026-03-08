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
    TrendingUp, 
    Users, 
    Settings, 
    Medal, 
    Heart, 
    Trophy,
    FlaskConical,
    Factory,
    Globe,
    LogOut,
    Gift,
    LayoutGrid
} from 'lucide-react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useAuth } from '@/app/context/AuthContext';
import Logo from '@/app/components/Logo';
import NotificationBell from '@/app/components/NotificationBell';
import { getBreweryBranding } from '@/lib/actions/premium-actions';
import { getTierBorderColor } from '@/lib/premium-config';
import UserAvatar from '@/app/components/UserAvatar';

interface SquadHeaderProps {
    breweryId: string;
    isMember: boolean;
}

export default function SquadHeader({ breweryId, isMember }: SquadHeaderProps) {
    const supabase = useSupabase();
    const { user, signOut } = useAuth();
    const pathname = usePathname();
    
    // UI State
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrollbarCompensation, setScrollbarCompensation] = useState(0);
    const [mobileTab, setMobileTab] = useState<'personal' | 'team' | 'discover'>('team');

    // Data State
    const [userProfile, setUserProfile] = useState<any>(null);
    const [branding, setBranding] = useState<{ logoUrl: string | null; breweryName: string | null; isPremiumBranding: boolean }>({
        logoUrl: null,
        breweryName: null,
        isPremiumBranding: false
    });

    // Lock Body Scroll when Mobile Menu is Open
    useEffect(() => {
        if (isMobileMenuOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            setScrollbarCompensation(scrollbarWidth);
            document.body.style.paddingRight = `${scrollbarWidth}px`;
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
            setScrollbarCompensation(0);
        }
        return () => {
             document.body.style.overflow = 'unset';
             document.body.style.paddingRight = '0px';
        };
    }, [isMobileMenuOpen]);

    // Fetch Profile for Avatar
    useEffect(() => {
        if (!user) return;
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
            if (data) setUserProfile(data);
        });
    }, [user]);

    // Fetch Branding
    useEffect(() => {
        if (breweryId) {
            getBreweryBranding(breweryId).then(res => {
                setBranding(res);
            });
        }
    }, [breweryId]);

    const tierBorderClass = getTierBorderColor(userProfile?.subscription_tier);

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

    const personalTabs = [
        { name: 'Sammlung', path: '/dashboard/collection', icon: Medal },
        { name: 'Favoriten', path: '/dashboard/favorites', icon: Heart },
        { name: 'Achievements', path: '/dashboard/achievements', icon: Trophy },
    ];

    return (
        <>
        <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-[3000]">
            <div className="max-w-[1920px] w-full mx-auto px-6 py-3 flex items-center justify-between">
                
                {/* Left: Logo & Exit */}
                <div className="flex items-center gap-6">
                    <Link href={`/team/${breweryId}`}>
                        <Logo 
                            overrideText={branding.breweryName || undefined}
                            imageSrc={branding.logoUrl || "/brand/logo.svg"}
                        />
                    </Link>
                </div>

                {/* Right: Team Navigation & Profile */}
                <div className="flex items-center gap-2">
                    
                    {/* Desktop Tabs (4+1 Concept) */}
                    <div className="hidden lg:flex items-center gap-1">
                        {primaryTabs.map(tab => {
                            const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                            return (
                                <Link 
                                    key={tab.path} 
                                    href={tab.path}
                                    title={tab.name}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-brand-bg text-brand' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
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
                                                    className={`px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 rounded-lg ${isActive ? 'bg-brand-bg text-brand' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
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
                                                            className={`px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 rounded-lg ${isActive ? 'bg-brand-bg text-brand' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
                                                        >
                                                            <tab.icon className="w-4 h-4" />
                                                            <span>{tab.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-4 w-px bg-border mx-2 hidden lg:block"></div>

                    <div className="hidden lg:flex items-center gap-2">
                         {/* Discover Icon Button */}
                         <div 
                            className="relative group h-9 w-9 flex items-center justify-center"
                            onMouseEnter={() => setShowDiscoverMenu(true)}
                            onMouseLeave={() => setShowDiscoverMenu(false)}
                        >
                            <Link href="/discover" className="text-text-muted hover:text-text-primary transition-colors">
                                <Globe className="w-5 h-5" />
                            </Link>

                             {showDiscoverMenu && (
                                <div className="absolute right-0 top-full pt-4 w-48 z-50">
                                        <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 px-1 py-1">
                                            <Link 
                                                href="/discover" 
                                                className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg"
                                            >
                                                <Beer className="w-4 h-4" />
                                                <span>Rezepte</span>
                                            </Link>
                                            <Link 
                                                href="/forum" 
                                                className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                <span>Forum</span>
                                            </Link>
                                        </div>
                                </div>
                            )}
                        </div>

                        <NotificationBell />
                    </div>

                    {/* Profile Menu */}
                    <div 
                        className="relative hidden lg:block"
                        onMouseEnter={() => setShowProfileMenu(true)}
                        onMouseLeave={() => setShowProfileMenu(false)}
                    >
                        <button className="flex items-center gap-0 xl:gap-3 pl-1 pr-1 xl:pr-4 py-1 rounded-full bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition group">
                            <UserAvatar src={userProfile?.logo_url} name={userProfile?.display_name} userId={userProfile?.id} tier={userProfile?.subscription_tier} sizeClass="w-8 h-8" />
                            <div className="hidden xl:flex flex-col items-start leading-none">
                                <span className="truncate max-w-[120px] font-bold text-text-primary text-sm">
                                    {userProfile?.display_name || 'Profil'}
                                </span>
                            </div>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 top-full pt-2 w-56 z-50">
                                <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-border bg-surface-hover/50">
                                        <p className="text-xs text-text-disabled uppercase tracking-widest font-bold mb-1">Angemeldet als</p>
                                        <p className="font-bold text-text-primary truncate">{userProfile?.display_name || user?.email}</p>
                                    </div>
                                    
                                    <div className="p-1">
                                        <Link
                                            href="/dashboard"
                                            className="block w-full px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition text-sm font-medium flex items-center gap-3 text-left"
                                        >
                                            <LayoutDashboard className="w-4 h-4" /> Mein Dashboard
                                        </Link>
                                        {personalTabs.map(tab => (
                                            <Link 
                                                key={tab.path}
                                                href={tab.path} 
                                                className="block w-full px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition text-sm font-medium flex items-center gap-3 text-left"
                                            >
                                                <tab.icon className="w-4 h-4" /> {tab.name}
                                            </Link>
                                        ))}
                                    </div>

                                    <div className="p-1 border-t border-border">
                                        <Link
                                            href="/account"
                                            className="block w-full px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition text-sm font-medium flex items-center gap-3 text-left"
                                        >
                                            <Settings className="w-4 h-4" /> Einstellungen
                                        </Link>
                                        <button
                                            onClick={() => signOut()}
                                            className="block w-full px-3 py-2 text-error hover:bg-error/10 rounded-lg transition text-sm font-medium flex items-center gap-3 text-left"
                                        >
                                            <LogOut className="w-4 h-4" /> Abmelden
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-2 lg:hidden">
                    <NotificationBell />
                    <button 
                    className="p-2 text-text-muted hover:text-text-primary"
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
            </div>
        </header>

            {/* Mobile Menu Content - Redesigned Smart Drawer */}
            {isMobileMenuOpen && (
                 <div 
                    className="lg:hidden fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-background/80"
                    style={{ paddingRight: `${scrollbarCompensation}px` }}
                 >
                    
                    {/* 1. Header with Close (Aligned with Main Header) */}
                    <div className="border-b border-border bg-background p-3">
                        <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-6">
                            <div className="flex items-center gap-6" onClick={() => setIsMobileMenuOpen(false)}>
                                <Logo /> 
                            </div>
                            <div className="flex items-center gap-2">
                                <NotificationBell />
                                <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 text-text-muted hover:text-text-primary"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Segmented Control */}
                    <div className="p-4 border-b border-border bg-background">
                       <div className="flex bg-surface p-1 rounded-xl overflow-x-auto no-scrollbar">
                            <button 
                              onClick={() => setMobileTab('personal')}
                              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'personal' ? 'bg-surface-hover text-text-primary shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                              <FlaskConical className={`w-4 h-4 ${mobileTab === 'personal' ? 'grayscale-0' : 'grayscale'}`} />
                              Labor
                            </button>
                            <button 
                              onClick={() => setMobileTab('team')}
                              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'team' ? 'bg-brand-bg text-brand shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                              <Factory className="w-4 h-4" />
                              Brauerei
                            </button>
                            <button 
                              onClick={() => setMobileTab('discover')}
                              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'discover' ? 'bg-accent-purple/10 text-accent-purple shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                              <Globe className="w-4 h-4" />
                              Entdecken
                            </button>
                       </div>
                    </div>

                    {/* 2. Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {mobileTab === 'team' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                                
                                {/* Team Dashboard Main Tile */}
                                <Link 
                                   href={`/team/${breweryId}/dashboard`}
                                   onClick={() => setIsMobileMenuOpen(false)}
                                   className="block bg-gradient-to-br from-brand-bg/40 to-brand-dim/10 border border-brand-dim/50 p-5 rounded-2xl relative overflow-hidden group"
                                >
                                   <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                      <Factory className="w-16 h-16" />
                                   </div>
                                   <p className="text-xs text-brand uppercase font-black tracking-widest mb-1">Team Area</p>
                                   <h3 className="text-2xl font-black text-text-primary mb-2">Übersicht</h3>
                                   <div className="flex items-center gap-2 text-sm text-text-secondary">
                                      <span>Team-Feed & Status</span>
                                      <span>→</span>
                                   </div>
                                </Link>

                                {/* Team Actions List */}
                                <div>
                                    <p className="text-xs text-text-disabled font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                                    <div className="divide-y divide-border-subtle">
                                        {/* Filter out Dashboard from tabs since we have the big tile */}
                                        {tabs.filter(t => !t.path.endsWith('/dashboard')).map(tab => (
                                            <Link
                                                key={tab.path}
                                                href={tab.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover/30 transition"
                                            >
                                                <tab.icon className="w-5 h-5 text-text-muted transition-colors" />
                                                <span className="font-bold text-sm text-text-secondary">{tab.name}</span>
                                                <span className="ml-auto text-text-disabled">→</span>
                                            </Link>
                                        ))}
                                        
                                        {/* Admin Tabs */}
                                        {adminTabs.map(tab => (
                                            <Link
                                                key={tab.path}
                                                href={tab.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover/30 transition"
                                            >
                                                <tab.icon className="w-5 h-5 text-text-muted transition-colors" />
                                                <span className="font-bold text-sm text-text-secondary">{tab.name}</span>
                                                <span className="ml-auto text-text-disabled">→</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {mobileTab === 'personal' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                                {/* Personal Dashboard Link */}
                                <Link 
                                  href="/dashboard"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block bg-gradient-to-br from-surface-hover to-surface border border-border p-5 rounded-2xl relative overflow-hidden group"
                               >
                                  <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                     <LayoutDashboard className="w-16 h-16" />
                                  </div>
                                  <p className="text-xs text-text-muted uppercase font-black tracking-widest mb-1">Privat</p>
                                  <h3 className="text-2xl font-black text-text-primary mb-2">Mein Dashboard</h3>
                                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                                     <span>Zurück zum Labor</span>
                                     <span>→</span>
                                  </div>
                               </Link>

                               {/* Personal Tools List */}
                               <div>
                                  <p className="text-xs text-text-disabled font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                                  <div className="divide-y divide-border-subtle">
                                     {personalTabs.map(tab => (
                                        <Link
                                           key={tab.path}
                                           href={tab.path}
                                           onClick={() => setIsMobileMenuOpen(false)}
                                           className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover/30 transition"
                                        >
                                           <tab.icon className="w-5 h-5 text-text-muted transition-colors" />
                                           <span className="font-bold text-sm text-text-secondary">{tab.name}</span>
                                           <span className="ml-auto text-text-disabled">→</span>
                                        </Link>
                                     ))}
                                  </div>
                               </div>
                            </div>
                        )}
                        
                        {mobileTab === 'discover' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                                {/* Discover Hero */}
                                <div className="bg-gradient-to-br from-accent-purple/10 to-accent-purple/5 border border-accent-purple/20 p-5 rounded-2xl">
                                      <div className="flex justify-between items-start mb-4">
                                         <div>
                                            <p className="text-[10px] text-accent-purple font-black uppercase tracking-widest mb-1">BotlLab Community</p>
                                            <h3 className="text-xl font-bold text-text-primary leading-tight">Entdecken</h3>
                                         </div>
                                         <span className="bg-accent-purple/10 text-accent-purple p-2 rounded-lg"><Globe className="w-5 h-5" /></span>
                                      </div>
                                      <p className="text-sm text-text-muted mb-4">Finde Inspiration, tausche dich aus und entdecke neue Rezepte.</p>
                                </div>

                                 <div>
                                    <p className="text-xs text-text-disabled font-bold uppercase tracking-widest px-1 mb-1">Community</p>
                                    <div className="divide-y divide-border-subtle">
                                        <Link
                                            href="/discover"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover/30 transition"
                                        >
                                            <Globe className="w-5 h-5 text-text-muted" />
                                            <span className="font-bold text-sm text-text-secondary">Rezepte</span>
                                            <span className="ml-auto text-text-disabled">→</span>
                                        </Link>
                                        <Link
                                            href="/forum"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="w-full flex items-center gap-4 py-4 px-2 hover:bg-surface-hover/30 transition"
                                        >
                                            <MessageSquare className="w-5 h-5 text-text-muted" />
                                            <span className="font-bold text-sm text-text-secondary">Forum</span>
                                            <span className="ml-auto text-text-disabled">→</span>
                                        </Link>
                                    </div>
                                 </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Footer (Fixed) */}
                    <div className="p-4 border-t border-border bg-background pb-8">
                         <div className="flex items-center justify-between bg-surface/50 p-3 rounded-2xl mb-3">
                             <div className="flex items-center gap-3">
                                 <UserAvatar src={userProfile?.logo_url} name={userProfile?.display_name} userId={userProfile?.id} tier={userProfile?.subscription_tier} sizeClass="w-10 h-10" />
                                 <div>
                                     <p className="text-sm font-bold text-text-primary leading-tight">{userProfile?.display_name || user?.email}</p>
                                 </div>
                             </div>
                             <Link
                                href="/account"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 bg-surface-hover hover:bg-surface-raised rounded-lg text-text-muted hover:text-text-primary transition"
                             >
                                <Settings className="w-4 h-4" />
                             </Link>
                         </div>
                         
                         <button
                            onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition"
                         >
                            <LogOut className="w-4 h-4" /> Abmelden
                         </button>
                    </div>
                 </div>
            )}
        </>
    );
}