'use client';

export type BrewTab = 'rezept' | 'bewertungen' | 'kommentare' | 'ähnliche';

interface Tab {
  id: BrewTab;
  label: string;
  count?: number;
}

interface BrewTabNavProps {
  activeTab: BrewTab;
  onChange: (tab: BrewTab) => void;
  ratingsCount?: number;
}

export default function BrewTabNav({ activeTab, onChange, ratingsCount = 0 }: BrewTabNavProps) {
  const tabs: Tab[] = [
    { id: 'rezept', label: 'Rezept' },
    { id: 'bewertungen', label: 'Bewertungen', count: ratingsCount },
    { id: 'kommentare', label: 'Kommentare' },
    { id: 'ähnliche', label: 'Ähnliche' },
  ];

  return (
    <div className="relative border-b border-zinc-800">
      {/* Fade mask on right for mobile scroll */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none z-10 md:hidden" />

      <nav
        className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] px-4 sm:px-6 max-w-7xl mx-auto"
        aria-label="Brew-Seiten-Navigation"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                'relative flex items-center gap-2 px-4 py-4 text-sm font-semibold whitespace-nowrap transition-colors shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-inset',
                isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={[
                  'text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'bg-zinc-800 text-zinc-500',
                ].join(' ')}>
                  {tab.count}
                </span>
              )}
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t-full"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
