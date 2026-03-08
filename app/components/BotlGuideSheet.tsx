'use client';

import { useGuide, BotlGuideKey } from '@/lib/botlguide/BotlGuideContext';
import { useBotlGuide } from '@/lib/botlguide/hooks/useBotlGuide';
import { X, Sparkles, BookOpen, ThumbsUp, ThumbsDown, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export function BotlGuideSheet() {
    const { isOpen, currentKey, closeGuide, content, sessionContext, userTier } = useGuide();
    const { generate, text: aiText, isLoading, error, upgradeRequired, reset } = useBotlGuide();
    const [showAI, setShowAI] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

    const isPremium = userTier === 'brewer' || userTier === 'brewery' || userTier === 'enterprise';
    // Free-User erhalten 5 Teaser-Credits/Monat und können AI vollwertig ausprobieren.
    // Die API (generate-text) erzwingt das Limit serverseitig via check_and_increment_ai_credits.
    const isFree = !userTier || userTier === 'free';

    const handleFeedback = (vote: 'up' | 'down') => {
        setFeedback(vote);
        fetch('/api/botlguide/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contextKey: currentKey,
                capability: 'coach.guide',
                feedback: vote,
                generatedText: aiText,
            })
        }).catch(e => console.error('Feedback failed', e));
    };

    // Reset when guide key changes
    useEffect(() => {
        setShowAI(false);
        reset();
        setFeedback(null);
    }, [currentKey, reset]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeGuide(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [closeGuide]);

    const handleUnlock = async () => {
        setShowAI(true);
        if (aiText) return; // already loaded

        await generate({
            capability: 'coach.guide',
            context: { ...sessionContext },
            data: { details: currentKey ?? '' },
            cacheKey: `coach_guide_${currentKey}`,
        });
    };

    if (!isOpen || !currentKey) return null;

    const entry = content[currentKey];
    if (!entry) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end font-sans">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" 
                onClick={closeGuide}
            />

            {/* Sheet */}
            <div className="relative w-full max-w-sm h-full bg-surface border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
                    <div className="flex items-center gap-2 text-text-primary font-bold">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        <span>BotlGuide</span>
                    </div>
                    <button 
                        onClick={closeGuide}
                        className="p-1 hover:bg-surface-hover rounded-md text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Static Knowledge */}
                    <div className="space-y-3">
                        <h2 className="text-xl font-bold text-text-primary tracking-tight">{entry.title}</h2>
                        <div className="prose prose-invert prose-sm text-text-secondary leading-relaxed">
                            {entry.content}
                        </div>
                    </div>

                    {/* AI Coach Teaser / Content */}
                    <div className="space-y-4 pt-6 border-t border-border">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-accent-purple/15 border border-accent-purple/30 rounded-full px-2.5 py-1">
                                <Sparkles className="w-3 h-3 text-accent-purple" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-accent-purple">BotlGuide</span>
                                <span className="text-[9px] font-bold text-accent-purple/60 uppercase tracking-widest">AI</span>
                            </div>
                        </div>
                        
                        {!showAI ? (
                            <div className="relative group cursor-pointer overflow-hidden rounded-lg border border-border hover:border-border-hover transition-all" onClick={handleUnlock}>
                                {/* Fully opaque overlay using tokens — works in both modes */}
                                <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center transition-all ${
                                    isPremium
                                        ? 'bg-accent-purple/10 group-hover:bg-accent-purple/15'
                                        : 'bg-success-bg group-hover:bg-success/10'
                                }`}>
                                    <span className={`font-bold text-sm flex items-center justify-center gap-2 mb-1 group-hover:scale-105 transition-transform ${
                                        isPremium ? 'text-accent-purple' : 'text-success'
                                    }`}>
                                        <Sparkles className="w-3 h-3" />
                                        {isPremium ? 'Rezept analysieren & Tipps holen' : 'KI-Analyse ausprobieren'}
                                    </span>
                                    {isFree && <span className="text-[10px] text-success/80 uppercase tracking-widest font-bold">Teaser · 1 von 5 Credits</span>}
                                    {isPremium && <span className="text-[10px] text-accent-purple/70 uppercase tracking-widest font-bold">1 Credit</span>}
                                </div>

                                {/* Blurred fake content behind overlay */}
                                <div className="space-y-2 blur-sm select-none pointer-events-none p-4">
                                    <p className="text-xs text-text-muted">Für dein aktuelles Rezept empfehle ich dringend eine Rast bei 45 Grad durchzuführen...</p>
                                    <p className="text-xs text-text-muted">Beachte dabei dass die Enzyme in diesem Bereich besonders aktiv sind...</p>
                                    <p className="text-xs text-text-muted">Das Verhältnis von Wasser zu Malz spielt hier eine entscheidende Rolle...</p>
                                </div>
                            </div>
                        ) : (
                            // Active AI View
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-text-muted space-y-3 bg-surface-hover rounded-lg">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                        <span className="text-xs font-medium animate-pulse">Analysiere Rezept & Werte...</span>
                                    </div>
                                ) : error ? (
                                    <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-4 flex flex-col items-center text-center space-y-2">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                        <span className="text-sm text-red-200 font-medium">
                                            {upgradeRequired
                                                ? (isFree ? "Teaser-Credits aufgebraucht" : "AI-Limit erreicht") 
                                                : "Fehler"}
                                        </span>
                                        <p className="text-xs text-red-300/70">
                                            {upgradeRequired 
                                                ? (isFree 
                                                    ? "Deine 5 kostenlosen Teaser-Credits sind für diesen Monat aufgebraucht. Upgrade auf Brewer für 50 Credits." 
                                                    : "Du hast dein monatliches AI-Kontingent erreicht. Upgrade für mehr Credits.") 
                                                : error}
                                        </p>
                                        {upgradeRequired && (
                                            <a href="/pricing" className="mt-2 text-xs bg-red-900/50 hover:bg-red-900 text-white px-3 py-1.5 rounded-md font-bold transition-colors">
                                                {isFree ? 'Jetzt upgraden' : 'Zum Pricing'}
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
                                        <div className="text-sm text-text-primary leading-relaxed mb-4 prose prose-invert prose-sm prose-p:my-1.5 prose-strong:text-text-primary prose-strong:font-bold max-w-none">
                                            <ReactMarkdown>{aiText ?? ''}</ReactMarkdown>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-3 mt-2">
                                            <span className="text-[9px] uppercase tracking-wider font-bold opacity-70">AI-Generiert</span>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleFeedback('up')}
                                                    className={`hover:text-emerald-400 transition-colors ${feedback === 'up' ? 'text-emerald-400' : ''}`}
                                                >
                                                    <ThumbsUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleFeedback('down')}
                                                    className={`hover:text-red-400 transition-colors ${feedback === 'down' ? 'text-red-400' : ''}`}
                                                >
                                                    <ThumbsDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>


            </div>
        </div>
    );
}
