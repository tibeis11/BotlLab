'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import GuideContent from './content.json';
import type { BotlGuideCapability, BotlGuideSessionContext } from './types';

// Type for the content keys
export type BotlGuideKey = keyof typeof GuideContent;

interface BotlGuideContextType {
  isOpen: boolean;
  currentKey: BotlGuideKey | null;
  /** Active AI capability selected for this guide session (Stage 1+) */
  activeCapability: BotlGuideCapability | null;
  openGuide: (key: BotlGuideKey, capability?: BotlGuideCapability) => void;
  closeGuide: () => void;
  content: typeof GuideContent;
  sessionContext?: BotlGuideSessionContext;
  userTier?: 'free' | 'brewer' | 'brewery' | 'enterprise';
}

const BotlGuideContext = createContext<BotlGuideContextType | undefined>(undefined);

export function BotlGuideProvider({
  children,
  sessionContext,
  userTier = 'free',
}: {
  children: ReactNode;
  sessionContext?: BotlGuideSessionContext;
  userTier?: 'free' | 'brewer' | 'brewery' | 'enterprise';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<BotlGuideKey | null>(null);
  const [activeCapability, setActiveCapability] = useState<BotlGuideCapability | null>(null);

  const openGuide = (key: BotlGuideKey, capability?: BotlGuideCapability) => {
    setCurrentKey(key);
    setActiveCapability(capability ?? 'coach.guide');
    setIsOpen(true);
  };

  const closeGuide = () => {
    setIsOpen(false);
  };

  return (
    <BotlGuideContext.Provider
      value={{
        isOpen,
        currentKey,
        activeCapability,
        openGuide,
        closeGuide,
        content: GuideContent,
        sessionContext,
        userTier,
      }}
    >
      {children}
    </BotlGuideContext.Provider>
  );
}

export function useGuide() {
  const context = useContext(BotlGuideContext);
  if (context === undefined) {
    throw new Error('useGuide must be used within a BotlGuideProvider');
  }
  return context;
}
