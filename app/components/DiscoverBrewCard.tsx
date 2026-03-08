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
  trending_score?: number;
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
  /** Centralised like state from parent — when provided, isLiked is derived from this Set */
  likedBrewIds?: Set<string>;
  /** Callback to parent — parent handles API call + optimistic Set update */
  onLikeToggle?: (brewId: string) => void;
}

export default function DiscoverBrewCard({ brew, currentUserId, isAdmin = false, variant = 'portrait', rank, likedBrewIds, onLikeToggle }: Props) {
  const [localIsLiked, setLocalIsLiked] = useState(brew.user_has_liked ?? false);
  const [likeCount, setLikeCount] = useState(brew.likes_count ?? 0);

  // Sync whenever parent supplies updated user data (async load after mount)
  useEffect(() => { setLocalIsLiked(brew.user_has_liked ?? false); }, [brew.user_has_liked]);
  useEffect(() => { setLikeCount(brew.likes_count ?? 0); }, [brew.likes_count]);

  // Controlled mode: isLiked comes from parent Set. Uncontrolled: local state.
  const isLiked = likedBrewIds ? likedBrewIds.has(brew.id) : localIsLiked;

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
    const prevCount = likeCount;
    setLikeCount(isLiked ? prevCount - 1 : prevCount + 1);
    if (onLikeToggle) {
      // Controlled mode: parent owns API call + Set state
      onLikeToggle(brew.id);
    } else {
      // Standalone mode: card manages its own state
      const prev = localIsLiked;
      setLocalIsLiked(!prev);
      try {
        await toggleBrewLike(brew.id);
      } catch {
        setLocalIsLiked(prev);
        setLikeCount(prevCount);
      }
    }
  };

  // ── Double-tap to like (mobile) ──────────────────────────────────
  const lastTapRef = useRef<number>(0);
  const suppressNextClickRef = useRef<boolean>(false);

  const handleCardTouchEnd = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && currentUserId) {
      suppressNextClickRef.current = true;
      setLikeCount(c => isLiked ? c - 1 : c + 1);
      if (onLikeToggle) {
        onLikeToggle(brew.id);
      } else {
        const prev = localIsLiked;
        setLocalIsLiked(!prev);
        toggleBrewLike(brew.id).catch(() => {
          setLocalIsLiked(prev);
          setLikeCount(c => isLiked ? c + 1 : c - 1);
        });
      }
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
        className="group relative flex flex-col h-full rounded-2xl overflow-hidden border border-border hover:border-border-active transition-all duration-300"
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
            <div className="w-full h-full bg-gradient-to-br from-orange-950 via-surface-hover to-surface" />
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

          {/* Row 3: Stats — raw numeric values */}
          <div className="flex items-center gap-3 flex-wrap">
            {brew.abv != null && (
              <span className="text-sm font-black text-cyan-300 drop-shadow-md">
                {Number(brew.abv).toFixed(1)}%
              </span>
            )}
            {brew.ebc != null && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 drop-shadow-md">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: ebcColor }} />
                {Number(brew.ebc).toFixed(0)} EBC
              </span>
            )}
            {brew.ibu != null && (
              <span className="text-xs font-semibold text-zinc-400 drop-shadow-md">
                {Number(brew.ibu).toFixed(0)} IBU
              </span>
            )}
            {brew.original_gravity != null && (
              <span className="text-xs font-semibold text-zinc-400 drop-shadow-md">
                {Number(brew.original_gravity).toFixed(1)}°P
              </span>
            )}
          </div>

          {/* Row 4: age | icon stats group */}
          <div className="flex items-center gap-2 flex-wrap">
            {ageLabel && <span className="text-xs text-zinc-500 drop-shadow-md">{ageLabel}</span>}
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
          </div>
          {/* Admin scores row — hero */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">Q: {brew.quality_score ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">T: {brew.trending_score?.toFixed(1) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">P: {brew.personalization_score?.toFixed(2) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300 truncate max-w-full">R: {brew.recommendation_reason ?? '—'}</span>
            </div>
          )}
        </div>
      </Link>
    );
  }
  // PORTRAIT VARIANT — image on top, stats strip below image (no overlay),
  // both wrapped in rounded-xl. Like button overlays image top-right.
  // ─────────────────────────────────────────────────────────────────
  if (variant === 'portrait') {
    const hasStats = brew.abv != null || brew.ebc != null || brew.ibu != null || brew.original_gravity != null;
    return (
      <Link
        ref={cardRef}
        href={`/brew/${brew.id}`}
        className="group flex flex-col gap-2 transition-all duration-200"
        onTouchEnd={handleCardTouchEnd}
        onClick={handleCardClick}
      >
        {/* ── Image + Stats wrapper — shared rounded corners ── */}
        <div className={`relative w-full flex-shrink-0 overflow-hidden ${hasStats ? 'rounded-xl' : 'rounded-xl'}`}>

          {/* Image — overflow-hidden clips scale zoom */}
          <div className="relative w-full aspect-square overflow-hidden">
            {brew.image_url ? (
              <img
                src={brew.image_url}
                alt={brew.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-surface-hover to-surface" />
            )}

            {/* Style badge — top left */}
            {brew.style && (
              <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white/90 border border-white/10 z-10 truncate max-w-[60%]">
                {brew.style}
              </span>
            )}

            {/* Like button — top right (only when logged in) */}
            {currentUserId && (
              <button
                onClick={handleLike}
                className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-200 ${
                  isLiked
                    ? 'bg-red-500/90 border-red-400/40 shadow-md shadow-red-900/40'
                    : 'bg-black/50 border-white/10 hover:bg-black/70'
                }`}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart size={13} className={isLiked ? 'fill-white stroke-white' : 'stroke-white/70'} />
              </button>
            )}
          </div>

          {/* Stats strip — sits directly below image, same width, no overlap */}
          {hasStats && (
            <div className="flex items-center justify-around py-2.5 bg-surface-hover border-t border-border">
              {brew.abv != null && (
                <span className="flex flex-col items-center leading-none min-w-0">
                  <span className="text-[13px] font-black text-text-primary tabular-nums">{Number(brew.abv).toFixed(1)}</span>
                  <span className="text-[9px] text-text-muted mt-0.5">%</span>
                </span>
              )}
              {brew.ebc != null && (
                <span className="flex flex-col items-center leading-none min-w-0">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-border" style={{ backgroundColor: ebcColor }} />
                    <span className="text-[13px] font-black text-text-primary tabular-nums">{Number(brew.ebc).toFixed(0)}</span>
                  </span>
                  <span className="text-[9px] text-text-muted mt-0.5">EBC</span>
                </span>
              )}
              {brew.ibu != null && (
                <span className="flex flex-col items-center leading-none min-w-0">
                  <span className="text-[13px] font-black text-text-primary tabular-nums">{Number(brew.ibu).toFixed(0)}</span>
                  <span className="text-[9px] text-text-muted mt-0.5">IBU</span>
                </span>
              )}
              {brew.original_gravity != null && (
                <span className="flex flex-col items-center leading-none min-w-0">
                  <span className="text-[13px] font-black text-text-primary tabular-nums">{Number(brew.original_gravity).toFixed(1)}</span>
                  <span className="text-[9px] text-text-muted mt-0.5">°P</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Text area — minimal ── */}
        <div className="flex flex-col gap-0.5 px-0.5">
          <p className="text-[11px] text-text-secondary truncate leading-snug">
            {brew.brewery?.team_name || brew.brewery?.name || '\u00A0'}
          </p>
          <h3 className="font-bold text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-brand-hover transition-colors">
            {brew.name}
          </h3>
          {brew.recommendation_reason && (
            <p className="text-[10px] text-brand/70 truncate leading-snug">✦ {brew.recommendation_reason}</p>
          )}
          {/* Age + community stats — single line, no wrap */}
          <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
            {ageLabel && <span className="text-[10px] text-text-disabled shrink truncate min-w-0">{ageLabel}</span>}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {avgRating && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Star size={9} className="fill-yellow-400 stroke-yellow-400 flex-shrink-0" />{avgRating}
                </span>
              )}
              {likeCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Heart size={9} className="fill-red-500 stroke-red-500 flex-shrink-0" />{likeCount}
                </span>
              )}
              {(brew.times_brewed ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Repeat size={9} className="stroke-text-muted flex-shrink-0" />{brew.times_brewed}
                </span>
              )}
              {(brew.view_count ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Eye size={9} className="stroke-text-muted flex-shrink-0" />{brew.view_count}
                </span>
              )}
            </div>
          </div>
          {/* Admin scores row — portrait */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1 pt-0.5 px-0.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">Q: {brew.quality_score ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">T: {brew.trending_score?.toFixed(1) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">P: {brew.personalization_score?.toFixed(2) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300 truncate max-w-full">R: {brew.recommendation_reason ?? '—'}</span>
            </div>
          )}
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
    if (brew.abv != null) charParts.push(`${Number(brew.abv).toFixed(1)}%`);
    if (brew.ibu != null) charParts.push(`${Number(brew.ibu).toFixed(0)} IBU`);
    if (brew.ebc != null) charParts.push(`${Number(brew.ebc).toFixed(0)} EBC`);
    if (brew.original_gravity != null) charParts.push(`${Number(brew.original_gravity).toFixed(1)}°P`);

    return (
      <Link
        ref={cardRef}
        href={`/brew/${brew.id}`}
        className="group flex flex-col md:flex-row gap-6 items-center bg-surface/40 border border-border rounded-2xl p-5 md:p-6 hover:bg-surface/80 transition-colors"
        onTouchEnd={handleCardTouchEnd}
        onClick={handleCardClick}
      >
        <div className="flex-1 flex flex-col gap-3 order-2 md:order-1">
          {/* Rating stars — only if real ratings exist */}
          {avgRating && ratingCount > 0 && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-border fill-border'}`} />
              ))}
              <span className="text-xs text-text-secondary ml-1">{ratingCount} Bewertung{ratingCount !== 1 ? 'en' : ''}</span>
            </div>
          )}

          {/* Brewery */}
          <p className="text-sm text-text-secondary">
            {brew.brewery?.team_name || brew.brewery?.name || 'Community Brauer'}
            {brew.style ? ` · ${brew.style}` : ''}
          </p>

          <h3 className="text-xl md:text-2xl font-black text-text-primary group-hover:text-brand-hover transition-colors leading-tight">
            {brew.name}
          </h3>

          {/* Real character description */}
          {charParts.length > 0 && (
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              {charParts.join(' · ')}
            </p>
          )}

          {/* Community stats — icon + number chips */}
          {hasStats && (
            <div className="flex items-center gap-3 flex-wrap">
              {avgRating && ratingCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Star size={13} className="fill-yellow-400 stroke-yellow-400 flex-shrink-0" />
                  <span>{avgRating} <span className="text-text-disabled">({ratingCount})</span></span>
                </span>
              )}
              {likesCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Heart size={13} className="stroke-text-secondary flex-shrink-0" />{likesCount}
                </span>
              )}
              {timesBrewedCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Repeat size={13} className="stroke-text-secondary flex-shrink-0" />{timesBrewedCount}
                </span>
              )}
              {viewCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Eye size={13} className="stroke-text-secondary flex-shrink-0" />{viewCount}
                </span>
              )}
            </div>
          )}

          {/* Admin scores row — highlight */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">Q: {brew.quality_score ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">T: {brew.trending_score?.toFixed(1) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">P: {brew.personalization_score?.toFixed(2) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300 truncate max-w-full">R: {brew.recommendation_reason ?? '—'}</span>
            </div>
          )}

          {/* Like button */}
          <button
            onClick={handleLike}
            className="self-start flex items-center gap-1.5 mt-1 border border-border hover:border-red-500/40 px-3 py-1.5 rounded-full transition-all group/like"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={14} className={`transition-colors ${isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-text-disabled group-hover/like:stroke-red-400'}`} />
            <span className="text-xs text-text-secondary">{isLiked ? 'Geliked' : 'Liken'}</span>
          </button>
        </div>

        {/* Image — frameless, consistent with portrait style */}
        <div className="w-full md:w-[30%] aspect-square rounded-xl overflow-hidden flex-shrink-0 order-1 md:order-2">
          {brew.image_url ? (
            <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface-hover to-surface flex items-center justify-center">
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
        className="group flex flex-row items-center gap-3 transition-all duration-200"
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
            <div className="absolute inset-0 bg-gradient-to-br from-surface-hover to-surface flex items-center justify-center">
              <span className="text-text-disabled text-xl">🍺</span>
            </div>
          )}
          {/* Style badge on image */}
          {brew.style && (
            <span className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-bold px-1 py-0.5 rounded bg-black/70 text-white/90 truncate leading-none">
              {brew.style}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center gap-0.5 min-w-0 flex-1">

          {/* Line 1: Brewery */}
          <p className="text-[11px] text-text-secondary truncate leading-snug">
            {brew.brewery?.team_name || brew.brewery?.name || '\u00A0'}
          </p>

          {/* Line 2: Name */}
          <h3 className="font-bold text-text-primary text-sm leading-snug line-clamp-1 group-hover:text-brand-hover transition-colors">
            {brew.name}
          </h3>

          {/* Line 3: Key specs */}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {brew.abv != null && (
              <span className="text-sm font-bold text-brand-hover">
                {Number(brew.abv).toFixed(1)}%
              </span>
            )}
            {brew.ebc != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                <span className="w-2 h-2 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: ebcColor }} />
                {Number(brew.ebc).toFixed(0)} EBC
              </span>
            )}
            {brew.ibu != null && (
              <span className="text-[11px] text-text-muted">{Number(brew.ibu).toFixed(0)} IBU</span>
            )}
            {brew.original_gravity != null && (
              <span className="text-[11px] text-text-muted">{Number(brew.original_gravity).toFixed(1)}°P</span>
            )}
          </div>

          {/* Line 4: age + rating + community stats — all in one row */}
          <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
            {ageLabel && <span className="text-[10px] text-text-disabled shrink truncate min-w-0">{ageLabel}</span>}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {avgRating && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Star size={9} className="fill-yellow-400 stroke-yellow-400 flex-shrink-0" />{avgRating}
                </span>
              )}
              {likeCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Heart size={9} className="fill-red-500 stroke-red-500 flex-shrink-0" />{likeCount}
                </span>
              )}
              {(brew.times_brewed ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Repeat size={9} className="stroke-text-muted flex-shrink-0" />{brew.times_brewed}
                </span>
              )}
              {(brew.view_count ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Eye size={9} className="stroke-text-muted flex-shrink-0" />{brew.view_count}
                </span>
              )}
            </div>
          </div>
          {/* Admin scores row — compact */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">Q: {brew.quality_score ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">T: {brew.trending_score?.toFixed(1) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300">P: {brew.personalization_score?.toFixed(2) ?? '—'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/40 text-violet-300 truncate max-w-full">R: {brew.recommendation_reason ?? '—'}</span>
            </div>
          )}
        </div>

        {/* Like button — right side, only when logged in */}
        {currentUserId && (
          <button
            onClick={handleLike}
            className="flex-shrink-0 p-2 -mr-1 transition-transform hover:scale-125"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={18} className={isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-text-disabled'} />
          </button>
        )}
      </Link>
    );
  }

  // Default variant removed — use hero, portrait, compact or highlight
  return null;
}


