'use client';
import { calcWeightedAvg } from '@/lib/rating-utils';



/**
 * DiscoverSection — extracted from DiscoverClient to prevent React
 * from treating SectionHeader / RankedRow / Section as new component
 * types on every parent render (inline definitions = new ref = remount).
 *
 * All components are now stable module-level definitions that receive
 * currentUserId / isAdmin as explicit props instead of closing over them.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Info, Star } from 'lucide-react';
import { toast } from 'sonner';
import DiscoverBrewCard, { DiscoverBrew } from '../../components/DiscoverBrewCard';
import { toggleBrewLike } from '@/lib/actions/like-actions';

type BrewWithRecency = DiscoverBrew & { _recencyFactor?: number };

// ─────────────────────────────────────────────────────────────────────────────
// InfoBubble — small ℹ icon that shows a tooltip on hover/click
// ─────────────────────────────────────────────────────────────────────────────

function InfoBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        onClick={e => { e.preventDefault(); setOpen(v => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="w-5 h-5 rounded-full bg-surface-hover border border-border-hover flex items-center justify-center text-text-muted hover:text-brand hover:border-border-active transition-colors flex-shrink-0"
        aria-label="Info"
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 z-50 bg-surface border border-border-hover rounded-xl px-4 py-3 shadow-xl pointer-events-none">
          <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  count: number;
  tabSlot?: React.ReactNode;
  onMore?: () => void;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  infoBubble?: string;
}

export function SectionHeader({
  title,
  count,
  tabSlot,
  onMore,
  onScrollLeft,
  onScrollRight,
  infoBubble,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {tabSlot ? (
        <div className="flex items-center gap-2">{tabSlot}</div>
      ) : (
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-text-primary">
          {title}
          {infoBubble && <InfoBubble text={infoBubble} />}
        </h2>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs bg-surface border border-border text-text-muted px-2 py-0.5 rounded font-mono uppercase tracking-wider">
          Top {count}
        </span>
        {onMore && (
          <button
            onClick={onMore}
            className="flex items-center gap-0.5 text-xs font-bold text-text-secondary hover:text-brand transition-colors"
          >
            Mehr <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {(onScrollLeft || onScrollRight) && (
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={onScrollLeft}
              className="p-1.5 rounded-lg bg-surface border border-border hover:border-border-active text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Links scrollen"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onScrollRight}
              className="p-1.5 rounded-lg bg-surface border border-border hover:border-border-active text-text-secondary hover:text-text-primary transition-colors"
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
  likedBrewIds?: Set<string>;
  onLikeToggle?: (brewId: string) => void;
}

function RankedRow({ brew, rank, trend, currentUserId, likedBrewIds, onLikeToggle }: RankedRowProps) {
  const [localIsLiked, setLocalIsLiked] = useState(brew.user_has_liked ?? false);
  const [likeCount, setLikeCount] = useState(brew.likes_count ?? 0);

  // Sync if brew data arrives/updates after initial render (async load)
  useEffect(() => {
    setLocalIsLiked(brew.user_has_liked ?? false);
    setLikeCount(brew.likes_count ?? 0);
  }, [brew.id, brew.user_has_liked, brew.likes_count]);

  // Controlled mode: derive from parent Set; fallback to local state
  const isLiked = likedBrewIds ? likedBrewIds.has(brew.id) : localIsLiked;

  const avgR = brew.ratings?.length
    ? (calcWeightedAvg(brew.ratings)).toFixed(1)
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
    const prevCount = likeCount;
    setLikeCount(isLiked ? prevCount - 1 : prevCount + 1);
    if (onLikeToggle) {
      onLikeToggle(brew.id);
    } else {
      const prev = localIsLiked;
      setLocalIsLiked(!prev);
      try { await toggleBrewLike(brew.id); }
      catch { setLocalIsLiked(prev); setLikeCount(prevCount); }
    }
  };

  return (
    <a
      href={`/brew/${brew.id}`}
      className="group flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-surface/60 transition-colors border border-transparent hover:border-border"
    >
      <div className="w-5 text-center flex-shrink-0">
        <span className="text-sm font-black text-text-muted group-hover:text-text-secondary transition-colors tabular-nums">{rank}</span>
      </div>
      <div className="w-4 flex-shrink-0 text-center leading-none">
        {trend === 'up'      && <span className="text-[13px] font-black text-green-400" style={{ lineHeight: 1 }}>&#9650;</span>}
        {trend === 'down'    && <span className="text-[13px] font-black text-red-500"   style={{ lineHeight: 1 }}>&#9660;</span>}
          {trend === 'neutral' && <span className="text-[13px] text-border-hover"             style={{ lineHeight: 1 }}>&bull;</span>}
      </div>
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-hover border border-border/50">
        {brew.image_url
          ? <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-text-disabled text-xs">🍺</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary truncate group-hover:text-brand-hover transition-colors leading-tight">{brew.name}</p>
        <p className="text-xs text-text-muted truncate leading-tight mt-0.5">
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
            className={`transition-colors ${isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-text-muted group-hover/like:stroke-red-400'}`}
          />
          {likeCount > 0 && (
              <span className={`text-xs font-semibold tabular-nums transition-colors ${isLiked ? 'text-red-400' : 'text-text-muted group-hover/like:text-red-400'}`}>
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
  infoText?: string;
  likedBrewIds?: Set<string>;
  onLikeToggle?: (brewId: string) => void;
}

export function Section({
  title,
  items,
  icon,
  layout = 'hero-scroll',
  onMore,
  currentUserId,
  isAdmin,
  infoText,
  likedBrewIds,
  onLikeToggle,
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
        <SectionHeader title={title} icon={icon} count={items.length} onMore={onMore} infoBubble={infoText} />
        {/* Single column on mobile, 2 columns on md+ when there are enough items */}
        <div className={`grid gap-y-0.5 gap-x-6 ${capped.length > 5 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          {capped.map((brew, i) => (
            <RankedRow
              key={brew.id}
              brew={brew}
              rank={i + 1}
              trend={trendOf(brew)}
              currentUserId={currentUserId}
              likedBrewIds={likedBrewIds}
              onLikeToggle={onLikeToggle}
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
          infoBubble={infoText}
        />
        {/* -mx-6 md:mx-0: break out of main's px-6 so scroll reaches screen edges on mobile */}
        <div className="relative -mx-6 md:mx-0">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-hide pl-6 md:pl-0"
          >
            {items.map(brew => (
              <div key={brew.id} className="snap-center flex-shrink-0 w-[45vw] max-w-[220px] md:w-[220px]">
                <DiscoverBrewCard brew={brew} currentUserId={currentUserId} isAdmin={isAdmin} variant="portrait" likedBrewIds={likedBrewIds} onLikeToggle={onLikeToggle} />
              </div>
            ))}
            <div className="min-w-6 flex-shrink-0 md:min-w-[40px]" aria-hidden="true" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
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
              likedBrewIds={likedBrewIds}
              onLikeToggle={onLikeToggle}
            />
          </div>
        )}
        {/* -mx-6 md:mx-0: break out of main's px-6 so scroll reaches screen edges on mobile */}
        <div className="relative flex-1 min-w-0 -mx-6 md:mx-0">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-hide pl-6 md:pl-0"
          >
            {items.map((brew, i) => (
              <div
                key={brew.id}
                className="snap-center flex-shrink-0 w-[45vw] max-w-[220px] md:w-[220px]"
              >
                <DiscoverBrewCard
                  brew={brew}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  variant="portrait"
                  rank={isTrending ? i + 1 : undefined}
                  likedBrewIds={likedBrewIds}
                  onLikeToggle={onLikeToggle}
                />
              </div>
            ))}
            <div className="min-w-[40px] flex-shrink-0" aria-hidden="true" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        </div>
      </div>
    </div>
  );
}
