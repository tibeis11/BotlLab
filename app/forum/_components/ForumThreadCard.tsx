import Link from 'next/link';
import { Pin, MessageSquare, Eye } from 'lucide-react';
import { getTierConfig } from '@/lib/tier-system';
import { getTierBorderColor } from '@/lib/premium-config';
import { formatRelativeTime } from './forum-utils';

const TAG_COLORS: Record<string, string> = {
    Frage:       'bg-blue-500/10 border-blue-500/25 text-blue-400',
    Rezept:      'bg-green-500/10 border-green-500/25 text-green-400',
    Showcase:    'bg-amber-500/10 border-amber-500/25 text-amber-400',
    Equipment:   'bg-purple-500/10 border-purple-500/25 text-purple-400',
    Tipp:        'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
    Problem:     'bg-rose-500/10 border-rose-500/25 text-rose-400',
    Diskussion:  'bg-zinc-800 border-zinc-700 text-zinc-400',
    Neuigkeit:   'bg-orange-500/10 border-orange-500/25 text-orange-400',
};

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
    const tierConfig = thread.author?.tier ? getTierConfig(thread.author.tier) : null;

    return (
        <div
            className={`relative flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all group
                ${thread.is_pinned
                    ? 'bg-emerald-950/10 border border-emerald-500/15 hover:bg-emerald-950/20'
                    : 'hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800'}
            `}
        >
            {/* Full-card clickable overlay */}
            <Link href={`/forum/thread/${thread.id}`} className="absolute inset-0 z-10 rounded-lg">
                <span className="sr-only">Thread öffnen: {thread.title}</span>
            </Link>

            {/* ── Avatar ──────────────────────────────────────────────────── */}
            <div className="shrink-0 pt-0.5">
                {thread.author?.avatar_url ? (
                    <img
                        src={thread.author.avatar_url}
                        alt=""
                        className={`w-7 h-7 rounded-full object-cover bg-zinc-800 border-[1.5px] ${tierBorderClass}`}
                    />
                ) : (
                    <div className={`w-7 h-7 rounded-full bg-zinc-800 border-[1.5px] ${tierBorderClass} flex items-center justify-center select-none`}>
                        <span className="text-[10px] font-bold text-zinc-500">
                            {thread.author?.display_name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Content column ──────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 pointer-events-none">

                {/* Header line: author · tier · category · pin · time */}
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-0.5">
                    <span className="text-[13px] font-semibold text-zinc-300 leading-none">
                        {thread.author?.display_name ?? 'Gelöschter Nutzer'}
                    </span>

                    {tierConfig && tierConfig.name !== 'lehrling' && (
                        <span
                            className="text-[9px] uppercase font-bold tracking-wider px-1 py-px rounded bg-black/50 border border-white/5 leading-none"
                            style={{ color: tierConfig.color }}
                        >
                            {tierConfig.displayName}
                        </span>
                    )}

                    {showCategory && thread.category && (
                        <span className="text-[9px] uppercase font-bold tracking-wide px-1 py-px bg-zinc-900 border border-zinc-800 rounded text-zinc-500 leading-none">
                            {thread.category.title}
                        </span>
                    )}

                    {thread.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 uppercase tracking-wide leading-none">
                            <Pin className="w-2.5 h-2.5 fill-emerald-500/20" /> Gepinnt
                        </span>
                    )}

                    {thread.is_solved && (
                        <span className="inline-flex items-center gap-x-0.5 text-[9px] font-bold px-1 py-px rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 uppercase tracking-wide leading-none">
                            ✅ Gelöst
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

                {/* Tags + Meta inline row */}
                <div className="flex items-center gap-2 flex-wrap">
                    {(thread.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {(thread.tags!).map(tag => (
                                <span
                                    key={tag}
                                    className={`text-[9px] font-bold px-1.5 py-px rounded-full border leading-none ${
                                        TAG_COLORS[tag] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                    }`}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Brew chip */}
                    {thread.brew && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80 font-medium">
                            🍺 {thread.brew.name}
                        </span>
                    )}

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
