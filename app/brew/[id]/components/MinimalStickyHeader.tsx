'use client';

import { useEffect, useRef, useState } from 'react';

interface MinimalStickyHeaderProps {
  brewName: string;
  activeTab: string;
  onTabClick?: (tab: string) => void;
  tabs?: Array<{ id: string; label: string }>;
}

// Renders an ultra-slim sticky bar when the hero scrolls out of view.
// Shows brew name + active tab name for orientation while deep-scrolling.
export default function MinimalStickyHeader({
  brewName,
  activeTab,
  onTabClick,
  tabs = [],
}: MinimalStickyHeaderProps) {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show header when sentinel (placed at bottom of hero) leaves viewport
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' }, // offset for the main Header
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel placed at the bottom of the hero zone — observe with ref */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {/* Sticky bar */}
      <div
        className={[
          'fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800/60',
          'transition-all duration-200 ease-out',
          visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <div className="max-w-7xl mx-auto px-4 h-11 flex items-center gap-4">
          {/* Brew name */}
          <span className="font-black text-white text-sm truncate flex-1 min-w-0">
            {brewName}
          </span>

          {/* Quick tab switcher (if tabs provided) */}
          {tabs.length > 0 && onTabClick && (
            <div className="flex items-center gap-1 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onTabClick(tab.id)}
                  className={[
                    'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors',
                    activeTab === tab.id
                      ? 'text-cyan-400 bg-cyan-950/40'
                      : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
