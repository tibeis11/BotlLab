"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LikeButton from "./LikeButton";
import { Star, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { ebcToHex } from "@/lib/brewing-calculations";

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
}

interface BrewCardProps {
    brew: BrewData;
    currentUserId?: string;
    forceVertical?: boolean;
}

export default function BrewCard({ brew, currentUserId, forceVertical = false }: BrewCardProps) {
    const router = useRouter();

    // Data Preparation
    const ratings = brew.ratings || [];
    const avgRating = ratings.length > 0 
        ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
        : null;

    const likeCount = brew.likes_count ?? (brew.likes?.[0]?.count ?? 0);
    const isLiked = brew.user_has_liked ?? false;

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
        <Link href={`/brew/${brew.id}`} className="group relative block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-900/20 w-full sm:max-w-sm h-80">
            {/* Background Image */}
            {showImage && (
                <img 
                    src={brew.image_url!} 
                    alt={brew.name} 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isPending ? 'opacity-30 blur-md' : 'opacity-40 group-hover:opacity-50 group-hover:scale-105'}`}
                />
            )}
            
            {/* Blur & Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_top,black_50%,transparent_100%)]" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col justify-between h-full p-4 text-white">
                {/* Top Section: Badges & Moderation */}
                <div>
                    <div className="flex justify-between items-start">
                        <span className="bg-black/50 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                            {brew.style || 'Unbekannt'}
                        </span>
                        {!isRejected && avgRating && (
                            <div className="bg-black/50 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                {avgRating.toFixed(1)}
                            </div>
                        )}
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
                            value={brew.ebc?.toFixed(1) ?? '-'} 
                            unit="EBC"
                            colorValue={brew.ebc ? ebcToHex(brew.ebc) : undefined}
                        />
                        <StatBox 
                            value={brew.original_gravity?.toFixed(1) ?? '-'} 
                            unit="°P" 
                        />
                        <StatBox 
                            value={brew.ibu?.toFixed(0) ?? '-'} 
                            unit="IBU" 
                        />
                        <StatBox 
                            value={brew.abv?.toFixed(1) ?? '-'} 
                            unit="%" 
                            highlight
                        />
                    </div>

                    {/* Footer: Date & Like */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
                        <span className="text-xs text-zinc-400 truncate">
                            {brew.created_at && !isNaN(new Date(brew.created_at).getTime())
                                ? formatDistanceToNow(new Date(brew.created_at), { addSuffix: true, locale: de })
                                : "-"}
                        </span>
                        
                        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
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

// Helper component for stats
const StatBox = ({ value, unit, colorValue, highlight = false }: { 
    value: React.ReactNode;
    unit: string;
    colorValue?: string;
    highlight?: boolean;
}) => (
    <div className={`bg-black/30 rounded-xl p-2 backdrop-blur-sm border ${highlight ? 'border-cyan-500/20' : 'border-white/10'} flex flex-col justify-center text-center h-full`}>
        <div className="flex items-center justify-center gap-1.5">
            {colorValue && (
                <div className="w-2.5 h-2.5 rounded-full border border-black/50 shadow-sm" style={{ backgroundColor: colorValue }} />
            )}
            <p className={`text-xl font-bold tracking-tight ${highlight ? 'text-cyan-400' : 'text-white'}`}>
                {value}
            </p>
        </div>
        <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">{unit}</p>
    </div>
);
