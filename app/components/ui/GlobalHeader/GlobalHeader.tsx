'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LayoutDashboard, Beaker, Settings, LogOut } from 'lucide-react';
import Logo from '../../Logo';
import NotificationBell from '../../NotificationBell';
import UserAvatar from '../../UserAvatar';
import { useHeaderData } from '@/lib/hooks/useHeaderData';
import { GlobalMobileMenu } from './GlobalMobileMenu';
import { useAuth } from '@/app/context/AuthContext';

export interface GlobalHeaderProps {
  colorZone: 'personal' | 'team' | 'public';
  
  // Context Overrides
  breweryId?: string;
  
  // Structure Slots
  leftContent?: React.ReactNode;  // Usually next to Logo (e.g., Breadcrumbs)
  centerContent?: React.ReactNode; // Search bar, etc.
  rightActions?: React.ReactNode;  // Desktop links before standard Auth/Avatar
  mobileActions?: React.ReactNode; // Mobile actions before hamburger menu
  customMobileLinks?: React.ReactNode; // Mobile menu custom wrapper items
  
  // Configuration
  showLogo?: boolean;
}

export function GlobalHeader({
  colorZone,
  breweryId,
  leftContent,
  centerContent,
  rightActions,
  mobileActions,
  customMobileLinks,
  showLogo = true
}: GlobalHeaderProps) {
  const { user, loading } = useAuth();
  const data = useHeaderData(breweryId);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const isDrinker = data.profile?.app_mode === 'drinker';
  const homeUrl = isDrinker ? '/my-cellar' : '/dashboard';

  // Mobile states 
  const isMobileMenuOpen = data.isMobileMenuOpen;
  const toggleMobileMenu = () => data.setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <>
      <nav className="border-b border-border-subtle bg-background/80 p-3 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-[1920px] w-full mx-auto px-6 flex justify-between items-center">
          
          {/* LEFT: Logo & Additional Breadcrumbs */}
          <div className="flex items-center gap-4 flex-shrink-0">
             {showLogo && (
               <Link href="/" className="flex-shrink-0">
                 <Logo />
               </Link>
             )}
             {leftContent}
          </div>

          {/* CENTER: Search or Page Context */}
          {centerContent && (
            <div className="hidden md:flex flex-1 justify-center px-4 min-w-0">
              {centerContent}
            </div>
          )}
          
          {/* RIGHT: Desktop Actions & User Menu */}
          <div className="hidden md:flex gap-2 items-center flex-shrink-0">
            {/* Wrapper Custom Links */}
            {rightActions}

            {/* Standard Auth Block */}
            <div className="h-4 w-px bg-border mx-2"></div>
            {loading ? (
               <div className="w-10 h-10 bg-surface-hover rounded-full animate-pulse"></div>
            ) : user ? (
               <>
                 <NotificationBell />
                 <div 
                   className="relative"
                   onMouseEnter={() => setShowAvatarMenu(true)}
                   onMouseLeave={() => setShowAvatarMenu(false)}
                 >
                   <Link 
                     href={homeUrl} 
                     className="group flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition"
                   >
                     <UserAvatar 
                         src={data.profile?.logo_url} 
                         name={data.profile?.display_name} 
                         userId={data.profile?.id} 
                         tier={data.profile?.subscription_tier} 
                         sizeClass="w-8 h-8" 
                         className="shadow-lg" 
                     />
                     <div className="flex flex-col items-start leading-none">
                         <span className="truncate max-w-[120px] font-bold text-text-primary text-sm">
                             {data.profile?.display_name || 'Profil'}
                         </span>
                     </div>
                   </Link>

                   {showAvatarMenu && (
                     <div className="absolute top-full right-0 pt-2 w-48 z-50">
                       <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                         <Link
                           href={homeUrl}
                           className="block px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition flex items-center gap-2"
                         >
                           <LayoutDashboard className="w-4 h-4" /> {isDrinker ? 'Mein Keller' : 'Dashboard'}
                         </Link>

                         <Link
                           href="/account"
                           className="block px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition flex items-center gap-2"
                         >
                           <Settings className="w-4 h-4" /> Einstellungen
                         </Link>
                         
                         <div className="border-t border-border"></div>
                         
                         <button
                           onClick={data.handleLogout}
                           className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-surface-hover hover:text-red-300 transition flex items-center gap-2"
                         >
                           <LogOut className="w-4 h-4" /> Abmelden
                         </button>
                       </div>
                     </div>
                   )}
                 </div>
               </>
            ) : (
               <>
                 <Link href="/login?intent=brew" className="text-sm font-bold text-text-secondary hover:text-text-primary px-4 py-2 transition">
                   Login
                 </Link>
                 <Link href="/login?intent=brew" className="text-sm font-bold bg-white text-black px-6 py-2 rounded-full hover:bg-cyan-400 hover:scale-105 transition transform">
                   Starten
                 </Link>
               </>
            )}
          </div>

          {/* MOBILE RIGHT: Notification, Custom Mobile Actions & Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            {mobileActions}
            {user && <NotificationBell />}
            <button 
              className="p-2 text-text-secondary hover:text-text-primary"
              onClick={toggleMobileMenu}
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
      </nav>

      {/* Render the full-screen mobile menu if toggled */}
      {isMobileMenuOpen && (
        <GlobalMobileMenu 
           user={user}
           profile={data.profile}
           userBreweries={data.userBreweries}
           activeBreweryId={data.activeBreweryId}
           activeBreweryName={data.activeBreweryName}
           scrollbarCompensation={data.scrollbarCompensation}
           initialTab={colorZone === 'public' ? 'discover' : colorZone}
           onClose={() => data.setIsMobileMenuOpen(false)}
           onLogout={data.handleLogout}
           customLinks={customMobileLinks}
        />
      )}
    </>
  );
}
