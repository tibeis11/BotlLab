'use client'

import { toggleBrewLike } from "@/lib/actions/like-actions";
import { Heart } from "lucide-react";
import { useState } from "react";

interface LikeButtonProps {
  brewId: string;
  initialIsLiked: boolean;
  initialCount: number;
  className?: string; 
  mode?: 'default' | 'card'; // Neuer Modus
}

export default function LikeButton({ brewId, initialIsLiked, initialCount, className, mode = 'default' }: LikeButtonProps) {
  
  // Use local state for immediate feedback that persists until reload
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [count, setCount] = useState(initialCount);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();

    // Optimistic Update: sofort anwenden
    const previousIsLiked = isLiked;
    const previousCount = count;
    
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setCount(newIsLiked ? count + 1 : count - 1);

    try {
      // Server Action im Hintergrund
      await toggleBrewLike(brewId);
    } catch (error) {
       console.error("Like failed:", error);
       // Rollback bei Fehler
       setIsLiked(previousIsLiked);
       setCount(previousCount);
    }
  };

  if (mode === 'card') {
      return (
        <button 
            onClick={handleToggle}
            className={`flex flex-col justify-center text-left ${className} group transition-all active:scale-95`}
            title={isLiked ? "Gefällt mir entfernen" : "Gefällt mir"}
        >
            <div className={`text-[10px] uppercase font-bold mb-1 tracking-wider transition-colors ${isLiked ? 'text-red-500' : 'text-zinc-500 group-hover:text-red-400'}`}>
                Gefällt mir
            </div>
            <div className={`font-black text-3xl flex items-center gap-2 text-white`}>
                {count}
                <Heart 
                    size={24} 
                    className={`transition-all duration-300 ${isLiked ? "fill-red-500 stroke-red-500 scale-110" : "stroke-zinc-700 group-hover:stroke-red-500 group-hover:scale-110"}`} 
                    strokeWidth={isLiked ? 0 : 2}
                />
            </div>
        </button>
      );
  }

  return (
    <button 
      onClick={handleToggle}
      className={`flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 group ${className}`}
      title={isLiked ? "Unlike" : "Like"}
    >
      <Heart 
        size={20} 
        className={`transition-colors duration-300 ${isLiked ? "fill-red-500 stroke-red-500" : "stroke-zinc-500 group-hover:stroke-zinc-300"}`} 
      />
      <span className="text-sm font-medium tabular-nums text-zinc-400 group-hover:text-zinc-200">
        {count > 0 ? count : ''}
      </span>
    </button>
  );
}
