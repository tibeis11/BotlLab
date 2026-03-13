'use client';
// ZWEI WELTEN Phase 2 / Phase 3: Universal-Navigation
// Public Context — Entdecken, Forum, Tools, Pricing, Default

import React from "react";
import Link from "next/link";
import { 
  Gem,
  Globe, 
  MessageSquare, 
  Calculator
} from 'lucide-react';
import { GlobalHeader } from "./ui/GlobalHeader/GlobalHeader";
import { useHeaderData } from "@/lib/hooks/useHeaderData";
import { usePathname } from "next/navigation";

interface HeaderProps {
    breweryId?: string;
    discoverSearchSlot?: React.ReactNode;
    discoverMobileActions?: React.ReactNode;
    forumSearchSlot?: React.ReactNode;
    forumMobileActions?: React.ReactNode;
}

export default function Header({ 
  breweryId, 
  discoverSearchSlot, 
  discoverMobileActions, 
  forumSearchSlot, 
  forumMobileActions 
}: HeaderProps) {
  
  const pathname = usePathname();
  const searchSlot = discoverSearchSlot || forumSearchSlot;
  const mobileActions = (
    <>
      {discoverMobileActions}
      {forumMobileActions}
    </>
  );

  const rightActions = (
    <>
      <Link 
        href="/pricing"
        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname === '/pricing' ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border/50' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
      >
        <Gem className="w-4 h-4" />
        <span className="hidden xl:inline">Preise</span>
      </Link>

      {!forumSearchSlot && (
        <Link 
          href="/forum"
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname?.startsWith('/forum') ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border/50' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden xl:inline">Forum</span>
        </Link>
      )}

      {!discoverSearchSlot && (
        <Link 
          href="/discover" 
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname?.startsWith('/discover') ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border/50' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
        >
          <Globe className="w-4 h-4" />
          <span className="hidden xl:inline">Entdecken</span>
        </Link>
      )}

      <Link 
        href="/tools" 
        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${pathname?.startsWith('/tools') ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border/50' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/50'}`}
      >
        <Calculator className="w-4 h-4" />
        <span className="hidden xl:inline">Tools</span>
      </Link>
    </>
  );

  return (
      <GlobalHeader 
         colorZone="public"
         breweryId={breweryId}
         centerContent={searchSlot}
         rightActions={rightActions}
         mobileActions={mobileActions}
      />
  );
}
