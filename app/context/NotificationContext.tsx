'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { usePathname } from 'next/navigation';

interface Toast {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    link?: string;
}

interface NotificationContextType {
    showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning', link?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Determine current brewery ID from URL if possible
    // URL format /team/[breweryId]/...
    const breweryIdMatch = pathname?.match(/\/team\/([^\/]+)/);
    const activeBreweryId = breweryIdMatch ? breweryIdMatch[1] : null;

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
    }, [activeBreweryId, user]);

    const handleFeedItem = (item: any) => {
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

        showToast(title, message, 'info', link);
    };

    const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' = 'info', link?: string) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, title, message, type, link }]);

        // Auto remove
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        className={`pointer-events-auto bg-zinc-900/90 backdrop-blur border border-zinc-700 p-4 rounded-xl shadow-2xl min-w-[300px] max-w-sm animate-slide-in transform transition-all cursor-pointer hover:bg-zinc-800`}
                        onClick={() => {
                             if(toast.link) window.location.href = toast.link; // Simple validation
                             removeToast(toast.id);
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white text-sm mb-1">{toast.title}</h4>
                            <span className="text-zinc-500 hover:text-white text-xs" onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}>✕</span>
                        </div>
                        <p className="text-xs text-zinc-400">{toast.message}</p>
                    </div>
                ))}
            </div>
            <style jsx global>{`
                @keyframes slide-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotification must be used within NotificationProvider");
    return context;
}
