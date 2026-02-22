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
        <aside className="hidden xl:flex w-72 flex-shrink-0 flex-col border-l border-zinc-800/60 sticky top-14 self-start pt-8 pb-10 pr-6 lg:pr-12 pl-6 space-y-6">

            {/* ── Trending ────────────────────────────────────────────── */}
            <div>
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
                    Trending · 30 Tage
                </h3>
                {trending.length === 0 ? (
                    <p className="text-sm text-zinc-700">Noch keine Trending-Threads</p>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {trending.map((thread: any, i: number) => (
                            <Link
                                key={thread.id}
                                href={`/forum/thread/${thread.id}`}
                                className="group flex items-start gap-2.5 py-2 rounded-lg hover:bg-zinc-900/40 transition-colors -mx-2 px-2"
                            >
                                <span className="shrink-0 text-xs font-black tabular-nums text-zinc-700 group-hover:text-zinc-500 transition w-4 mt-0.5">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-400 group-hover:text-white leading-snug line-clamp-2 transition-colors">
                                        {thread.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-700">
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
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Community</h3>
                <div className="flex gap-6">
                    <div>
                        <p className="text-xl font-black text-zinc-100 tabular-nums">
                            {stats.threadCount.toLocaleString('de-DE')}
                        </p>
                        <p className="text-[11px] text-zinc-600 uppercase tracking-wide font-bold">
                            Threads
                        </p>
                    </div>
                    <div>
                        <p className="text-xl font-black text-zinc-100 tabular-nums">
                            {stats.postCount.toLocaleString('de-DE')}
                        </p>
                        <p className="text-[11px] text-zinc-600 uppercase tracking-wide font-bold">
                            Beiträge
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
