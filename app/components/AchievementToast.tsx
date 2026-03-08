'use client';

import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
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
    setTimeout(() => setIsVisible(true), 10);

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const tierColor = getTierColor(achievement.tier);

  return (
    <div
      className={`pointer-events-auto transition-all duration-500 transform ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-[20%] opacity-0'
      }`}
    >
      <div className="bg-surface border-2 border-brand rounded-2xl p-4 shadow-2xl shadow-brand/20 min-w-[320px] max-w-[400px]">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="text-5xl flex-shrink-0 animate-bounce">
            {achievement.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-3 h-3 text-brand" />
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                Achievement freigeschaltet!
              </span>
            </div>

            <h3 className="text-base font-bold text-text-primary mb-1 leading-tight">
              {achievement.name}
            </h3>

            <p className="text-xs text-text-secondary mb-2 leading-snug">
              {achievement.description}
            </p>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded border ${tierColor}`}>
                {achievement.tier.toUpperCase()}
              </span>
              <span className="text-xs font-bold text-success">
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
            className="text-text-muted hover:text-text-primary transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-0.5 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-brand"
            style={{ animation: 'toastProgress 5s linear forwards' }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
