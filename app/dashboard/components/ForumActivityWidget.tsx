'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForumActivityWidget({ userId }: { userId: string }) {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
             const { data } = await supabase
                .from('forum_threads')
                .select(`
                    *,
                    category:forum_categories(title, slug),
                    posts:forum_posts(count)
                `)
                .eq('author_id', userId)
                .order('last_reply_at', { ascending: false })
                .limit(3);
            
            if (data) {
                // Map reply count: count is total posts, so replies = total - 1 (the OP)
                // wait, count(*) typically includes the OP. But our UI usually shows "replies". 
                // Let's stick to standard logic: reply_count = count - 1. 
                // However, standard forum logic often displays "Posts: X" or "Replies: X". 
                // In this app, we usually just show a number next to a bubble.
                // Looking at other files, we usually do `replies + 1` for total activity.
                // Let's just use the raw count or count-1.
                // Actually, earlier I said "Fixed `reply_count` logic... to be real-time (`replies + 1`)"
                // So I should map it similarly.
                const mapped = data.map((t: any) => ({
                    ...t,
                    reply_count: (t.posts?.[0]?.count || 0)
                }));
                setThreads(mapped);
            }
            setLoading(false);
        }
        load();
    }, [userId]);

    if (loading) return <div className="animate-pulse h-48 md:bg-zinc-900/50 md:rounded-3xl"></div>;

    if (threads.length === 0) return null;

    return (
        <div className="bg-transparent md:bg-zinc-900/50 md:border md:border-zinc-800 md:rounded-3xl md:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <MessageSquare size={18} className="text-emerald-500" />
                    Deine Diskussionen
                </h3>
                <Link href="/forum" className="text-xs font-bold text-zinc-500 hover:text-white transition uppercase tracking-wider">
                    Alle
                </Link>
            </div>

            <div className="space-y-3 flex-1">
                {threads.map(thread => (
                    <Link 
                        key={thread.id} 
                        href={`/forum/thread/${thread.id}`}
                        className="block bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-xl hover:border-emerald-500/30 hover:bg-zinc-900 transition group"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/80 bg-emerald-950/30 px-2 py-0.5 rounded">
                                {thread.category?.title}
                            </span>
                            <span className="text-[10px] text-zinc-600 flex items-center gap-1 group-hover:text-zinc-400">
                                {thread.reply_count} <MessageSquare size={10} />
                            </span>
                        </div>
                        <h4 className="font-bold text-zinc-300 group-hover:text-emerald-400 transition truncate mb-1">
                            {thread.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                             <Calendar size={10} />
                             Last Activity: {new Date(thread.last_reply_at || thread.created_at).toLocaleDateString()}
                        </div>
                    </Link>
                ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-zinc-800/50 text-center">
                 <Link href="/forum/create" className="text-sm font-bold text-zinc-400 hover:text-white transition">
                    + Neues Thema
                 </Link>
            </div>
        </div>
    );
}
