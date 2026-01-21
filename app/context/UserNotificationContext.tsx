'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// Types derived from DB table
export type NotificationType = 'brew_like' | 'follow' | 'system_msg';

export interface NotificationItem {
  id: string;
  created_at: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  is_read: boolean;
  
  // Joined fields
  actor?: {
    display_name: string;
    logo_url: string | null;
  };
}

interface UserNotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const UserNotificationContext = createContext<UserNotificationContextType | undefined>(undefined);

export function UserNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Initial Session Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchNotifications(session.user.id);
      else setLoading(false);
    }).catch((err) => {
      console.error('Error getting session:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchNotifications(session.user.id);
      else {
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetcher
  async function fetchNotifications(userId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles (display_name, logo_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // Cap at 50 for performance

      if (error) {
        console.error('Error fetching notifications:', error.message, error.details);
      } else {
        setNotifications(data as unknown as NotificationItem[]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Gracefully handle the error - don't break the app
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  // 3. Realtime Subscription
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('user_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        async (payload) => {
          // New notifiction!
          // We can either fetch fully again to get the actor profile join,
          // or just optimistically add it (but actor name will be missing).
          // Safest is to refetch just this one or re-fetch head.
          // For simplicity: refetch all (or optimize later).
          fetchNotifications(session.user.id);
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime notifications subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Actions
  async function markAsRead(id: string) {
    // Optimistic
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function markAllAsRead() {
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    if (session) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id);
    }
  }
  
  async function deleteNotification(id: string) {
    // Optimistic
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <UserNotificationContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification }}>
      {children}
    </UserNotificationContext.Provider>
  );
}

export function useUserNotifications() {
  const context = useContext(UserNotificationContext);
  if (context === undefined) {
    throw new Error('useUserNotifications must be used within a UserNotificationProvider');
  }
  return context;
}
