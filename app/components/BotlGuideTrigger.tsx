'use client';

import { useGuide, BotlGuideKey } from '@/lib/botlguide/BotlGuideContext';
import { Sparkles } from 'lucide-react';

export function BotlGuideTrigger({ guideKey, className, icon }: { guideKey: BotlGuideKey, className?: string, icon?: 'help' | 'info' }) {
    // Safely use hook - if context is missing, render nothing (defensive)
    let openGuide;
    try {
         const ctx = useGuide();
         openGuide = ctx.openGuide;
    } catch (e) {
         return null;
    }

    return (
        <button 
           onClick={(e) => { e.stopPropagation(); openGuide(guideKey); }}
           className={`inline-flex items-center gap-1 px-2 py-1 min-h-[32px] rounded-full bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 transition-colors ${className ?? ''}`}
           title="BotlGuide öffnen"
           aria-label={`Hilfe zu ${guideKey}`}
        >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Guide</span>
        </button>
    );
}
