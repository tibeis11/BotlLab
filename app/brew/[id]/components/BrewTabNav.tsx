'use client';

import { BookOpen, Star, MessageCircle, Layers } from 'lucide-react';

export type BrewTab = 'rezept' | 'bewertungen' | 'kommentare' | 'ähnliche';

const TAB_CONFIG: {
  id: BrewTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'rezept',      label: 'Rezept',      icon: BookOpen },
  { id: 'bewertungen', label: 'Bewertungen', icon: Star },
  { id: 'kommentare',  label: 'Kommentare',  icon: MessageCircle },
  { id: 'ähnliche',    label: 'Ähnliche',    icon: Layers },
];

interface BrewTabNavProps {
  activeTab: BrewTab;
  onChange: (tab: BrewTab) => void;
  ratingsCount?: number;
}

export default function BrewTabNav({ activeTab, onChange, ratingsCount = 0 }: BrewTabNavProps) {
  return (
    <>
      {/* ── MOBILE: horizontal scrollable tab bar ────────────────── */}
      <div className="lg:hidden relative border-b border-zinc-800">
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
        <nav className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] px-4">
          {TAB_CONFIG.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={[
                  'relative flex items-center gap-2 px-4 py-4 text-sm font-semibold whitespace-nowrap transition-colors shrink-0',
                  isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                {tab.label}
                {tab.id === 'bewertungen' && ratingsCount > 0 && (
                  <span className={[
                    'text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none',
                    isActive ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-500',
                  ].join(' ')}>
                    {ratingsCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── DESKTOP: sticky vertical sidebar ─────────────────────── */}
      <nav className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0 sticky top-20 self-start">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 px-3 mb-2">Navigation</p>
        {TAB_CONFIG.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200',
              ].join(' ')}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`} />
              <span className="flex-1">{tab.label}</span>
              {tab.id === 'bewertungen' && ratingsCount > 0 && (
                <span className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                  isActive ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-600',
                ].join(' ')}>
                  {ratingsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
