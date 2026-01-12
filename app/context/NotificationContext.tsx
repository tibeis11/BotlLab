'use client';

import { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useGlobalToast } from './AchievementNotificationContext';

interface NotificationContextType {
    showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning', link?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();
    const { showToast: showGlobalToast } = useGlobalToast();

    // Determine current brewery ID from URL if possible
    // URL format /team/[breweryId]/...
    const breweryIdMatch = pathname?.match(/\/team\/([^\/]+)/);
    const activeBreweryId = breweryIdMatch ? breweryIdMatch[1] : null;

    // Helper to process feed items
    const handleFeedItem = useCallback((item: any) => {
        const content = item.content;
        let title = "Neuigkeit";
        let message = "";
        let link = `/team/${activeBreweryId}/feed`;

        switch (item.type) {
            case 'BREW_CREATED':
                title = "Neues Rezept!";
                message = `${content.author || 'Jemand'} hat das Rezept "${content.brew_name}" erstellt.`;
                if(content.brew_id) link = `/team/${activeBreweryId}/brews/${content.brew_id}`;
                break;
            case 'BREW_RATED':
                title = "Neue Bewertung";
                message = `${content.author || 'Jemand'} hat "${content.brew_name}" mit ${content.rating} Sternen bewertet.`;
                if(content.brew_id) link = `/team/${activeBreweryId}/brews/${content.brew_id}`;
                break;
            case 'POST':
                title = "Neue Nachricht";
                message = `${content.author}: ${content.message?.substring(0, 50)}${content.message?.length > 50 ? '...' : ''}`;
                break;
            case 'MEMBER_JOINED':
                title = "Neues Mitglied";
                message = `${content.member_name} ist der Brauerei beigetreten!`;
                break;
            default:
                return; // Ignore other types for now
        }

        showGlobalToast(title, message, 'info', link);
    }, [activeBreweryId, showGlobalToast]);

    useEffect(() => {
        if (!activeBreweryId || !user) return;

        console.log(`[NotificationSystem] Subscribing to feed for brewery ${activeBreweryId}`);

        const channel = supabase
            .channel(`feed-public:${activeBreweryId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'brewery_feed',
                    filter: `brewery_id=eq.${activeBreweryId}`
                },
                (payload: any) => {
                    const newItem = payload.new;
                    // Don't toast own actions
                    if (newItem.user_id === user.id) return;

                    handleFeedItem(newItem);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeBreweryId, user, handleFeedItem]);

    // Proxy the showToast to the global context
    const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' = 'info', link?: string) => {
        showGlobalToast(title, message, type, link);
    }, [showGlobalToast]);

    return (
        <NotificationContext.Provider value={{ showToast }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotification must be used within NotificationProvider");
    return context;
}
