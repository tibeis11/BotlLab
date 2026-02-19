'use client';

import { useGuide, BotlGuideKey } from '@/lib/botlguide/BotlGuideContext';
import { HelpCircle, Info } from 'lucide-react';

export function BotlGuideTrigger({ guideKey, className, icon = 'help' }: { guideKey: BotlGuideKey, className?: string, icon?: 'help' | 'info' }) {
    // Determine icon
    const Icon = icon === 'info' ? Info : HelpCircle;
    
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
           className={`text-zinc-500 hover:text-emerald-400 transition-colors p-1 -m-1 rounded-full hover:bg-zinc-800 ${className}`}
           title="BotlGuide öffnen"
           aria-label={`Hilfe zu ${guideKey}`}
        >
            <Icon className="w-3.5 h-3.5" />
        </button>
    );
}
