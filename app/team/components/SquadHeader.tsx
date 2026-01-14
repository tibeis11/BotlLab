'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import Logo from '@/app/components/Logo';
import NotificationBell from '@/app/components/NotificationBell';
import { getTierConfig } from '@/lib/tier-system';

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data State
    const [userProfile, setUserProfile] = useState<any>(null);

    // Fetch Profile for Avatar
    useEffect(() => {
        if (!user) return;
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
            if (data) setUserProfile(data);
        });
    }, [user]);

    const tierConfig = userProfile ? getTierConfig(userProfile.tier || 'lehrling') : getTierConfig('lehrling');

    const tabs = [
        { name: 'Dashboard', path: `/team/${breweryId}/dashboard`, icon: '📊' },
        { name: 'Feed', path: `/team/${breweryId}/feed`, icon: '💬' },
        { name: 'Rezepte', path: `/team/${breweryId}/brews`, icon: '🍺' },
        { name: 'Inventar', path: `/team/${breweryId}/inventory`, icon: '📦' },
    ];

    const adminTabs: { name: string, path: string, icon: string }[] = [];
    if(isMember) {
        adminTabs.push({ name: 'Mitglieder', path: `/team/${breweryId}/members`, icon: '👥' });
        adminTabs.push({ name: 'Einstellungen', path: `/team/${breweryId}/settings`, icon: '⚙️' });
    }

    return (
        <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                
                {/* Left: Logo & Exit */}
                <div className="flex items-center gap-6">
                    <Link href={`/team/${breweryId}`}>
                        <Logo />
                    </Link>
                    
                    <div className="hidden lg:flex gap-6 text-sm font-medium items-center border-l border-zinc-800 pl-6 h-8">
                         <Link href="/dashboard" className="hover:text-cyan-400 transition flex items-center gap-2 text-zinc-400">
                             ↩ Mein Profil
                         </Link>
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
                                    <span>{tab.icon}</span>
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
                                                        <span>{tab.icon}</span>
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
                        <button className="flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition group">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg"
                                style={{ backgroundColor: `${tierConfig.color}20` }}
                            >
                                <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierConfig.color }}></div>
                                <img src={tierConfig.avatarPath} alt="Avatar" className="w-full h-full object-cover" />
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
                                        👤 Mein Profil
                                    </Link>

                                    <button
                                        onClick={() => signOut()}
                                        className="block w-full px-4 py-3 text-red-400 hover:bg-red-500/10 transition text-sm font-medium flex items-center gap-2 text-left border-t border-zinc-800"
                                    >
                                        🚪 Abmelden
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

            {/* Mobile Menu Content */}
            {isMobileMenuOpen && (
                 <div className="lg:hidden absolute w-full bg-zinc-950 border-b border-zinc-800 animate-in slide-in-from-top-2 fade-in duration-200 shadow-2xl z-40 max-h-[90vh] overflow-y-auto left-0 top-full">
                    <div className="p-4 space-y-2">
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Team Navigation</p>
                        {tabs.map(tab => {
                            const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                            return (
                                <Link 
                                    key={tab.path} 
                                    href={tab.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`p-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${isActive ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50' : 'text-zinc-400 border border-transparent hover:bg-zinc-900'}`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.name}</span>
                                </Link>
                            );
                        })}

                        {adminTabs.length > 0 && (
                            <>
                                <div className="h-px bg-zinc-800 my-2"></div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Verwaltung</p>
                                {adminTabs.map(tab => {
                                    const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');
                                    return (
                                        <Link 
                                            key={tab.path} 
                                            href={tab.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`p-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${isActive ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50' : 'text-zinc-400 border border-transparent hover:bg-zinc-900'}`}
                                        >
                                            <span>{tab.icon}</span>
                                            <span>{tab.name}</span>
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                        
                         <div className="h-px bg-zinc-800 my-2"></div>
                         
                         <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl mb-2">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative border border-zinc-700">
                                   <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tierConfig.color }}></div>
                                   <img src={tierConfig.avatarPath} alt="Avatar" className="w-full h-full object-cover" />
                             </div>
                             <div>
                                 <p className="text-sm font-bold text-white">{userProfile?.display_name || user?.email}</p>
                                 <p className="text-[10px] uppercase font-black" style={{ color: tierConfig.color }}>{tierConfig.displayName}</p>
                             </div>
                         </div>
                         
                         <Link 
                            href="/dashboard"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-3 rounded-xl text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 transition flex items-center gap-3"
                         >
                            ↩ Zurück zum Haupt-Dashboard
                         </Link>

                         <button
                            onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                            className="w-full text-left p-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition flex items-center gap-3"
                         >
                            🚪 Abmelden
                         </button>
                    </div>
                 </div>
            )}
        </header>
    );
}