'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import GuideContent from './content.json';

// Type for the content keys
export type BotlGuideKey = keyof typeof GuideContent;

interface BotlGuideContextType {
  isOpen: boolean;
  currentKey: BotlGuideKey | null;
  openGuide: (key: BotlGuideKey) => void;
  closeGuide: () => void;
  content: typeof GuideContent;
  sessionContext?: any; // Context for AI generation
  userTier?: 'free' | 'brewer' | 'brewery' | 'enterprise';
}

const BotlGuideContext = createContext<BotlGuideContextType | undefined>(undefined);

export function BotlGuideProvider({ children, sessionContext, userTier = 'free' }: { children: ReactNode, sessionContext?: any, userTier?: 'free' | 'brewer' | 'brewery' | 'enterprise' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<BotlGuideKey | null>(null);

  const openGuide = (key: BotlGuideKey) => {
    setCurrentKey(key);
    setIsOpen(true);
  };

  const closeGuide = () => {
    setIsOpen(false);
  };

  return (
    <BotlGuideContext.Provider value={{ isOpen, currentKey, openGuide, closeGuide, content: GuideContent, sessionContext, userTier }}>
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
