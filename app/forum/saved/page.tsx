import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import Footer from '@/app/components/Footer';
import { Bookmark, MessageSquare, MessagesSquare, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { getUserSavedContent } from '@/lib/forum-service';
import ForumSidebar from '../_components/ForumSidebar';
import ForumThreadCard from '../_components/ForumThreadCard';
import { formatRelativeTime, stripMarkdown } from '../_components/forum-utils';

export const metadata: Metadata = {
    title: 'Gespeicherte Inhalte | BotlLab Forum',
    description: 'Deine gespeicherten Forum-Threads und Beiträge.',
    robots: { index: false },
};

export const dynamic = 'force-dynamic';

const TABS = [
    { key: 'all',     label: 'Alle',     Icon: Layers },
    { key: 'threads', label: 'Threads',  Icon: MessagesSquare },
    { key: 'posts',   label: 'Beiträge', Icon: MessageSquare },
] as const;
type Tab = typeof TABS[number]['key'];

interface PageProps {
    searchParams: Promise<{ tab?: string }>;
}

export default async function SavedPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login?next=/forum/saved');

    const { tab = 'all' } = await searchParams;
    const activeTab: Tab = (['all', 'threads', 'posts'] as const).includes(tab as Tab)
        ? (tab as Tab)
        : 'all';

    const items = await getUserSavedContent(user.id);

    const filtered = items.filter(item => {
        if (activeTab === 'threads') return item.targetType === 'thread';
        if (activeTab === 'posts')   return item.targetType === 'post';
        return true;
    });

    const threadCount = items.filter(i => i.targetType === 'thread').length;
    const postCount   = items.filter(i => i.targetType === 'post').length;

    return (
        <>
            {/* ── Header Banner ─────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-950/20 via-zinc-950/80 to-transparent" />
                <div className="relative px-6 md:px-12 lg:px-16 py-5 md:py-8 max-w-screen-2xl mx-auto">
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                        <Link href="/forum" className="hover:text-zinc-300 transition">Forum</Link>
                        <span>/</span>
                        <span className="text-zinc-300 font-medium">Gespeichert</span>
                    </div>
                    <h1 className="text-xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                        <Bookmark className="text-amber-400" size={22} />
                        Gespeicherte Inhalte
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {items.length === 0
                            ? 'Noch nichts gespeichert.'
                            : `${items.length} gespeicherte${items.length === 1 ? 'r' : ''} Inhalt${items.length === 1 ? '' : 'e'}`}
                    </p>
                </div>
            </div>

            {/* ── Main Layout ───────────────────────────────────────── */}
            <div className="flex gap-0 max-w-screen-2xl mx-auto">

                {/* ── Sidebar ─────────────────────────────────────── */}
                <ForumSidebar activeSaved />

                {/* ── Main ────────────────────────────────────────── */}
                <main className="flex-1 min-w-0 px-6 pt-6 space-y-5">

                    {/* ── Tabs (underline style) ────────────────────── */}
                    <div className="flex gap-4 border-b border-zinc-800/60">
                        {TABS.map(({ key, label, Icon }) => {
                            const count = key === 'threads' ? threadCount : key === 'posts' ? postCount : items.length;
                            return (
                                <Link
                                    key={key}
                                    href={key === 'all' ? '/forum/saved' : `/forum/saved?tab=${key}`}
                                    className={`relative flex items-center gap-1.5 pb-3 text-sm font-bold transition-colors whitespace-nowrap
                                        ${activeTab === key
                                            ? 'text-white'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {label}
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black
                                            ${activeTab === key ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-800/50 text-zinc-600'}`}>
                                            {count}
                                        </span>
                                    )}
                                    {activeTab === key && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* ── Empty state ────────────────────────────────── */}
                    {filtered.length === 0 && (
                        <div className="text-center py-20">
                            <Bookmark size={36} className="mx-auto text-zinc-700 mb-4" />
                            <h3 className="font-bold text-zinc-300 mb-1">Nichts gespeichert</h3>
                            <p className="text-sm text-zinc-600 mb-6">
                                {activeTab === 'threads'
                                    ? 'Du hast noch keine Threads gespeichert.'
                                    : activeTab === 'posts'
                                    ? 'Du hast noch keine Beiträge gespeichert.'
                                    : 'Klicke auf das Lesezeichen-Symbol in einem Thread oder Beitrag, um ihn hier zu speichern.'}
                            </p>
                            <Link
                                href="/forum"
                                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
                            >
                                Forum entdecken
                            </Link>
                        </div>
                    )}

                    {/* ── Content list ───────────────────────────────── */}
                    {filtered.length > 0 && (
                        <div className="space-y-1">
                            {filtered.map(item => {
                                // ── Thread bookmark ──
                                if (item.targetType === 'thread' && item.thread) {
                                    return (
                                        <div key={item.bookmarkId} className="relative">
                                            {/* "Gespeichert am" badge */}
                                            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] text-amber-500/70 font-medium">
                                                <Bookmark size={9} className="fill-amber-500/50" />
                                                {formatRelativeTime(item.bookmarkedAt)}
                                            </div>
                                            <ForumThreadCard
                                                thread={{
                                                    ...item.thread,
                                                    author: item.thread.author
                                                        ? { ...item.thread.author, avatar_url: item.thread.author.logo_url }
                                                        : null,
                                                }}
                                                showCategory
                                            />
                                        </div>
                                    );
                                }

                                // ── Post bookmark ──
                                if (item.targetType === 'post' && item.post) {
                                    const post = item.post;
                                    const isDeleted = !!post.deleted_at;
                                    const preview = isDeleted
                                        ? '[Dieser Beitrag wurde gelöscht]'
                                        : stripMarkdown(post.content).substring(0, 200);
                                    const threadLink = post.thread
                                        ? `/forum/thread/${post.thread.id}#post-${post.id}`
                                        : '#';

                                    return (
                                        <Link
                                            key={item.bookmarkId}
                                            href={threadLink}
                                            className="block group border border-transparent hover:border-zinc-800 hover:bg-zinc-900/50 rounded-xl px-4 py-4 transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <MessageSquare size={13} className="text-zinc-600 shrink-0" />
                                                    <span className="text-xs text-zinc-500 truncate">
                                                        Antwort in{' '}
                                                        <span className="text-zinc-300 font-semibold">
                                                            {post.thread?.title ?? 'Unbekannter Thread'}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-amber-500/70 font-medium shrink-0">
                                                    <Bookmark size={9} className="fill-amber-500/50" />
                                                    {formatRelativeTime(item.bookmarkedAt)}
                                                </div>
                                            </div>

                                            <p className={`text-sm leading-relaxed line-clamp-3 ${isDeleted ? 'italic text-zinc-600' : 'text-zinc-300 group-hover:text-white'}`}>
                                                {preview}{!isDeleted && preview.length === 200 ? '…' : ''}
                                            </p>

                                            <div className="flex items-center gap-2 mt-2.5">
                                                {post.author?.logo_url && (
                                                    <img
                                                        src={post.author.logo_url}
                                                        className="w-4 h-4 rounded-full object-cover border border-zinc-700"
                                                        alt=""
                                                    />
                                                )}
                                                <span className="text-[11px] text-zinc-600">
                                                    {post.author?.display_name ?? 'Unbekannt'}
                                                    {' · '}
                                                    {formatRelativeTime(post.created_at)}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    )}
                </main>
            </div>
            <Footer />
        </>
    );
}
