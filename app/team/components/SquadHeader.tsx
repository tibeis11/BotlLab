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
    LogOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import Logo from '@/app/components/Logo';
import NotificationBell from '@/app/components/NotificationBell';
import { getTierConfig } from '@/lib/tier-system';
import { getBreweryBranding } from '@/lib/actions/premium-actions';
import { getTierBorderColor } from '@/lib/premium-config';

interface SquadHeaderProps {
    breweryId: string;
    isMember: boolean;
}

export default function SquadHeader({ breweryId, isMember }: SquadHeaderProps) {
    const { user, signOut } = useAuth();
    const pathname = usePathname();
    
    // UI State
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showPersonalMenu, setShowPersonalMenu] = useState(false);
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

    const tierConfig = userProfile ? getTierConfig(userProfile.tier || 'lehrling') : getTierConfig('lehrling');
    const tierBorderClass = getTierBorderColor(userProfile?.subscription_tier);

    const tabs = [
        { name: 'Dashboard', path: `/team/${breweryId}/dashboard`, icon: LayoutDashboard },
        { name: 'Feed', path: `/team/${breweryId}/feed`, icon: MessageSquare },
        { name: 'Rezepte', path: `/team/${breweryId}/brews`, icon: Beer },
        { name: 'Sessions', path: `/team/${breweryId}/sessions`, icon: Thermometer },
        { name: 'Inventar', path: `/team/${breweryId}/inventory`, icon: Package },
        { name: 'Etiketten', path: `/team/${breweryId}/labels`, icon: Tag },
        { name: 'Analytics', path: `/team/${breweryId}/analytics`, icon: TrendingUp },
    ];

    const adminTabs: { name: string, path: string, icon: any }[] = [];
    if(isMember) {
        adminTabs.push({ name: 'Mitglieder', path: `/team/${breweryId}/members`, icon: Users });
        adminTabs.push({ name: 'Einstellungen', path: `/team/${breweryId}/settings`, icon: Settings });
    }

    const personalTabs = [
        { name: 'Sammlung', path: '/dashboard/collection', icon: Medal },
        { name: 'Favoriten', path: '/dashboard/favorites', icon: Heart },
        { name: 'Achievements', path: '/dashboard/achievements', icon: Trophy },
    ];

    return (
        <>
        <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-[3000]">
            <div className="max-w-[1920px] w-full mx-auto px-6 py-3 flex items-center justify-between">
                
                {/* Left: Logo & Exit */}
                <div className="flex items-center gap-6">
                    <Link href={`/team/${breweryId}`}>
                        <Logo 
                            overrideText={branding.breweryName || undefined}
                            imageSrc={branding.logoUrl || "/brand/logo.svg"}
                        />
                    </Link>
                    
                    <div className="hidden lg:flex gap-6 text-sm font-medium items-center border-l border-zinc-800 pl-6 h-8">
                        {/* Entdecken Dropdown */}
                        <div 
                            className="relative group"
                            onMouseEnter={() => setShowDiscoverMenu(true)}
                            onMouseLeave={() => setShowDiscoverMenu(false)}
                        >
                            <button 
                                title="Entdecken"
                                className={`rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname.startsWith('/discover') ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
                            >
                                <Globe className="w-4 h-4" />
                                <span className="hidden xl:inline">Entdecken</span>
                                <span className="text-[10px] ml-1 hidden xl:inline">▼</span>
                            </button>
                            
                            {showDiscoverMenu && (
                                <div className="absolute left-0 top-full pt-4 w-48 z-50">
                                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 px-1 py-1">
                                            <Link 
                                                href="/discover" 
                                                className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                                            >
                                                <Beer className="w-4 h-4" />
                                                <span>Rezepte</span>
                                            </Link>
                                            <Link 
                                                href="/forum" 
                                                className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                <span>Forum</span>
                                            </Link>
                                        </div>
                                </div>
                            )}
                        </div>

                        {/* Mein Profil Dropdown */}
                        <div 
                            className="relative group"
                            onMouseEnter={() => setShowPersonalMenu(true)}
                            onMouseLeave={() => setShowPersonalMenu(false)}
                        >
                            <button 
                                title="Mein Profil"
                                className={`rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname === '/dashboard' || pathname.startsWith('/dashboard/') ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
                            >
                                <Users className="w-4 h-4" />
                                <span className="hidden xl:inline">Mein Profil</span>
                                <span className="text-[10px] ml-1 hidden xl:inline">▼</span>
                            </button>
                            
                            {showPersonalMenu && (
                                <div className="absolute left-0 top-full pt-4 w-56 z-50">
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 p-1">
                                         <Link 
                                            href="/dashboard"
                                            className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg"
                                        >
                                            <LayoutDashboard className="w-4 h-4" /> <span>Dashboard</span>
                                        </Link>
                                        <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                                        <Link 
                                            href="/dashboard/collection" 
                                            className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                                        >
                                            <Medal className="w-4 h-4" /> <span>Sammlung</span>
                                        </Link>
                                        <Link 
                                            href="/dashboard/favorites" 
                                            className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                                        >
                                            <Heart className="w-4 h-4" /> <span>Favoriten</span>
                                        </Link>
                                         <Link 
                                            href="/dashboard/achievements" 
                                            className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                                        >
                                            <Trophy className="w-4 h-4" /> <span>Achievements</span>
                                        </Link>
                                        <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                                        <Link 
                                            href="/dashboard/account" 
                                            className="px-3 py-2 text-sm font-bold transition-all flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                                        >
                                            <Settings className="w-4 h-4" /> <span>Einstellungen</span>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Team Navigation & Profile */}
                <div className="flex items-center gap-2">
                    
                    {/* Desktop Tabs */}
                    <div className="hidden lg:flex items-center gap-1">
                        {tabs.map(tab => {
                            const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                            return (
                                <Link 
                                    key={tab.path} 
                                    href={tab.path}
                                    title={tab.name}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-cyan-950/50 text-cyan-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span className="hidden xl:inline">{tab.name}</span>
                                </Link>
                            );
                        })}

                        {/* Admin Dropdown */}
                        {adminTabs.length > 0 && (
                            <div 
                                className="relative ml-2"
                                onMouseEnter={() => setShowAdminMenu(true)}
                                onMouseLeave={() => setShowAdminMenu(false)}
                            >
                                <button
                                    title="Mehr" 
                                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${showAdminMenu ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
                                >
                                    <span>☰</span>
                                </button>
                                
                                {showAdminMenu && (
                                    <div className="absolute right-0 top-full pt-2 w-48 z-40">
                                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                            {adminTabs.map(tab => {
                                                const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                                                return (
                                                    <Link 
                                                        key={tab.path} 
                                                        href={tab.path}
                                                        className={`px-4 py-3 text-sm font-bold transition-all flex items-center gap-3 ${isActive ? 'bg-cyan-950/30 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
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

                    <div className="h-4 w-px bg-zinc-800 mx-2 hidden lg:block"></div>

                    <div className="hidden lg:block">
                        <NotificationBell />
                    </div>

                    {/* Profile Menu */}
                    <div 
                        className="relative hidden lg:block"
                        onMouseEnter={() => setShowProfileMenu(true)}
                        onMouseLeave={() => setShowProfileMenu(false)}
                    >
                        <button className="flex items-center gap-0 xl:gap-3 pl-1 pr-1 xl:pr-4 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition group">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg bg-zinc-900"
                            >
                                <div className={`absolute inset-0 border-2 rounded-full opacity-50 ${tierBorderClass}`}></div>
                                <img src={userProfile?.logo_url || tierConfig.avatarPath} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="hidden xl:flex flex-col items-start leading-none">
                                <span className="truncate max-w-[120px] font-bold text-white text-sm">
                                    {userProfile?.display_name || 'Profil'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5" style={{ color: tierConfig.color }}>
                                    {tierConfig.displayName}
                                </span>
                            </div>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 top-full pt-2 w-56 z-50">
                                <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Angemeldet als</p>
                                        <p className="font-bold text-white truncate">{userProfile?.display_name || user?.email}</p>
                                    </div>

                                    <Link
                                        href="/dashboard"
                                        className="block w-full px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-900 transition text-sm font-medium flex items-center gap-2 text-left"
                                    >
                                        <Users className="w-4 h-4" /> Mein Profil
                                    </Link>

                                    <button
                                        onClick={() => signOut()}
                                        className="block w-full px-4 py-3 text-red-400 hover:bg-red-500/10 transition text-sm font-medium flex items-center gap-2 text-left border-t border-zinc-800"
                                    >
                                        <LogOut className="w-4 h-4" /> Abmelden
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-2 lg:hidden">
                    <NotificationBell />
                    <button 
                    className="p-2 text-zinc-400 hover:text-white"
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
                    className="lg:hidden fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-200 supports-[backdrop-filter]:bg-zinc-950/80"
                    style={{ paddingRight: `${scrollbarCompensation}px` }}
                 >
                    
                    {/* 1. Header with Close (Aligned with Main Header) */}
                    <div className="border-b border-zinc-900 bg-zinc-950 p-3">
                        <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-6">
                            <div className="flex items-center gap-6" onClick={() => setIsMobileMenuOpen(false)}>
                                <Logo /> 
                            </div>
                            <div className="flex items-center gap-2">
                                <NotificationBell />
                                <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 text-zinc-400 hover:text-white"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Segmented Control */}
                    <div className="p-4 border-b border-zinc-900 bg-zinc-950">
                       <div className="flex bg-zinc-900 p-1 rounded-xl overflow-x-auto no-scrollbar">
                            <button 
                              onClick={() => setMobileTab('personal')}
                              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'personal' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              <FlaskConical className={`w-4 h-4 ${mobileTab === 'personal' ? 'grayscale-0' : 'grayscale'}`} />
                              Labor
                            </button>
                            <button 
                              onClick={() => setMobileTab('team')}
                              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'team' ? 'bg-cyan-950 text-cyan-400 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              <Factory className="w-4 h-4" />
                              Brauerei
                            </button>
                            <button 
                              onClick={() => setMobileTab('discover')}
                              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mobileTab === 'discover' ? 'bg-purple-900/50 text-purple-300 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
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
                                   className="block bg-gradient-to-br from-cyan-950/40 to-cyan-900/10 border border-cyan-900/50 p-5 rounded-2xl relative overflow-hidden group"
                                >
                                   <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                      <Factory className="w-16 h-16" />
                                   </div>
                                   <p className="text-xs text-cyan-500 uppercase font-black tracking-widest mb-1">Team Area</p>
                                   <h3 className="text-2xl font-black text-white mb-2">Übersicht</h3>
                                   <div className="flex items-center gap-2 text-sm text-zinc-300">
                                      <span>Team-Feed & Status</span>
                                      <span>→</span>
                                   </div>
                                </Link>

                                {/* Team Actions List */}
                                <div>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                                    <div className="divide-y divide-zinc-900/50">
                                        {/* Filter out Dashboard from tabs since we have the big tile */}
                                        {tabs.filter(t => !t.path.endsWith('/dashboard')).map(tab => (
                                            <Link
                                                key={tab.path}
                                                href={tab.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                            >
                                                <tab.icon className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                                                <span className="font-bold text-sm text-zinc-200">{tab.name}</span>
                                                <span className="ml-auto text-zinc-600">→</span>
                                            </Link>
                                        ))}
                                        
                                        {/* Admin Tabs */}
                                        {adminTabs.map(tab => (
                                            <Link
                                                key={tab.path}
                                                href={tab.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                            >
                                                <tab.icon className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                                                <span className="font-bold text-sm text-zinc-200">{tab.name}</span>
                                                <span className="ml-auto text-zinc-600">→</span>
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
                                  className="block bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 p-5 rounded-2xl relative overflow-hidden group"
                               >
                                  <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                     <LayoutDashboard className="w-16 h-16" />
                                  </div>
                                  <p className="text-xs text-zinc-400 uppercase font-black tracking-widest mb-1">Privat</p>
                                  <h3 className="text-2xl font-black text-white mb-2">Mein Dashboard</h3>
                                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                                     <span>Zurück zum Labor</span>
                                     <span>→</span>
                                  </div>
                               </Link>

                               {/* Personal Tools List */}
                               <div>
                                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-1">Aktionen</p>
                                  <div className="divide-y divide-zinc-900/50">
                                     {personalTabs.map(tab => (
                                        <Link
                                           key={tab.path}
                                           href={tab.path}
                                           onClick={() => setIsMobileMenuOpen(false)}
                                           className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                        >
                                           <tab.icon className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                                           <span className="font-bold text-sm text-zinc-200">{tab.name}</span>
                                           <span className="ml-auto text-zinc-600">→</span>
                                        </Link>
                                     ))}
                                  </div>
                               </div>
                            </div>
                        )}
                        
                        {mobileTab === 'discover' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                                {/* Discover Hero */}
                                <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/10 border border-purple-900/50 p-5 rounded-2xl">
                                      <div className="flex justify-between items-start mb-4">
                                         <div>
                                            <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">BotlLab Community</p>
                                            <h3 className="text-xl font-bold text-white leading-tight">Entdecken</h3>
                                         </div>
                                         <span className="bg-purple-500/10 text-purple-400 p-2 rounded-lg"><Globe className="w-5 h-5" /></span>
                                      </div>
                                      <p className="text-sm text-zinc-400 mb-4">Finde Inspiration, tausche dich aus und entdecke neue Rezepte.</p>
                                </div>

                                 <div>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-1 mb-1">Community</p>
                                    <div className="divide-y divide-zinc-900/50">
                                        <Link
                                            href="/discover"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                        >
                                            <Globe className="w-5 h-5 text-zinc-400" />
                                            <span className="font-bold text-sm text-zinc-200">Rezepte</span>
                                            <span className="ml-auto text-zinc-600">→</span>
                                        </Link>
                                        <Link
                                            href="/forum"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="w-full flex items-center gap-4 py-4 px-2 hover:bg-zinc-900/30 transition"
                                        >
                                            <MessageSquare className="w-5 h-5 text-zinc-400" />
                                            <span className="font-bold text-sm text-zinc-200">Forum</span>
                                            <span className="ml-auto text-zinc-600">→</span>
                                        </Link>
                                    </div>
                                 </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Footer (Fixed) */}
                    <div className="p-4 border-t border-zinc-900 bg-zinc-950 pb-8">
                         <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-2xl mb-3">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs overflow-hidden relative border border-zinc-700 bg-zinc-800">
                                     <div className={`absolute inset-0 border-2 rounded-full opacity-50 ${tierBorderClass}`}></div>
                                     <img src={tierConfig.avatarPath} alt="Avatar" className="w-full h-full object-cover" />
                                 </div>
                                 <div>
                                     <p className="text-sm font-bold text-white leading-tight">{userProfile?.display_name || user?.email}</p>
                                     <p className="text-[10px] uppercase font-black tracking-wide" style={{ color: tierConfig.color }}>{tierConfig.displayName}</p>
                                 </div>
                             </div>
                             <Link
                                href="/dashboard/account"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition"
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