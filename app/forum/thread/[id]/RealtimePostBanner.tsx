'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowUp, MessageSquare } from 'lucide-react';

interface RealtimePostBannerProps {
    threadId: string;
    /** ISO timestamp of the last post at render-time (to filter only genuinely new ones) */
    lastPostAt: string;
}

export default function RealtimePostBanner({ threadId, lastPostAt }: RealtimePostBannerProps) {
    const router = useRouter();
    const [newCount, setNewCount] = useState(0);

    useEffect(() => {
        const channel = supabase
            .channel(`thread-posts-${threadId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'forum_posts',
                    filter: `thread_id=eq.${threadId}`,
                },
                (payload) => {
                    // Only count posts newer than the page render to avoid counting existing posts
                    const createdAt = (payload.new as { created_at?: string }).created_at;
                    if (createdAt && createdAt > lastPostAt) {
                        setNewCount(n => n + 1);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [threadId, lastPostAt]);

    if (newCount === 0) return null;

    return (
        <button
            onClick={() => {
                setNewCount(0);
                router.refresh();
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-success/10 hover:bg-success/20 border border-success/30 rounded-xl text-success text-sm font-bold transition animate-in slide-in-from-top-2 duration-300"
        >
            <ArrowUp size={14} />
            <MessageSquare size={13} />
            {newCount} neue {newCount === 1 ? 'Antwort' : 'Antworten'} — klicken zum Laden
        </button>
    );
}
