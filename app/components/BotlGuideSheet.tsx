'use client';

import { useGuide, BotlGuideKey } from '@/lib/botlguide/BotlGuideContext';
import { X, Sparkles, BookOpen, ThumbsUp, ThumbsDown, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; // Assuming this is available, if not fallback to simple text or perilously set innerHTML. 
// Actually, simple text with bold is fine. I'll just render text for now or simple formatter.

export function BotlGuideSheet() {
    const { isOpen, currentKey, closeGuide, content, sessionContext, userTier } = useGuide();
    const [showAI, setShowAI] = useState(false);
    const [aiContent, setAiContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

    const isPremium = userTier === 'brewer' || userTier === 'brewery' || userTier === 'enterprise';

    const handleFeedback = (vote: 'up' | 'down') => {
        setFeedback(vote);
        // Optimistic update
        fetch('/api/botlguide/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contextKey: currentKey,
                feedback: vote,
                generatedText: aiContent
            })
        }).catch(e => console.error('Feedback failed', e));
    };

    // Reset state when key changes
    useEffect(() => {
        setShowAI(false);
        setAiContent(null);
        setError(null);
        setFeedback(null);
    }, [currentKey]);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeGuide();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [closeGuide]);

    const handleUnlock = async () => {
        setShowAI(true);
        if (aiContent) return; 

        // Check cache
        const cacheKey = `botlguide_${currentKey}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            setAiContent(cached);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'guide',
                    details: currentKey, // Send key as details
                    context: sessionContext // Send full context
                })
            });

            if (!res.ok) {
                if (res.status === 402) {
                    throw new Error("Upgrade Required");
                }
                throw new Error("Fehler bei der Generierung");
            }

            const data = await res.json();
            if (data.text) {
                setAiContent(data.text);
                sessionStorage.setItem(cacheKey, data.text);
            } else {
                throw new Error("Keine Antwort erhalten");
            }
        } catch (e: any) {
            setError(e.message || "Unbekannter Fehler");
        } finally {
            setIsLoading(false);
        }
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
            <div className="relative w-full max-w-sm h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950">
                    <div className="flex items-center gap-2 text-zinc-100 font-bold">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        <span>BotlGuide</span>
                    </div>
                    <button 
                        onClick={closeGuide}
                        className="p-1 hover:bg-zinc-900 rounded-md text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Static Knowledge */}
                    <div className="space-y-3">
                        <h2 className="text-xl font-bold text-white tracking-tight">{entry.title}</h2>
                        <div className="prose prose-invert prose-sm text-zinc-300 leading-relaxed">
                            {entry.content}
                        </div>
                    </div>

                    {/* AI Coach Teaser / Content */}
                    <div className="space-y-4 pt-6 border-t border-zinc-900">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/20 rounded-full px-2.5 py-1">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-purple-300">BotlGuide</span>
                                <span className="text-[9px] font-bold text-purple-500/60 uppercase tracking-widest">AI</span>
                            </div>
                        </div>
                        
                        {!showAI ? (
                            <div className="relative group cursor-pointer overflow-hidden rounded-lg bg-zinc-900/20 border border-zinc-800 hover:border-zinc-700 transition-all" onClick={handleUnlock}>
                                {/* Overlay based on Tier */}
                                <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center transition-all ${
                                    isPremium 
                                        ? 'bg-purple-950/20 group-hover:bg-purple-950/30' 
                                        : 'bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950 sm:to-zinc-950/90'
                                }`}>
                                    <span className={`font-bold text-sm mb-1 group-hover:scale-105 transition-transform flex items-center gap-2 ${isPremium ? 'text-purple-300' : 'text-white'}`}>
                                        {isPremium ? <Sparkles className="w-3 h-3" /> : null}
                                        {isPremium ? 'Rezept analysieren & Tipps holen' : 'Coaching freischalten'}
                                    </span>
                                    
                                    {!isPremium && <span className="text-xs text-zinc-500 mt-1">Upgrade auf Brewer Plan für kontext-basierte Tipps.</span>}
                                    
                                    {isPremium && <span className="text-[10px] text-purple-400/70 mt-1 uppercase tracking-widest font-bold">1 Credit</span>}
                                </div>
                                
                                {/* Fake blurred content - visual teaser */}
                                <div className="space-y-2 opacity-30 blur-[2px] select-none pointer-events-none p-4">
                                    <p className="text-xs text-zinc-400">Für dein aktuelles Rezept empfehle ich dringend eine Rast bei 45 Grad durchzuführen...</p>
                                    <p className="text-xs text-zinc-400">Beachte dabei dass die Enzyme in diesem Bereich besonders aktiv sind...</p>
                                    <p className="text-xs text-zinc-400">Das Verhältnis von Wasser zu Malz spielt hier eine entscheidende Rolle...</p>
                                </div>
                            </div>
                        ) : (
                            // Active AI View
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-zinc-500 space-y-3 bg-zinc-900/30 rounded-lg">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                        <span className="text-xs font-medium animate-pulse">Analysiere Rezept & Werte...</span>
                                    </div>
                                ) : error ? (
                                    <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-4 flex flex-col items-center text-center space-y-2">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                        <span className="text-sm text-red-200 font-medium">{error === "Upgrade Required" ? "Premium-Funktion" : "Fehler"}</span>
                                        <p className="text-xs text-red-300/70">
                                            {error === "Upgrade Required" 
                                                ? "Upgrade auf Brewer oder Brewery Plan nötig." 
                                                : error}
                                        </p>
                                        {error === "Upgrade Required" && (
                                            <a href="/pricing" className="mt-2 text-xs bg-red-900/50 hover:bg-red-900 text-white px-3 py-1.5 rounded-md font-bold transition-colors">
                                                Zum Pricing
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
                                        <div className="text-sm text-purple-100 leading-relaxed mb-4 prose prose-invert prose-sm prose-p:my-1.5 prose-strong:text-purple-200 prose-strong:font-bold max-w-none">
                                            <ReactMarkdown>{aiContent ?? ''}</ReactMarkdown>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-purple-500/10 pt-3 mt-2">
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
