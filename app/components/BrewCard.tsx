'use client';

import Link from "next/link";
import LikeButton from "./LikeButton";
import { Star, Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface BrewData {
  id: string;
  name: string; // Changed from title to match your DB
  style: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  moderation_status?: 'pending' | 'approved' | 'rejected'; // Added
  
  // Joins
  ratings?: { rating: number }[] | null;
  // Note: user join structure depends on your query. 
  // Assuming simpler structure for now or passing props.
  
  // Likes
  likes?: { count: number }[]; // Aggregate from supabase often comes like this
  user_has_liked?: boolean;    // We might need to map this
}

interface BrewCardProps {
  brew: any; // Using any for flexibility during refactor, but preferably BrewData
  currentUserId?: string; // To check if liked if not pre-calculated
}

export default function BrewCard({ brew, currentUserId }: BrewCardProps) {
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

  return (
    <Link href={`/brew/${brew.id}`} className="group relative block h-full">
        <div className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all h-full flex flex-col ${isPending ? 'border-yellow-900/50' : 'border-zinc-800 hover:border-zinc-700'}`}>
            {/* Image */}
            <div className="aspect-[4/3] relative bg-zinc-950 overflow-hidden">
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

                {/* Overlay Badges (Only show if not rejected) */}
                {!isRejected && (
                    <div className="absolute top-2 right-2 flex gap-1">
                        {avgRating && (
                            <div className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                {avgRating}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                <div className="mb-auto">
                    <p className="text-xs text-zinc-500 font-bold tracking-wider mb-1 uppercase truncate">
                        {brew.style || 'Unbekannter Stil'}
                    </p>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {brew.name}
                    </h3>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-600">
                        {formatDistanceToNow(new Date(brew.created_at), { addSuffix: true, locale: de })}
                    </span>
                    
                    {/* Integrated Like Button - Stops propagation so clicking heart doesn't open card */}
                    <div onClick={(e) => e.preventDefault()}> 
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
