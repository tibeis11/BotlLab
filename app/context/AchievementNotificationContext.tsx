'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import AchievementToast from '../components/AchievementToast';
import Toast from '../components/Toast';

// --- Types ---

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
}

interface ToastData {
  id: string;
  type: 'achievement' | 'notification';
  // Common
  // specific
  achievementData?: Achievement;
  notificationData?: {
    title: string;
    message: string;
    level: 'info' | 'success' | 'warning';
    link?: string;
  };
}

interface AchievementNotificationContextType {
  showAchievement: (achievement: Achievement) => void;
  showToast: (title: string, message: string, level?: 'info' | 'success' | 'warning', link?: string) => void;
}

const AchievementNotificationContext = createContext<AchievementNotificationContextType | undefined>(undefined);

export function AchievementNotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastData[]>([]);

  const showAchievement = useCallback((achievement: Achievement) => {
    // Ensure unique ID if not present (though calling code usually provides id in achievement object but maybe not unique enough for list?)
    // Actually the incoming achievement has .id (the db id presumably).
    // We wrapper it.
    const uniqueId = `ach-${achievement.id}-${Date.now()}`;
    setItems(prev => [{
      id: uniqueId,
      type: 'achievement',
      achievementData: achievement
    }, ...prev]);
  }, []);

  const showToast = useCallback((title: string, message: string, level: 'info' | 'success' | 'warning' = 'info', link?: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setItems(prev => [{
      id,
      type: 'notification',
      notificationData: { title, message, level, link }
    }, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <AchievementNotificationContext.Provider value={{ showAchievement, showToast }}>
      {children}
      
      {/* Global Toast Container - Renders ALL toasts in one stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-4 pointer-events-none pr-2 sm:pr-0">
        {items.map((item) => (
          <div key={item.id} className="animate-in slide-in-from-right fade-in duration-300">
            {item.type === 'achievement' && item.achievementData && (
               <AchievementToast
                  achievement={item.achievementData}
                  onClose={() => removeItem(item.id)}
               />
            )}
            
            {item.type === 'notification' && item.notificationData && (
                <Toast
                    id={item.id}
                    title={item.notificationData.title}
                    message={item.notificationData.message}
                    type={item.notificationData.level}
                    link={item.notificationData.link}
                    onClose={removeItem}
                />
            )}
          </div>
        ))}
      </div>
    </AchievementNotificationContext.Provider>
  );
}

// Legacy hook name kept for compatibility
export function useAchievementNotification() {
  const context = useContext(AchievementNotificationContext);
  if (!context) {
    throw new Error('useAchievementNotification must be used within AchievementNotificationProvider');
  }
  return context;
}

// New hook alias that makes semantic sense for non-achievement usages
export function useGlobalToast() {
    return useAchievementNotification();
}
