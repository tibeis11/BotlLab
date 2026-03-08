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
                .limit(20);
            
            if (data) {
                const sorted = data.map((t: any) => ({
                    ...t,
                    reply_count: (t.posts?.[0]?.count || 0) + 1
                })).sort((a: any, b: any) => b.reply_count - a.reply_count)
                .slice(0, 3);

                setThreads(sorted);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="animate-pulse h-40 bg-surface rounded-2xl"></div>;

    if (threads.length === 0) return null;

    return (
        <div className="bg-surface rounded-2xl border border-border p-5">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-success" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Forum Highlights</p>
                </div>
                <Link href="/forum" className="text-xs font-bold text-text-disabled hover:text-text-primary transition uppercase tracking-wider">
                    Zum Forum
                </Link>
            </div>

            <div className="space-y-1">
                {threads.map((thread) => (
                    <div 
                        key={thread.id} 
                        className="relative group px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-all"
                    >
                        <Link 
                            href={`/forum/thread/${thread.id}`}
                            className="absolute inset-0 z-10"
                        >
                            <span className="sr-only">View Thread</span>
                        </Link>

                        <div className="flex items-start justify-between gap-3 relative z-0">
                            <div className="min-w-0 pointer-events-none">
                                <h3 className="font-bold text-text-secondary group-hover:text-brand transition truncate text-sm">
                                    {thread.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 pointer-events-auto">
                                    <span className="text-[10px] uppercase font-bold text-text-disabled bg-surface-hover px-1.5 py-0.5 rounded">{thread.category?.title}</span>
                                    <div className="flex items-center gap-1 text-xs text-text-muted">
                                        <User size={10} />
                                        {thread.author ? (
                                            <Link href={`/brewer/${thread.author.id}`} className="hover:text-brand hover:underline relative z-20">
                                                {thread.author.display_name}
                                            </Link>
                                        ) : (
                                            <span>Unbekannt</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 pointer-events-none">
                                <div className="flex items-center gap-1 text-xs font-bold text-success bg-success-bg px-2 py-0.5 rounded-lg">
                                    <MessageSquare size={12} />
                                    <span>{thread.reply_count}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
