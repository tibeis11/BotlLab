"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LikeButton from "./LikeButton";
import { Star, Clock, Copy, Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { ebcToHex } from "@/lib/brewing-calculations";
import { useSupabase } from "@/lib/hooks/useSupabase";

interface BrewData {
    id: string;
    name: string;
    style: string | null;
    image_url: string | null;
    created_at: string;
    user_id: string;
    abv?: number;
    ibu?: number;
    ebc?: number;
    original_gravity?: number;
    moderation_status?: 'pending' | 'approved' | 'rejected';
    ratings?: { rating: number }[] | null;
    likes?: { count: number }[];
    likes_count?: number; // Add this if it comes from some queries
    user_has_liked?: boolean;
    brewery?: { id?: string; name: string; team_name?: string; logo_url?: string | null } | null;
    brew_type?: string | null;
    mash_method?: string | null;
    fermentation_type?: string | null;
    copy_count?: number;
    quality_score?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

interface BrewCardProps {
    brew: BrewData;
    currentUserId?: string;
    forceVertical?: boolean;
    isAdmin?: boolean;
}

export default function BrewCard({ brew, currentUserId, forceVertical = false, isAdmin = false }: BrewCardProps) {
    const router = useRouter();
    const supabase = useSupabase();

    // Data Preparation
    const ratings = brew.ratings || [];
    const avgRating = ratings.length > 0 
        ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
        : null;

    const likeCount = brew.likes_count ?? (brew.likes?.[0]?.count ?? 0);
    const isLiked = brew.user_has_liked ?? false;

    // Complexity Badge — derived entirely from brew.data (already fetched)
    const maltCount = Array.isArray(brew.data?.malts) ? brew.data.malts.length : 0;
    const hopCount = Array.isArray(brew.data?.hops) ? brew.data.hops.length : 0;
    const mashStepCount = Array.isArray(brew.data?.mash_steps) ? brew.data.mash_steps.length : 1;
    // Only show badge when we have enough ingredient data to make a judgment
    const complexity: 'simple' | 'intermediate' | 'complex' | null =
        maltCount === 0 && hopCount === 0 ? null :
        (maltCount > 6 || mashStepCount >= 3) ? 'complex' :
        (maltCount >= 4 || hopCount >= 3 || mashStepCount >= 2) ? 'intermediate' :
        'simple';
    const COMPLEXITY = {
        simple:       { label: '● Einsteiger',      className: 'text-green-400' },
        intermediate: { label: '●● Fortgeschritten', className: 'text-yellow-400' },
        complex:      { label: '●●● Experte',        className: 'text-orange-400' },
    } as const;

    // Copy-CTA State
    const [copyMenuPos, setCopyMenuPos] = useState<{ top: number; right: number } | null>(null);
    const [copyBreweries, setCopyBreweries] = useState<{ id: string; name: string }[]>([]);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const copyBtnRef = useRef<HTMLButtonElement>(null);

    // Close copy menu on scroll or resize
    useEffect(() => {
        if (!copyMenuPos) return;
        const close = () => setCopyMenuPos(null);
        window.addEventListener('scroll', close, { passive: true });
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close);
            window.removeEventListener('resize', close);
        };
    }, [copyMenuPos]);

    const handleCopyClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUserId) return;
        const rect = copyBtnRef.current?.getBoundingClientRect();
        if (!rect) return;
        // Toggle: close if already open
        if (copyMenuPos) { setCopyMenuPos(null); return; }
        setCopyMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        // Lazy-load breweries on first open
        if (copyBreweries.length === 0) {
            setCopyStatus('loading');
            const { data } = await supabase
                .from('brewery_members')
                .select('breweries(id, name)')
                .eq('user_id', currentUserId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const list = (data || []).map((m: any) => m.breweries).filter(Boolean) as { id: string; name: string }[];
            setCopyBreweries(list);
            setCopyStatus('idle');
        }
    };

    const handleCopyToBrewery = async (e: React.MouseEvent, breweryId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUserId) return;
        setCopyStatus('loading');
        const { error } = await supabase.from('brews').insert([{
            name: `${brew.name} (Remix)`,
            style: brew.style || '',
            brew_type: brew.brew_type || 'beer',
            data: brew.data || {},
            image_url: brew.image_url || null,
            is_public: false,
            user_id: currentUserId,
            brewery_id: breweryId,
            remix_parent_id: brew.id,
        }]);
        setCopyStatus(error ? 'error' : 'done');
        if (!error) {
            setTimeout(() => { setCopyMenuPos(null); setCopyStatus('idle'); }, 1500);
        }
    };

    const isPending = brew.moderation_status === 'pending';
    const isRejected = brew.moderation_status === 'rejected';
    
    // Show image logic
    const isDefaultImage = brew.image_url && (brew.image_url.startsWith('/default_label/') || brew.image_url.startsWith('/brand/'));
    const showImage = brew.image_url && (!isRejected || isDefaultImage);

    // Event Handlers for nested interactables to prevent navigation
    const handleBreweryClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (brew.brewery?.id) {
            router.push(`/brewery/${brew.brewery.id}`);
        }
    };

    return (
        <>
        <Link href={`/brew/${brew.id}`} className="group relative block bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden transition-all hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-900/20 w-full sm:max-w-sm h-80 transform-gpu">
            {/* Background Image */}
            {showImage && (
                <img 
                    src={brew.image_url!} 
                    alt={brew.name} 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 rounded-2xl ${isPending ? 'opacity-40 blur-md' : 'opacity-60 group-hover:opacity-70 group-hover:scale-105'}`}
                />
            )}
            
            {/* Blur & Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_top,black_40%,transparent_100%)] rounded-2xl" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col justify-between h-full p-4 text-white">
                {/* Top Section: Badges & Moderation */}
                <div>
                    <div className="flex justify-between items-start">
                        <span className="bg-black/50 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                            {brew.style || 'Unbekannt'}
                        </span>
                        <div className="flex flex-col items-end gap-1.5">
                            {!isRejected && avgRating && (
                                <div className="bg-black/50 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                    {avgRating.toFixed(1)} · {ratings.length}×
                                </div>
                            )}
                            {!isRejected && ratings.length === 0 && (
                                <span className="bg-black/40 backdrop-blur text-zinc-500 text-xs px-3 py-1 rounded-full">
                                    Noch keine Bewertung
                                </span>
                            )}
                            {!isRejected && ratings.length >= 5 && avgRating !== null && avgRating >= 4.0 && (
                                <span className="bg-emerald-500/20 backdrop-blur text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                                    ✓ Bewährt
                                </span>
                            )}
                        </div>
                    </div>
                    {isPending && (
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/50 px-3 py-1.5 rounded-full flex items-center gap-2 text-yellow-500 text-sm font-bold uppercase tracking-wider">
                                <Clock size={14} />
                                In Prüfung
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Section: Info, Stats & Footer */}
                <div className="text-left">
                    {/* Title & Brewery */}
                    <div>
                        <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-tight">
                            {brew.name}
                        </h3>
                        {brew.brewery && (
                            <div 
                                onClick={handleBreweryClick}
                                className="inline-flex items-center gap-2 text-sm text-zinc-300 font-medium mt-1 hover:text-cyan-300 transition cursor-pointer"
                            >
                                {brew.brewery.logo_url ? (
                                    <img src={brew.brewery.logo_url} alt={brew.brewery.name} className="w-5 h-5 rounded-full border border-zinc-700 object-cover" />
                                ) : (
                                    <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">🏭</span>
                                )}
                                <span className="truncate max-w-[200px]">{brew.brewery.team_name || brew.brewery.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                        <StatBox 
                            value={brew.ebc != null ? Number(brew.ebc).toFixed(1) : '-'} 
                            unit="EBC"
                            colorValue={brew.ebc != null ? ebcToHex(Number(brew.ebc)) : undefined}
                        />
                        <StatBox 
                            value={brew.original_gravity != null ? Number(brew.original_gravity).toFixed(1) : '-'} 
                            unit="°P" 
                        />
                        <StatBox 
                            value={brew.ibu != null ? Number(brew.ibu).toFixed(0) : '-'} 
                            unit="IBU" 
                        />
                        <StatBox 
                            value={brew.abv != null ? Number(brew.abv).toFixed(1) : '-'} 
                            unit="%" 
                            highlight
                        />
                    </div>

                    {/* Kurztext: lesbare Zusammenfassung für Einsteiger */}
                    {(brew.ebc != null || brew.ibu != null || brew.abv != null) && (
                      <p className="text-[11px] text-zinc-500 mt-2 leading-snug">
                        {[
                          brew.ebc != null ? (Number(brew.ebc) < 10 ? 'Sehr hell' : Number(brew.ebc) < 20 ? 'Hell' : Number(brew.ebc) < 40 ? 'Bernstein' : Number(brew.ebc) < 70 ? 'Dunkel' : 'Sehr dunkel') : null,
                          brew.ibu != null ? (Number(brew.ibu) < 15 ? 'mild' : Number(brew.ibu) < 30 ? 'ausgewogen' : Number(brew.ibu) < 50 ? 'hopfig' : 'sehr hopfig') : null,
                          brew.abv != null ? `${Number(brew.abv).toFixed(1)} % Alk.` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {/* Footer: Date, Complexity, Copy & Like */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-zinc-400 truncate">
                                {brew.created_at && !isNaN(new Date(brew.created_at).getTime())
                                    ? formatDistanceToNow(new Date(brew.created_at), { addSuffix: true, locale: de })
                                    : "-"}
                            </span>
                            {complexity && (
                                <span className={`text-[10px] font-bold tracking-wide flex-shrink-0 ${COMPLEXITY[complexity].className}`}>
                                    {COMPLEXITY[complexity].label}
                                </span>
                            )}
                            {(brew.copy_count ?? 0) > 0 && (
                                <span className="text-[10px] text-zinc-500 flex-shrink-0">
                                    🔁 {brew.copy_count}×
                                </span>
                            )}
                            {isAdmin && (
                                <span
                                    title="Quality Score (nur für Admins sichtbar)"
                                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 bg-violet-500/20 border border-violet-500/40 text-violet-300"
                                >
                                    Q:{brew.quality_score ?? '?'}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            {/* Copy-CTA: always visible on mobile, hover-only on desktop */}
                            {currentUserId && (
                                <button
                                    ref={copyBtnRef}
                                    onClick={handleCopyClick}
                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/30 text-zinc-400 hover:text-white hover:bg-zinc-700/60 flex-shrink-0"
                                    aria-label="In Brauerei kopieren"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            )}
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

        {/* Portal: Copy-to-Brewery dropdown, rendered at document.body to escape overflow-hidden */}
        {copyMenuPos && createPortal(
            <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setCopyMenuPos(null)} />
                <div
                    className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 min-w-[200px]"
                    style={{ top: copyMenuPos.top, right: copyMenuPos.right }}
                >
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider px-2 pb-2">
                        In Brauerei kopieren
                    </p>

                    {copyStatus === 'loading' && (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-zinc-400 text-sm">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Laden…
                        </div>
                    )}

                    {copyStatus === 'done' && (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-emerald-400 text-sm">
                            <Check className="w-3.5 h-3.5" /> Kopiert!
                        </div>
                    )}

                    {copyStatus === 'error' && (
                        <div className="px-2 py-1.5 text-red-400 text-sm">
                            Fehler beim Kopieren
                        </div>
                    )}

                    {copyStatus === 'idle' && copyBreweries.map(b => (
                        <button
                            key={b.id}
                            onClick={(e) => handleCopyToBrewery(e, b.id)}
                            className="w-full text-left text-sm text-zinc-200 hover:text-white hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors"
                        >
                            {b.name}
                        </button>
                    ))}

                    {copyStatus === 'idle' && copyBreweries.length === 0 && (
                        <p className="text-xs text-zinc-500 px-2 py-1.5">
                            Keine Brauereien gefunden
                        </p>
                    )}
                </div>
            </>,
            document.body
        )}
        </>
    );
}

// Helper component for stats
const StatBox = ({ value, unit, colorValue, highlight = false }: { 
    value: React.ReactNode;
    unit: string;
    colorValue?: string;
    highlight?: boolean;
}) => (
    <div className={`bg-black/30 rounded-xl p-2 backdrop-blur-sm border ${highlight ? 'border-cyan-500/20' : 'border-white/10'} flex flex-col justify-center text-center h-full`}>
        <div className="flex items-center justify-center gap-1.5">
            <p 
                className={`text-xl font-bold tracking-tight ${highlight ? 'text-cyan-400' : 'text-white'}`}
                style={colorValue ? { color: colorValue } : {}}
            >
                {value}
            </p>
        </div>
        <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">{unit}</p>
    </div>
);
