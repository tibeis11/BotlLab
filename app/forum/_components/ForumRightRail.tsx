import Link from 'next/link';
import { TrendingUp, BarChart2, MessageSquare } from 'lucide-react';
import { getTrendingThreads, getForumStats } from '@/lib/forum-service';
import { formatRelativeTime } from './forum-utils';

export default async function ForumRightRail() {
    const [trending, stats] = await Promise.all([
        getTrendingThreads(5),
        getForumStats(),
    ]);

    return (
        <aside className="hidden xl:flex w-72 flex-shrink-0 flex-col border-l border-border sticky top-14 self-start pt-8 pb-10 pr-6 lg:pr-12 pl-6 space-y-6">

            {/* ── Trending ────────────────────────────────────────────── */}
            <div>
                <h3 className="text-[10px] font-bold text-text-disabled uppercase tracking-widest mb-3">
                    Trending · 30 Tage
                </h3>
                {trending.length === 0 ? (
                    <p className="text-sm text-text-disabled">Noch keine Trending-Threads</p>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {trending.map((thread: any, i: number) => (
                            <Link
                                key={thread.id}
                                href={`/forum/thread/${thread.id}`}
                                className="group flex items-start gap-2.5 py-2 rounded-lg hover:bg-surface/40 transition-colors -mx-2 px-2"
                            >
                                <span className="shrink-0 text-xs font-black tabular-nums text-text-disabled group-hover:text-text-muted transition w-4 mt-0.5">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-secondary group-hover:text-text-primary leading-snug line-clamp-2 transition-colors">
                                        {thread.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-disabled">
                                        {thread.category && (
                                            <span>{thread.category.title}</span>
                                        )}
                                        <span>·</span>
                                        <div className="flex items-center gap-0.5">
                                            <MessageSquare className="w-2.5 h-2.5" />
                                            <span className="tabular-nums">{thread.reply_count}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Community Stats ──────────────────────────────────────── */}
            <div>
                <h3 className="text-[10px] font-bold text-text-disabled uppercase tracking-widest mb-3">Community</h3>
                <div className="flex gap-6">
                    <div>
                        <p className="text-xl font-black text-foreground tabular-nums">
                            {stats.threadCount.toLocaleString('de-DE')}
                        </p>
                        <p className="text-[11px] text-text-disabled uppercase tracking-wide font-bold">
                            Threads
                        </p>
                    </div>
                    <div>
                        <p className="text-xl font-black text-foreground tabular-nums">
                            {stats.postCount.toLocaleString('de-DE')}
                        </p>
                        <p className="text-[11px] text-text-disabled uppercase tracking-wide font-bold">
                            Beiträge
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
