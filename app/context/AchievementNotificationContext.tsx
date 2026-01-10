'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import AchievementToast from '../components/AchievementToast';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
}

interface AchievementNotificationContextType {
  showAchievement: (achievement: Achievement) => void;
}

const AchievementNotificationContext = createContext<AchievementNotificationContextType | undefined>(undefined);

export function AchievementNotificationProvider({ children }: { children: ReactNode }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const showAchievement = useCallback((achievement: Achievement) => {
    setAchievements(prev => [...prev, achievement]);
  }, []);

  const removeAchievement = useCallback((id: string) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <AchievementNotificationContext.Provider value={{ showAchievement }}>
      {children}
      
      {/* Render toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {achievements.map((achievement, index) => (
          <div key={`${achievement.id}-${index}`} style={{ marginTop: index * 10 }}>
            <AchievementToast
              achievement={achievement}
              onClose={() => removeAchievement(achievement.id)}
            />
          </div>
        ))}
      </div>
    </AchievementNotificationContext.Provider>
  );
}

export function useAchievementNotification() {
  const context = useContext(AchievementNotificationContext);
  if (!context) {
    throw new Error('useAchievementNotification must be used within AchievementNotificationProvider');
  }
  return context;
}
