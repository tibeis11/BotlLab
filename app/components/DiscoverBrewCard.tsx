'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Flame, Heart, Repeat, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { ebcToHex } from '@/lib/brewing-calculations';
import { toggleBrewLike } from '@/lib/actions/like-actions';
import { useBrewViewTracker } from '@/lib/hooks/useBrewViewTracker';
import { toast } from 'sonner';

export interface DiscoverBrew {
  id: string;
  name: string;
  style?: string | null;
  image_url?: string | null;
  created_at: string;
  abv?: number;
  ibu?: number;
  ebc?: number;
  original_gravity?: number;
  ratings?: { rating: number }[] | null;
  likes_count?: number;
  user_has_liked?: boolean;
  brewery?: { id?: string; name: string; team_name?: string; logo_url?: string | null } | null;
  quality_score?: number;
  personalization_score?: number;
  recommendation_reason?: string | null;
  copy_count?: number;
  times_brewed?: number;
  view_count?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface Props {
  brew: DiscoverBrew;
  currentUserId?: string;
  isAdmin?: boolean;
  /** hero = cinematic full-bleed, portrait = tall card, compact = horizontal list item, highlight = text left image right */
  variant?: 'hero' | 'portrait' | 'compact' | 'highlight';
  /** Position in a trending list — shows 🔥 #N badge on hero */
  rank?: number;
}

export default function DiscoverBrewCard({ brew, currentUserId, isAdmin = false, variant = 'portrait', rank }: Props) {
  const [isLiked, setIsLiked] = useState(brew.user_has_liked ?? false);
  const [likeCount, setLikeCount] = useState(brew.likes_count ?? 0);

  // Sync whenever parent supplies updated user data (async load after mount)
  useEffect(() => { setIsLiked(brew.user_has_liked ?? false); }, [brew.user_has_liked]);
  useEffect(() => { setLikeCount(brew.likes_count ?? 0); }, [brew.likes_count]);

  // Stufe B: dwell-time tracking — writes to brew_views after 3s of visibility
  const cardRef = useBrewViewTracker({ brewId: brew.id, userId: currentUserId, source: 'discover' });

  const avgRating = brew.ratings?.length
    ? Math.round((brew.ratings.reduce((s, r) => s + r.rating, 0) / brew.ratings.length) * 10) / 10
    : null;

  const ebcColor = brew.ebc != null ? ebcToHex(Number(brew.ebc)) : undefined;

  const colorLabel = brew.ebc != null
    ? Number(brew.ebc) < 10 ? 'Sehr hell'
    : Number(brew.ebc) < 20 ? 'Hell'
    : Number(brew.ebc) < 40 ? 'Bernstein'
    : Number(brew.ebc) < 70 ? 'Dunkel'
    : 'Sehr dunkel'
    : null;

  const bitterLabel = brew.ibu != null
    ? Number(brew.ibu) < 15 ? 'mild'
    : Number(brew.ibu) < 30 ? 'ausgewogen'
    : Number(brew.ibu) < 50 ? 'hopfig'
    : 'sehr hopfig'
    : null;

  // Complexity badge (same logic as BrewCard)
  const maltCount = Array.isArray(brew.data?.malts) ? brew.data.malts.length : 0;
  const hopCount  = Array.isArray(brew.data?.hops)  ? brew.data.hops.length  : 0;
  const mashStepCount = Array.isArray(brew.data?.mash_steps) ? brew.data.mash_steps.length : 1;
  const complexity: 'simple' | 'intermediate' | 'complex' | null =
    maltCount === 0 && hopCount === 0 ? null :
    (maltCount > 6 || mashStepCount >= 3) ? 'complex' :
    (maltCount >= 4 || hopCount >= 3 || mashStepCount >= 2) ? 'intermediate' :
    'simple';
  const COMPLEXITY = {
    simple:       { label: 'Einsteiger',       className: 'text-green-400' },
    intermediate: { label: 'Fortgeschritten', className: 'text-yellow-400' },
    complex:      { label: 'Experte',          className: 'text-orange-400' },
  } as const;

  const ageLabel = brew.created_at && !isNaN(new Date(brew.created_at).getTime())
    ? formatDistanceToNow(new Date(brew.created_at), { addSuffix: true, locale: de })
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
    try {
      await toggleBrewLike(brew.id);
    } catch {
      setIsLiked(prev);
      setLikeCount(prevCount);
    }
  };

