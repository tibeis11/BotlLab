'use client';

/**
 * DiscoverSection — extracted from DiscoverClient to prevent React
 * from treating SectionHeader / RankedRow / Section as new component
 * types on every parent render (inline definitions = new ref = remount).
 *
 * All components are now stable module-level definitions that receive
 * currentUserId / isAdmin as explicit props instead of closing over them.
 */

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Star } from 'lucide-react';
import { toast } from 'sonner';
import DiscoverBrewCard, { DiscoverBrew } from '../../components/DiscoverBrewCard';
import { toggleBrewLike } from '@/lib/actions/like-actions';

type BrewWithRecency = DiscoverBrew & { _recencyFactor?: number };

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  tabSlot?: React.ReactNode;
  onMore?: () => void;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
}

export function SectionHeader({
  title,
  icon,
  count,
  tabSlot,
  onMore,
  onScrollLeft,
  onScrollRight,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {tabSlot ? (
        <div className="flex items-center gap-2">{tabSlot}</div>
      ) : (
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
          <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">{icon}</div>
          {title}
        </h2>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
          Top {count}
        </span>
        {onMore && (
          <button
            onClick={onMore}
            className="hidden md:flex items-center gap-0.5 text-xs font-bold text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            Mehr <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {(onScrollLeft || onScrollRight) && (
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={onScrollLeft}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
              aria-label="Links scrollen"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onScrollRight}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
              aria-label="Rechts scrollen"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RankedRow — defined at module level so Section doesn't recreate it on render
// ─────────────────────────────────────────────────────────────────────────────

interface RankedRowProps {
  brew: BrewWithRecency;
  rank: number;
  trend: 'up' | 'down' | 'neutral';
  currentUserId?: string;
}

function RankedRow({ brew, rank, trend, currentUserId }: RankedRowProps) {
  const [isLiked, setIsLiked] = useState(brew.user_has_liked ?? false);
  const [likeCount, setLikeCount] = useState(brew.likes_count ?? 0);

  const avgR = brew.ratings?.length
    ? (brew.ratings.reduce((s, r) => s + r.rating, 0) / brew.ratings.length).toFixed(1)
    : null;

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      toast('Anmelden um Brews zu liken', {
        action: { label: 'Anmelden', onClick: () => { window.location.href = '/login'; } },
      });
      return;
    }
    const prev = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prev);
    setLikeCount(prev ? prevCount - 1 : prevCount + 1);
    try { await toggleBrewLike(brew.id); }
    catch { setIsLiked(prev); setLikeCount(prevCount); }
  };

  return (
    <a
      href={`/brew/${brew.id}`}
      className="group flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-zinc-900/60 transition-colors border border-transparent hover:border-zinc-800"
    >
      <div className="w-5 text-center flex-shrink-0">
        <span className="text-sm font-black text-zinc-500 group-hover:text-zinc-300 transition-colors tabular-nums">{rank}</span>
      </div>
      <div className="w-4 flex-shrink-0 text-center leading-none">
        {trend === 'up'      && <span className="text-[13px] font-black text-green-400" style={{ lineHeight: 1 }}>&#9650;</span>}
        {trend === 'down'    && <span className="text-[13px] font-black text-red-500"   style={{ lineHeight: 1 }}>&#9660;</span>}
        {trend === 'neutral' && <span className="text-[13px] text-zinc-700"             style={{ lineHeight: 1 }}>&bull;</span>}
      </div>
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/50">
        {brew.image_url
          ? <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">🍺</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors leading-tight">{brew.name}</p>
        <p className="text-xs text-zinc-500 truncate leading-tight mt-0.5">
          {[brew.brewery?.team_name || brew.brewery?.name, brew.style].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {avgR && (
          <div className="flex items-center gap-0.5">
            <Star size={11} className="fill-yellow-400 stroke-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 tabular-nums">{avgR}</span>
          </div>
        )}
        {/* p-1.5 -m-1.5 hover:scale-150 matches DiscoverBrewCard heart hit-area */}
        <button
          onClick={handleLike}
          className="flex items-center gap-0.5 group/like p-1.5 -m-1.5 hover:scale-150 transition-transform"
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={13}
            className={`transition-colors ${isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-zinc-500 group-hover/like:stroke-red-400'}`}
          />
          {likeCount > 0 && (
            <span className={`text-xs font-semibold tabular-nums transition-colors ${isLiked ? 'text-red-400' : 'text-zinc-500 group-hover/like:text-red-400'}`}>
              {likeCount}
            </span>
          )}
        </button>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section — horizontal scroll / ranked-list layout container
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionProps {
  title: string;
  items: DiscoverBrew[];
  icon: React.ReactNode;
  layout?: 'hero-scroll' | 'portrait-only' | 'ranked-list';
  onMore?: () => void;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function Section({
  title,
  items,
  icon,
  layout = 'hero-scroll',
  onMore,
  currentUserId,
  isAdmin,
}: SectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 500 : -500, behavior: 'smooth' });

  // ─ ranked-list: Compact numbered rows with trend arrow based on recency
  // Used for "Am besten bewertet"
  if (layout === 'ranked-list') {
    // Trend-Pfeile drücken Frische aus:
    //   ↑ grün   recencyFactor > 0.75  → unter ~24 Tage alt
    //   ↓ rot    recencyFactor < 0.50  → über  ~80 Tage alt
    //   •        dazwischen            → etabliert
    const trendOf = (b: BrewWithRecency) => {
      const rf = b._recencyFactor ?? 0.4;
      if (rf > 0.75) return 'up' as const;
      if (rf < 0.50) return 'down' as const;
      return 'neutral' as const;
    };
    const capped = (items as BrewWithRecency[]).slice(0, 10);

    return (
      <div className="mb-12">
        <SectionHeader title={title} icon={icon} count={items.length} onMore={onMore} />
        {/* grid-rows-5 + grid-flow-col = 5 rows per column, fills column-first */}
        <div className="grid grid-rows-5 grid-flow-col gap-x-6 gap-y-0.5">
          {capped.map((brew, i) => (
            <RankedRow
              key={brew.id}
              brew={brew}
              rank={i + 1}
              trend={trendOf(brew)}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─ portrait-only: Pure horizontal portrait scroll, no hero
  // Used for "Neuheiten"
  if (layout === 'portrait-only') {
    return (
      <div className="mb-12">
        <SectionHeader
          title={title} icon={icon} count={items.length} onMore={onMore}
          onScrollLeft={() => scrollBy('left')} onScrollRight={() => scrollBy('right')}
        />
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900"
          >
            {items.map(brew => (
              <div key={brew.id} className="snap-center flex-shrink-0" style={{ width: 220 }}>
                <DiscoverBrewCard brew={brew} currentUserId={currentUserId} isAdmin={isAdmin} variant="portrait" />
              </div>
            ))}
            <div className="min-w-[40px] flex-shrink-0" aria-hidden="true" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent" />
        </div>
      </div>
    );
  }

  // ─ hero-scroll (default): Hero left + portrait horizontal scroll right
  // Used for "Empfohlen" and "Gerade angesagt"
  const isTrending = title === 'Gerade angesagt';
  return (
    <div className="mb-12">
      <SectionHeader
        title={title} icon={icon} count={items.length} onMore={onMore}
        onScrollLeft={() => scrollBy('left')} onScrollRight={() => scrollBy('right')}
      />
      <div className="md:flex md:gap-5 md:items-start">
        {items.length > 0 && (
          <div className="hidden md:block flex-shrink-0" style={{ width: 340, height: 340 }}>
            <DiscoverBrewCard
              brew={items[0]}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              variant="hero"
              rank={isTrending ? 1 : undefined}
            />
          </div>
        )}
        <div className="relative flex-1 min-w-0">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900"
          >
            {items.map((brew, i) => (
              <div
                key={brew.id}
                className={`snap-center flex-shrink-0 ${i === 0 ? 'md:hidden' : ''}`}
                style={{ width: 220 }}
              >
                <DiscoverBrewCard
                  brew={brew}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  variant="portrait"
                  rank={isTrending ? i + 1 : undefined}
                />
              </div>
            ))}
            <div className="min-w-[40px] flex-shrink-0" aria-hidden="true" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent" />
        </div>
      </div>
    </div>
  );
}
