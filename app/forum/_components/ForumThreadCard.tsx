import Link from 'next/link';
import { Pin, MessageSquare, Eye, CheckCircle2, Beaker } from 'lucide-react';
import { getTierBorderColor } from '@/lib/premium-config';
import { formatRelativeTime } from './forum-utils';

export interface ForumThread {
    id: string;
    title: string;
    content?: string | null;
    is_pinned?: boolean | null;
    is_solved?: boolean | null;
    last_reply_at: string;
    view_count?: number | null;
    reply_count?: number | null;
    tags?: string[] | null;
    category?: { title: string; slug: string } | null;
    author?: {
        id: string;
        display_name: string;
        avatar_url?: string | null;
        tier?: string | null;
        subscription_tier?: string | null;
    } | null;
    brew?: {
        id: string;
        name: string;
        image_url?: string | null;
        moderation_status?: string | null;
    } | null;
}

interface Props {
    thread: ForumThread;
    /** Set to false on category page — we already know the category context. */
    showCategory?: boolean;
}

export default function ForumThreadCard({ thread, showCategory = true }: Props) {
    const tierBorderClass = getTierBorderColor(thread.author?.subscription_tier);

    return (
        <div
            className={`relative flex items-start gap-3 px-3 py-3 rounded-lg transition-colors group
                ${thread.is_pinned ? 'bg-emerald-950/10' : ''}
                hover:bg-zinc-900/50
            `}
        >
            {/* Full-card clickable overlay */}
            <Link href={`/forum/thread/${thread.id}`} className="absolute inset-0 z-10 rounded-lg">
                <span className="sr-only">Thread öffnen: {thread.title}</span>
            </Link>

            {/* ── Avatar ──────────────────────────────────────────────────── */}
            <div className="shrink-0 pt-0.5">
                <img
                    src={thread.author?.avatar_url || '/tiers/lehrling.png'}
                    alt=""
                    className={`w-7 h-7 rounded-full object-cover bg-zinc-800 border-[1.5px] ${tierBorderClass}`}
                />
            </div>

            {/* ── Content column ──────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 pointer-events-none">

                {/* Header: author · tier · category · time */}
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-0.5">
                    <span className="text-[13px] font-semibold text-zinc-400 leading-none">
                        {thread.author?.display_name ?? 'Gelöschter Nutzer'}
                    </span>

                    {showCategory && thread.category && (
                        <span className="text-[9px] uppercase font-medium tracking-wide text-zinc-600 leading-none">
                            {thread.category.title}
                        </span>
                    )}

                    {thread.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 uppercase tracking-wide leading-none">
                            <Pin className="w-2.5 h-2.5 fill-emerald-500/20" /> Gepinnt
                        </span>
                    )}

                    <span className="ml-auto text-[11px] text-zinc-600 shrink-0 leading-none">
                        {formatRelativeTime(thread.last_reply_at)}
                    </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm text-zinc-100 group-hover:text-white leading-snug line-clamp-1 mb-1 transition-colors">
                    {thread.title}
                </h3>

                {/* Tags + Meta */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Tags: uniform subdued pills */}
                    {(thread.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {(thread.tags!).map(tag => (
                                <span
                                    key={tag}
                                    className="text-[10px] font-medium px-1.5 py-px rounded bg-zinc-800/80 text-zinc-500 leading-none"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Brew chip — icon only, no emoji */}
                    {thread.brew && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                            <Beaker className="w-3 h-3 shrink-0" />
                            {thread.brew.name}
                        </span>
                    )}

                    {/* Solved badge — no emoji */}
                    {thread.is_solved && (
                        <span className="inline-flex items-center gap-x-0.5 text-[10px] font-bold text-emerald-500 leading-none">
                            <CheckCircle2 className="w-3 h-3" /> Gelöst
                        </span>
                    )}

                    {/* Reply & view counts */}
                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-600 ml-auto">
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span className="tabular-nums">{thread.reply_count ?? 0}</span>
                        </span>
                        {(thread.view_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span className="tabular-nums">{thread.view_count}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