  // ── Double-tap to like (mobile) ──────────────────────────────────
  const lastTapRef = useRef<number>(0);
  const suppressNextClickRef = useRef<boolean>(false);

  const handleCardTouchEnd = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && currentUserId) {
      suppressNextClickRef.current = true;
      const prev = isLiked;
      setIsLiked(!prev);
      setLikeCount(c => prev ? c - 1 : c + 1);
      toggleBrewLike(brew.id).catch(() => {
        setIsLiked(prev);
        setLikeCount(c => prev ? c + 1 : c - 1);
      });
    }
    lastTapRef.current = now;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      e.preventDefault();
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // HERO VARIANT — cinematic full-bleed card for #1 trending slot
  // The image fills the ENTIRE card. Title, stats and like button
  // are overlaid on top of the image with a gradient.
  // ─────────────────────────────────────────────────────────────────
  if (variant === 'hero') {
    return (
      <Link
        ref={cardRef}
        href={`/brew/${brew.id}`}
        className="group relative flex flex-col h-full rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all duration-300"
        onTouchEnd={handleCardTouchEnd}
        onClick={handleCardClick}
      >
        {/* Full-bleed image — fills the ENTIRE card */}
        <div className="absolute inset-0 w-full h-full">
          {brew.image_url ? (
            <img
              src={brew.image_url}
              alt={brew.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-950 via-zinc-900 to-zinc-950" />
          )}
        </div>

        {/* Gradient overlay to make text readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

        {/* Badges at the top */}
        <div className="relative z-10 p-4 flex justify-between items-start">
          {brew.style && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/90 border border-white/10">
              {brew.style}
            </span>
          )}
          {rank && (
            <span className="flex items-center gap-1 bg-orange-500 text-black text-xs font-black px-2.5 py-1 rounded-full shadow-lg ml-auto">
              <Flame className="w-3 h-3" />
              {rank === 1 ? '#1 Trending' : `#${rank}`}
            </span>
          )}
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-1" />

        {/* ── OVERLAID CONTENT PANEL ── */}
        <div className="relative z-10 p-5 flex flex-col gap-2">
          {/* Row 1: Brewery */}
          <div className="flex items-center gap-2 min-w-0">
            {brew.brewery?.logo_url && (
              <img src={brew.brewery.logo_url} alt="" className="w-5 h-5 rounded-full border border-zinc-700 object-cover flex-shrink-0" />
            )}
            <span className="text-sm text-zinc-300 font-medium truncate drop-shadow-md">
              {brew.brewery?.team_name || brew.brewery?.name || ''}
            </span>
          </div>

          {/* Row 2: Title */}
          <h3 className="text-2xl font-black text-white leading-tight group-hover:text-cyan-300 transition-colors drop-shadow-lg">
            {brew.name}
          </h3>

          {/* Row 3: Stats — ABV leads, rest is plain text with drop-shadow */}
          <div className="flex items-center gap-3 flex-wrap">
            {brew.abv != null && (
              <span className="text-sm font-black text-cyan-300 drop-shadow-md">
                {Number(brew.abv).toFixed(1)}%
              </span>
            )}
            {brew.ebc != null && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 drop-shadow-md">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: ebcColor }} />
                {colorLabel ?? `${Number(brew.ebc).toFixed(0)} EBC`}
              </span>
            )}
            {bitterLabel && (
              <span className="text-xs font-semibold text-zinc-400 drop-shadow-md">{bitterLabel}</span>
            )}
            {brew.original_gravity != null && (
              <span className="text-xs font-semibold text-zinc-400 drop-shadow-md">
                {Number(brew.original_gravity).toFixed(1)}°P
              </span>
            )}
            {brew.ibu != null && (
              <span className="text-xs font-semibold text-zinc-400 drop-shadow-md">
                {Number(brew.ibu).toFixed(0)} IBU
              </span>
            )}
          </div>

          {/* Row 4: age · complexity | icon stats group */}
          <div className="flex items-center gap-2 flex-wrap">
            {ageLabel && <span className="text-xs text-zinc-500 drop-shadow-md">{ageLabel}</span>}
            {complexity && (
              <span className={`text-xs font-semibold drop-shadow-md ${COMPLEXITY[complexity].className}`}>
                {COMPLEXITY[complexity].label}
              </span>
            )}
            {/* Community stats — icon + number, grouped right */}
            <div className="flex items-center gap-2 ml-auto">
              {avgRating && (
                <span className="flex items-center gap-0.5 text-xs text-zinc-400 drop-shadow-md">
                  <Star size={11} className="fill-yellow-400 stroke-yellow-400 flex-shrink-0" />{avgRating}
                </span>
              )}
              <button
                onClick={handleLike}
                className={`flex items-center gap-0.5 text-xs drop-shadow-md p-1.5 -m-1.5 hover:scale-150 transition-transform ${isLiked ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'}`}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart size={11} className={`flex-shrink-0 ${isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-zinc-400'}`} />
                {likeCount > 0 && likeCount}
              </button>
              {(brew.times_brewed ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-zinc-400 drop-shadow-md">
                  <Repeat size={11} className="stroke-zinc-400 flex-shrink-0" />{brew.times_brewed}
                </span>
              )}
              {(brew.view_count ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-zinc-400 drop-shadow-md">
                  <Eye size={11} className="stroke-zinc-400 flex-shrink-0" />{brew.view_count}
                </span>
              )}
            </div>
            {isAdmin && (
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/40 backdrop-blur-md border border-violet-500/50 text-violet-200">
                Q:{brew.quality_score ?? '?'}{brew.personalization_score != null ? ` · P:${brew.personalization_score.toFixed(2)}` : ''}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PORTRAIT VARIANT — YouTube Music style: rounded image, bare text below
  // No card box — text sits directly on the page background
  // ─────────────────────────────────────────────────────────────────
  if (variant === 'portrait') {
    return (
      <Link
        ref={cardRef}
        href={`/brew/${brew.id}`}
        className="group flex flex-col gap-2.5 transition-all duration-200"
        onTouchEnd={handleCardTouchEnd}
        onClick={handleCardClick}
      >
        {/* Image — 1:1 square, fully rounded, all overlays as before */}
        <div className="relative w-full aspect-square flex-shrink-0 overflow-hidden rounded-xl">
          {brew.image_url ? (
            <img
              src={brew.image_url}
              alt={brew.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-zinc-600 text-3xl">🍺</span>
            </div>
          )}

          {/* Style badge — top left */}
          {brew.style && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white/90 border border-white/10 z-10">
              {brew.style}
            </span>
          )}

          {/* Subtle bottom gradient so image fades into the page bg */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/60 to-transparent pointer-events-none" />
        </div>

        {/* ── Info area — NO background box, bare text on page BG ── */}
        <div className="flex flex-col gap-0.5 px-0.5">

          {/* Line 1: Brewery only — style is already on the image badge */}
          <p className="text-[11px] text-zinc-400 truncate leading-snug">
            {brew.brewery?.team_name || brew.brewery?.name || '\u00A0'}
          </p>

          {/* Line 2: Brew name — bold, prominent */}
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-cyan-300 transition-colors">
            {brew.name}
          </h3>

          {/* Line 2b: Recommendation reason — only shown in personalised section */}
          {brew.recommendation_reason && (
            <p className="text-[10px] text-cyan-500/70 truncate leading-snug">
              ✦ {brew.recommendation_reason}
            </p>
          )}

          {/* Line 3: Key specs — ABV prominent, rest secondary */}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {brew.abv != null && (
              <span className="text-sm font-bold text-cyan-400">
                {Number(brew.abv).toFixed(1)}%
              </span>
            )}
            {brew.ebc != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: ebcColor }} />
                {colorLabel ?? `${Number(brew.ebc).toFixed(0)} EBC`}
              </span>
            )}
            {bitterLabel && (
              <span className="text-[11px] text-zinc-500">{bitterLabel}</span>
            )}
            {brew.original_gravity != null && (
              <span className="text-[11px] text-zinc-500">{Number(brew.original_gravity).toFixed(1)}°P</span>
            )}
          </div>

          {/* Line 4: age · complexity | icon stats group */}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {ageLabel && <span className="text-[10px] text-zinc-600">{ageLabel}</span>}
            {complexity && (
              <span className={`text-[10px] font-semibold ${COMPLEXITY[complexity].className}`}>
                {COMPLEXITY[complexity].label}
              </span>
            )}
            {/* Community stats — icon + number, grouped right */}
            <div className="flex items-center gap-2 ml-auto">
              {avgRating && (
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Star size={9} className="fill-yellow-400 stroke-yellow-400 flex-shrink-0" />{avgRating}
                </span>
              )}
              <button
                onClick={handleLike}
                className={`flex items-center gap-0.5 text-[10px] p-1.5 -m-1.5 hover:scale-150 transition-transform ${isLiked ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'}`}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart size={9} className={`flex-shrink-0 ${isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-zinc-500'}`} />
                {likeCount > 0 && likeCount}
              </button>
              {(brew.times_brewed ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Repeat size={9} className="stroke-zinc-500 flex-shrink-0" />{brew.times_brewed}
                </span>
              )}
              {(brew.view_count ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Eye size={9} className="stroke-zinc-500 flex-shrink-0" />{brew.view_count}
                </span>
              )}
            </div>
            {isAdmin && (
              <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-violet-500/20 border border-violet-500/40 text-violet-300">
                Q:{brew.quality_score ?? '?'}{brew.personalization_score != null ? ` · P:${brew.personalization_score.toFixed(2)}` : ''}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // editorial/story/default variants removed — use hero, portrait, compact, highlight

  // ─────────────────────────────────────────────────────────────────
  // HIGHLIGHT VARIANT — For "Trekker's Highlights". Text left, image right.
  // ─────────────────────────────────────────────────────────────────
  if (variant === 'highlight') {
    const ratingCount = brew.ratings?.length ?? 0;
    const timesBrewedCount = brew.times_brewed ?? 0;
    const likesCount = brew.likes_count ?? 0;
    const viewCount = brew.view_count ?? 0;

    // Stats als Icon-Chips (kein Text-Array mehr)
    const hasStats = ratingCount > 0 || likesCount > 0 || timesBrewedCount > 0 || viewCount > 0;

    // Build character line from real specs
    const charParts: string[] = [];
    if (brew.abv != null) charParts.push(`${Number(brew.abv).toFixed(1)}% Alkohol`);
    if (bitterLabel) charParts.push(bitterLabel);
    if (colorLabel) charParts.push(colorLabel.toLowerCase());

    return (
      <Link
        ref={cardRef}
        href={`/brew/${brew.id}`}
        className="group flex flex-col md:flex-row gap-6 items-center bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 md:p-6 hover:bg-zinc-900/80 transition-colors"
        onTouchEnd={handleCardTouchEnd}
        onClick={handleCardClick}
      >
        <div className="flex-1 flex flex-col gap-3 order-2 md:order-1">
          {/* Rating stars — only if real ratings exist */}
          {avgRating && ratingCount > 0 && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700 fill-zinc-700'}`} />
              ))}
              <span className="text-xs text-zinc-400 ml-1">{ratingCount} Bewertung{ratingCount !== 1 ? 'en' : ''}</span>
            </div>
          )}

          {/* Brewery */}
          <p className="text-sm text-zinc-400">
            {brew.brewery?.team_name || brew.brewery?.name || 'Community Brauer'}
            {brew.style ? ` · ${brew.style}` : ''}
          </p>

          <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
            {brew.name}
          </h3>

          {/* Real character description */}
          {charParts.length > 0 && (
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              {charParts.join(' · ')}
            </p>
          )}

          {/* Community stats — icon + number chips */}
          {hasStats && (
            <div className="flex items-center gap-3 flex-wrap">
              {avgRating && ratingCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Star size={13} className="fill-yellow-400 stroke-yellow-400 flex-shrink-0" />
                  <span>{avgRating} <span className="text-zinc-600">({ratingCount})</span></span>
                </span>
              )}
              {likesCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Heart size={13} className="stroke-zinc-400 flex-shrink-0" />{likesCount}
                </span>
              )}
              {timesBrewedCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Repeat size={13} className="stroke-zinc-400 flex-shrink-0" />{timesBrewedCount}
                </span>
              )}
              {viewCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Eye size={13} className="stroke-zinc-400 flex-shrink-0" />{viewCount}
                </span>
              )}
            </div>
          )}

          {/* Admin debug badge */}
          {isAdmin && (
            <span className="self-start text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/40 text-violet-300">
              Q:{brew.quality_score ?? '?'}{brew.personalization_score != null ? ` · P:${brew.personalization_score.toFixed(2)}` : ''}
            </span>
          )}

          {/* Like button */}
          <button
            onClick={handleLike}
            className="self-start flex items-center gap-1.5 mt-1 border border-zinc-700 hover:border-red-500/40 px-3 py-1.5 rounded-full transition-all group/like"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={14} className={`transition-colors ${isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-zinc-400 group-hover/like:stroke-red-400'}`} />
            <span className="text-xs text-zinc-400">{isLiked ? 'Geliked' : 'Liken'}</span>
          </button>
        </div>

        {/* Image — frameless, consistent with portrait style */}
        <div className="w-full md:w-[30%] aspect-square rounded-xl overflow-hidden flex-shrink-0 order-1 md:order-2">
          {brew.image_url ? (
            <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-4xl">🍺</span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // COMPACT VARIANT — Portrait style horizontally: image left, bare text right
  // Used for filter results, search grid
  // ─────────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <Link
        ref={cardRef}
        href={`/brew/${brew.id}`}
        className="group flex flex-row gap-3 transition-all duration-200"
        onTouchEnd={handleCardTouchEnd}
        onClick={handleCardClick}
      >
        {/* Image — square, rounded, fixed width */}
        <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
          {brew.image_url ? (
            <img
              src={brew.image_url}
              alt={brew.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-zinc-600 text-xl">🍺</span>
            </div>
          )}
          {/* Style badge on image */}
          {brew.style && (
            <span className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-bold px-1 py-0.5 rounded bg-black/70 text-white/90 truncate leading-none">
              {brew.style}
            </span>
          )}
        </div>

        {/* Info — bare text on page background, same hierarchy as portrait */}
        <div className="flex flex-col justify-center gap-0.5 min-w-0 flex-1">

          {/* Line 1: Brewery (small, muted) */}
          <p className="text-[11px] text-zinc-400 truncate leading-snug">
            {brew.brewery?.team_name || brew.brewery?.name || '\u00A0'}
          </p>

          {/* Line 2: Name — bold, prominent */}
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-1 group-hover:text-cyan-300 transition-colors">
            {brew.name}
          </h3>

          {/* Line 3: Key specs — ABV leads */}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {brew.abv != null && (
              <span className="text-sm font-bold text-cyan-400">
                {Number(brew.abv).toFixed(1)}%
              </span>
            )}
            {brew.ebc != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: ebcColor }} />
                {colorLabel ?? `${Number(brew.ebc).toFixed(0)} EBC`}
              </span>
            )}
            {bitterLabel && (
              <span className="text-[11px] text-zinc-500">{bitterLabel}</span>
            )}
          </div>

          {/* Line 4: specs left | interactive stats right */}
          <div className="flex items-center gap-2 mt-0.5">
            {avgRating && (
              <div className="flex items-center gap-0.5">
                <Star size={10} className="fill-yellow-400 stroke-yellow-400" />
                <span className="text-[11px] font-bold text-yellow-400">{avgRating}</span>
              </div>
            )}
            {ageLabel && <span className="text-[10px] text-zinc-600">{ageLabel}</span>}
            {complexity && (
              <span className={`text-[10px] font-semibold ${COMPLEXITY[complexity].className}`}>
                {COMPLEXITY[complexity].label}
              </span>
            )}
            {/* Community stats — Like (interactive) + times_brewed + views */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleLike}
                className={`flex items-center gap-0.5 text-[10px] p-1.5 -m-1.5 hover:scale-150 transition-transform ${isLiked ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'}`}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart size={9} className={`flex-shrink-0 ${isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-zinc-500'}`} />
                {likeCount > 0 && likeCount}
              </button>
              {(brew.times_brewed ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Repeat size={9} className="stroke-zinc-500 flex-shrink-0" />{brew.times_brewed}
                </span>
              )}
              {(brew.view_count ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Eye size={9} className="stroke-zinc-500 flex-shrink-0" />{brew.view_count}
                </span>
              )}
            </div>
            {isAdmin && (
              <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-violet-500/20 border border-violet-500/40 text-violet-300">
                Q:{brew.quality_score ?? '?'}{brew.personalization_score != null ? ` · P:${brew.personalization_score.toFixed(2)}` : ''}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default variant removed — use hero, portrait, compact or highlight
  return null;
}


