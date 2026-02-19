'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Flame, User } from 'lucide-react';
import { useSupabase } from '@/lib/hooks/useSupabase';

export default function TrendingForumWidget() {
    const supabase = useSupabase();
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

             const { data } = await supabase
                .from('forum_threads')
                .select(`
                    *,
                    category:forum_categories(title, slug),
                    author:profiles(id, display_name, avatar_url:logo_url),
                    posts:forum_posts(count)
                `)
                .gt('last_reply_at', sevenDaysAgo.toISOString())
                .order('last_reply_at', { ascending: false })
                .limit(20); // Fetch top 20 active, then sort by absolute count
            
            if (data) {
                // Map count and Sort by reply count
                const sorted = data.map((t: any) => ({
                    ...t,
                    reply_count: (t.posts?.[0]?.count || 0) + 1
                })).sort((a: any, b: any) => b.reply_count - a.reply_count)
                .slice(0, 5); // Take top 5

                setThreads(sorted);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="animate-pulse h-48 md:bg-zinc-900/50 md:rounded-3xl"></div>;

    if (threads.length === 0) return null; // Or show empty state? User didn't specify, but "Trending" implies showing something usually.

    return (
        <div className="md:bg-zinc-900/30 md:border md:border-zinc-800 md:rounded-lg md:p-8 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <Flame size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-white">Trending (7 Tage)</h2>
                </div>
                <Link href="/forum" className="text-xs font-bold text-zinc-500 hover:text-white transition uppercase tracking-wider">
                    Zum Forum
                </Link>
            </div>

            <div className="space-y-3 relative z-10">
                {threads.map((thread) => (
                    <div 
                        key={thread.id} 
                        className="relative block bg-zinc-950/50 border border-zinc-900 hover:border-zinc-700 p-3 rounded-xl transition group"
                    >
                        <Link 
                            href={`/forum/thread/${thread.id}`}
                            className="absolute inset-0 z-10"
                        >
                            <span className="sr-only">View Thread</span>
                        </Link>

                        <div className="flex items-start justify-between gap-3 relative z-0">
                            <div className="min-w-0 pointer-events-none">
                                <h3 className="font-bold text-zinc-300 group-hover:text-emerald-400 transition truncate text-sm">
                                    {thread.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 pointer-events-auto">
                                    <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-900 px-1.5 rounded">{thread.category?.title}</span>
                                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                                        <User size={10} />
                                        {thread.author ? (
                                            <Link href={`/brewer/${thread.author.id}`} className="hover:text-emerald-400 hover:underline relative z-20">
                                                {thread.author.display_name}
                                            </Link>
                                        ) : (
                                            <span>Unbekannt</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 pointer-events-none">
                                <div className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                    <MessageSquare size={12} />
                                    <span>{thread.reply_count}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Background Gradient (hidden on mobile) */}
            <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div>
    );
}
