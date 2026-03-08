'use client';

import { useState, useRef, useEffect } from 'react';
import { 
    LayoutDashboard, 
    FlaskConical, 
    Flame, 
    Activity, 
    Snowflake, 
    CheckCircle2,
    MoreHorizontal
} from 'lucide-react';

export type SessionTab = 'overview' | 'planning' | 'brewing' | 'fermentation' | 'conditioning' | 'completed';

interface SessionTabsProps {
    activeTab: SessionTab;
    setActiveTab: (tab: SessionTab) => void;
    currentPhase: string;
}

export function SessionTabs({ activeTab, setActiveTab, currentPhase }: SessionTabsProps) {
    const tabs = [
        { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
        { id: 'planning', label: 'Planung', icon: FlaskConical },
        { id: 'brewing', label: 'Brautag', icon: Flame },
        { id: 'fermentation', label: 'Gärung', icon: Activity },
        { id: 'conditioning', label: 'Reifung', icon: Snowflake },
        { id: 'completed', label: 'Abgeschlossen', icon: CheckCircle2 },
    ] as const;

    return (
        <nav className="w-56 hidden lg:flex flex-col border-r border-border bg-background shrink-0 sticky top-0 self-start min-h-screen p-4 overflow-y-auto">
            {/* Logo or Brand could go here if not in outer layout */}
            <div className="flex flex-col gap-1">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    // Determine if this tab represents the current active actual phase of the brew
                    // Mapping phase string to tab id
                    const phaseMap: Record<string, string> = {
                        'planning': 'planning',
                        'brewing': 'brewing',
                        'fermenting': 'fermentation',
                        'conditioning': 'conditioning',
                        'completed': 'completed'
                    };
                    const isCurrentPhase = phaseMap[currentPhase] === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SessionTab)}
                            className={`flex items-center justify-between w-full min-h-[48px] px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                isActive 
                                    ? 'bg-surface-hover text-text-primary shadow-sm' 
                                    : 'text-text-muted hover:bg-surface hover:text-text-primary'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-5 h-5 ${isActive ? 'text-text-primary' : 'text-text-disabled'}`} />
                                {tab.label}
                            </div>
                            {isCurrentPhase && (
                                <span className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--color-brand)]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export function MobileSessionTabs({ activeTab, setActiveTab }: SessionTabsProps) {
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    
    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreOpen(false);
            }
        }
        if (isMoreOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMoreOpen]);

    const tabs = [
        { id: 'overview', label: 'Hub', icon: LayoutDashboard },
        { id: 'planning', label: 'Plan', icon: FlaskConical },
        { id: 'brewing', label: 'Brau', icon: Flame },
        { id: 'fermentation', label: 'Gär', icon: Activity },
        { id: 'conditioning', label: 'Reif', icon: Snowflake },
        { id: 'completed', label: 'Fertig', icon: CheckCircle2 },
    ] as const;

    const VISIBLE_COUNT = 4;
    const visibleTabs = tabs.slice(0, VISIBLE_COUNT);
    const overflowTabs = tabs.slice(VISIBLE_COUNT);
    
    const isOverflowActive = overflowTabs.some(t => t.id === activeTab);

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
            
            {/* More Menu Drawer */}
            {isMoreOpen && (
                <div 
                    ref={moreMenuRef}
                    className="absolute bottom-full right-0 mb-2 mr-2 w-48 bg-surface border border-border rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200"
                >
                    <div className="flex flex-col divide-y divide-border">
                        {overflowTabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as SessionTab);
                                        setIsMoreOpen(false);
                                    }}
                                    className={`flex items-center gap-3 w-full p-4 text-left transition-colors ${
                                        isActive ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:bg-surface-hover/50 hover:text-text-primary'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium text-sm">{tab.label}</span>
                                    {isActive && <CheckCircle2 className="w-4 h-4 text-brand ml-auto" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex justify-around items-center h-16 px-1">
                {visibleTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as SessionTab);
                                setIsMoreOpen(false);
                            }}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${
                                isActive ? 'text-text-primary' : 'text-text-disabled'
                            }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'fill-current/10' : ''}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
                        </button>
                    )
                })}
                
                {/* More Button */}
                <button
                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                    className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${
                        isOverflowActive || isMoreOpen ? 'text-text-primary' : 'text-text-muted'
                    }`}
                >
                    <MoreHorizontal className={`w-6 h-6 ${(isOverflowActive || isMoreOpen) ? 'fill-current/10' : ''}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Mehr</span>
                </button>
            </div>
        </div>
    );
}
