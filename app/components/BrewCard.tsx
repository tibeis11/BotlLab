"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LikeButton from "./LikeButton";
import { Star, Heart, Tag, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface BrewData {
    id: string;
    name: string;
    style: string | null;
    image_url: string | null;
    created_at: string;
    user_id: string;
    moderation_status?: 'pending' | 'approved' | 'rejected';
    ratings?: { rating: number }[] | null;
    likes?: { count: number }[];
    user_has_liked?: boolean;
    brewery?: { id: string; name: string; logo_url?: string } | null;
}

interface BrewCardProps {
    brew: any; // Using any for flexibility during refactor, but preferably BrewData
    currentUserId?: string; // To check if liked if not pre-calculated
    forceVertical?: boolean; // when true, render desktop (vertical) layout even on small screens
}

export default function BrewCard({ brew, currentUserId, forceVertical = false }: BrewCardProps) {
  // Calculate Avg Rating
  const ratings = brew.ratings || [];
  const avgRating = ratings.length > 0 
    ? Math.round((ratings.reduce((s:number, r:any) => s + r.rating, 0) / ratings.length) * 10) / 10
    : null;

  // Calculate Likes
  // Note: Depending on how we fetch (in Discover vs Favorites), data shape might vary.
  // For now, let's assume we pass enriched data OR handle defaults.
  // If use client fetching:
  const likeCount = brew.likes_count ?? (brew.likes ? brew.likes[0]?.count : 0);
  const isLiked = brew.user_has_liked ?? false; // This needs to be populated by the parent query

  const isPending = brew.moderation_status === 'pending';
  const isRejected = brew.moderation_status === 'rejected';

  // If rejected, usually we hide. BUT if it's a default image (safe), show it.
  const isDefaultImage = brew.image_url && (brew.image_url.startsWith('/default_label/') || brew.image_url.startsWith('/brand/'));
  const showImage = brew.image_url && (!isRejected || isDefaultImage);

    const router = useRouter();
        const contentRef = useRef<HTMLDivElement | null>(null);
        const [imageSize, setImageSize] = useState<number | null>(null);
        const [isDesktop, setIsDesktop] = useState<boolean>(false);

        useLayoutEffect(() => {
            if (forceVertical) return; // when forcing vertical layout, don't measure / control image size
            if (typeof window === 'undefined') return;
            const mq = window.matchMedia('(min-width: 768px)');
            const handleMq = () => {
                setIsDesktop(mq.matches);
            };
            handleMq();

            const el = contentRef.current;
            if (!el) return;

            const measure = () => {
                // only measure when not desktop (small screens)
                if (mq.matches) {
                    setImageSize(null);
                    return;
                }
                setImageSize(Math.round(el.getBoundingClientRect().height));
            };

            measure();
            let ro: ResizeObserver | null = null;
            if (typeof ResizeObserver !== 'undefined') {
                ro = new ResizeObserver(() => measure());
                ro.observe(el);
            }

            window.addEventListener('resize', measure);
            mq.addEventListener?.('change', handleMq);

            return () => {
                if (ro) ro.disconnect();
                window.removeEventListener('resize', measure);
                mq.removeEventListener?.('change', handleMq);
            };
        }, [forceVertical, brew.name, brew.style, brew.brewery, brew.ratings, brew.likes_count]);

        // When forcing vertical (used in horizontal scrollers), use a fixed card and label size
        const imageClass = forceVertical
            ? 'relative bg-zinc-950 overflow-hidden w-full aspect-square rounded-t-lg'
            : 'relative bg-zinc-950 overflow-hidden flex-shrink-0 md:w-full md:aspect-square md:h-auto';
        const imageStyle = forceVertical || isDesktop ? undefined : (imageSize ? { width: `${imageSize}px`, height: `${imageSize}px` } : { width: '120px', height: '120px' });

        const containerClass = forceVertical
            ? `bg-zinc-900 border rounded-2xl overflow-hidden transition-all flex flex-col items-stretch md:max-w-[340px] w-[280px] ${isPending ? 'border-yellow-900/50' : 'border-zinc-800 hover:border-cyan-600'}`
            : `bg-zinc-900 border rounded-2xl overflow-hidden transition-all flex flex-row md:flex-col items-stretch md:max-w-[340px] w-full ${isPending ? 'border-yellow-900/50' : 'border-zinc-800 hover:border-cyan-600'}`;

        return (
            <Link href={`/brew/${brew.id}`} className="group relative block">
                <div className={containerClass} style={{ minWidth: 0 }}>
                {/* Image & Top Tags */}
                                <div className={imageClass} style={imageStyle}>
                    {showImage ? (
                        <img 
                            src={brew.image_url} 
                            alt={brew.name} 
                            className={`w-full h-full object-cover transition-opacity ${isPending ? 'opacity-40 blur-sm' : 'opacity-80 group-hover:opacity-100'}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-800">
                            <span className="text-4xl opacity-20">🍺</span>
                        </div>
                    )}

                    {/* Moderation Overlays */}
                    {isPending && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/50 px-3 py-1.5 rounded-full flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-wider">
                                <Clock size={12} />
                                Prüfung
                            </div>
                        </div>
                    )}

                    {/* Top Left: Type Tag (desktop or forced-vertical) */}
                    <div className={forceVertical ? 'absolute top-2 left-2 flex gap-1' : 'hidden md:flex absolute top-2 left-2 flex gap-1'}>
                        <span className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            {brew.style || 'Unbekannter Stil'}
                        </span>
                    </div>

                    {/* Top Right: Rating (desktop or forced-vertical) */}
                    {!isRejected && avgRating && (
                        <div className={forceVertical ? 'absolute top-2 right-2 flex gap-1' : 'hidden md:flex absolute top-2 right-2 flex gap-1'}>
                            <div className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                {avgRating}
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div ref={contentRef} className="p-3 flex flex-col flex-1 min-w-0">
                    {/* Small-screen badges: style + rating, moved to content for space */}
                    {!forceVertical && (
                      <div className="flex items-center justify-between mb-2 md:hidden">
                        <span className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            {brew.style || 'Unbekannter Stil'}
                        </span>
                        {!isRejected && avgRating && (
                            <div className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                <Star size={12} className="fill-yellow-500 text-yellow-500" />
                                {avgRating}
                            </div>
                        )}
                      </div>
                    )}

                    <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2 mb-1">
                        {brew.name}
                    </h3>

                    {/* Brewery Team Info unter dem Namen, dezent */}
                    {brew.brewery && (
                        <button
                            type="button"
                            className="flex items-center gap-2 text-xs text-zinc-400 font-medium mb-2 hover:text-cyan-400 transition bg-transparent border-none p-0 cursor-pointer"
                            onClick={e => {
                                e.stopPropagation();
                                router.push(`/brewery/${brew.brewery.id}`);
                            }}
                        >
                            {brew.brewery.logo_url ? (
                                <img src={brew.brewery.logo_url} alt={brew.brewery.name} className="w-4 h-4 rounded-full border border-zinc-700 object-cover" />
                            ) : (
                                <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[11px]">🏭</span>
                            )}
                            <span className="truncate max-w-[90px]">{brew.brewery.team_name || brew.brewery.name}</span>
                        </button>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
                        <span className="text-xs text-zinc-600">
                            {brew.created_at && !isNaN(new Date(brew.created_at).getTime())
                                ? formatDistanceToNow(new Date(brew.created_at), { addSuffix: true, locale: de })
                                : "-"}
                        </span>
                        <div className="flex items-center gap-2">
                            {/* LikeButton wieder klickbar */}
                            <LikeButton 
                                brewId={brew.id} 
                                initialCount={likeCount} 
                                initialIsLiked={isLiked} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
  );
}
