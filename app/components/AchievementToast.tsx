'use client';

import { useEffect, useState } from 'react';
import { getTierColor } from '@/lib/achievements';

interface AchievementToastProps {
  achievement: {
    name: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    points: number;
  };
  onClose: () => void;
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const tierColor = getTierColor(achievement.tier);

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-500 transform ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-br from-zinc-900 to-black border-2 border-cyan-500 rounded-2xl p-4 shadow-2xl shadow-cyan-500/50 min-w-[320px] max-w-[400px]">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="text-5xl flex-shrink-0 animate-bounce">
            {achievement.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                🏆 Achievement freigeschaltet!
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1 leading-tight">
              {achievement.name}
            </h3>
            
            <p className="text-sm text-zinc-400 mb-2 leading-snug">
              {achievement.description}
            </p>
            
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded border ${tierColor}`}>
                {achievement.tier.toUpperCase()}
              </span>
              <span className="text-xs font-bold text-emerald-400">
                +{achievement.points} Punkte
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setIsLeaving(true);
              setTimeout(onClose, 500);
            }}
            className="text-zinc-500 hover:text-white transition flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-progress"
            style={{ animation: 'progress 5s linear' }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
