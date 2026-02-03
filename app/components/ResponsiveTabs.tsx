'use client';

import { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
    id: string;
    label: string;
    icon?: LucideIcon;
}

interface ResponsiveTabsProps {
    items: TabItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    className?: string; // Additional classes for the nav container
    variant?: 'sidebar' | 'top' | 'bubble'; 
}

export default function ResponsiveTabs({ items, activeTab, onTabChange, className = '', variant = 'sidebar' }: ResponsiveTabsProps) {
    const scrollContainerRef = useRef<HTMLElement>(null);
    const tabsRef = useRef<Map<string, HTMLButtonElement | null>>(new Map());

    useEffect(() => {
        const tabNode = tabsRef.current.get(activeTab);
        if (tabNode) {
            // Check if we are on mobile (horizontal layout check roughly via checking logic or just calling scrollIntoView)
            // scrollIntoView with inline: 'center' works perfectly for horizontal scrolling containers
            tabNode.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest', 
                inline: 'center'
            });
        }
    }, [activeTab]);

    const isSidebar = variant === 'sidebar';

    return (
        <nav 
            ref={scrollContainerRef}
            className={`
                flex 
                ${isSidebar ? 'flex-row lg:flex-col gap-2 lg:gap-1 pb-2 lg:pb-0' : 'flex-row gap-2 pb-2'} 
                overflow-x-auto scrollbar-hide 
                ${className}
            `}
        >
            {items.map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                
                return (
                    <button
                        key={item.id}
                        ref={(el) => {
                             tabsRef.current.set(item.id, el);
                        }}
                        onClick={() => onTabChange(item.id)}
                        className={`
                            flex-shrink-0 
                            ${isSidebar ? 'lg:flex-shrink lg:w-full lg:justify-start' : ''}
                            justify-center 
                            px-3 py-2 rounded-md 
                            flex items-center gap-2 lg:gap-3 
                            font-medium text-sm 
                            transition-all outline-none 
                            focus-visible:ring-2 focus-visible:ring-white/20 
                            whitespace-nowrap
                            ${isActive 
                                ? 'bg-zinc-800 text-white shadow-sm' 
                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                            }
                        `}
                    >
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
