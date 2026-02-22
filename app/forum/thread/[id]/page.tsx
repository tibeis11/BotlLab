import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getThread, getPosts, getVotesForThread, getUserBookmarkedIds, getThreadSubscription, getThreadPoll } from '@/lib/forum-service';
import ViewCountTracker from './ViewCountTracker';
import { MessageSquare, Calendar, User, Eye, Lock, ChevronDown } from 'lucide-react';
import ForumSidebar from '../../_components/ForumSidebar';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ReplyInput from './ReplyInput';
import ReportButton from './ReportButton';
import MarkSolvedButton from './MarkSolvedButton';
import { getTierConfig } from '@/lib/tier-system';
import { getTierBorderColor } from '@/lib/premium-config';
import ForumPost from './ForumPost';
import PostBranch from './PostBranch';
import ThreadInteractionWrapper from './ThreadInteractionWrapper';
import VoteBar from './VoteBar';
import EditDeletePostButtons from './EditDeletePostButtons';
import BookmarkButton from './BookmarkButton';
import SubscribeButton from './SubscribeButton';
import PollBlock from './PollBlock';
import RealtimePostBanner from './RealtimePostBanner';
import PostsLoadMore from './PostsLoadMore';
import MarkdownContent from '@/app/forum/_components/MarkdownContent';

const POSTS_PAGE_SIZE = 30;

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    const thread = await getThread(id);
    if (!thread) return { title: 'Forum | BotlLab' };
    const description = thread.content
        ? thread.content.substring(0, 155) + (thread.content.length > 155 ? '…' : '')
        : 'Diskussion auf BotlLab.';
    return {
        title: `${thread.title} | BotlLab Forum`,
        description,
        alternates: { canonical: `/forum/thread/${id}` },
        openGraph: {
            title: thread.title,
            description,
            url: `https://botllab.de/forum/thread/${id}`,
            siteName: 'BotlLab',
            locale: 'de_DE',
            type: 'article',
        },
    };
}

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: PageProps) {
    const { id } = await params;
    const thread = await getThread(id);

    if (!thread) {
        notFound();
    }

    const posts = await getPosts(id, POSTS_PAGE_SIZE, 0);
    const hasMorePosts = posts.length >= POSTS_PAGE_SIZE;

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} }
            }
        }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // Extract brew IDs from all post contents for batch fetching (avoids N+1 queries)
    const brewRegex = /\/brew\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
    const brewIds = new Set<string>();
    for (const p of posts) {
        if (!p.deleted_at) {
            const matches = p.content.matchAll(brewRegex);
            for (const m of matches) brewIds.add(m[1]);
        }
    }

    // Load votes, bookmarks, subscription, poll, and brew data in parallel
    const postIds = posts.map((p) => p.id);
    const [{ voteCounts, userVotes }, bookmarkedIds, isSubscribed, poll, brewMap] = await Promise.all([
        getVotesForThread(id, postIds, user?.id),
        user ? getUserBookmarkedIds(user.id, [id]) : Promise.resolve(new Set<string>()),
        user ? getThreadSubscription(user.id, id) : Promise.resolve(false),
        getThreadPoll(id, user?.id),
        // Batch-fetch all referenced brews in one query
        (async () => {
            if (brewIds.size === 0) return new Map();
            const { data } = await supabase
                .from('brews')
                .select('id, name, image_url, moderation_status, brewery_id, brewery:breweries(name)')
                .in('id', Array.from(brewIds));
            const map = new Map<string, any>();
            (data ?? []).forEach((b: any) => map.set(b.id, b));
            return map;
        })(),
    ]);
    const userVotesArray = Array.from(userVotes);
    const isThreadBookmarked = bookmarkedIds.has(id);

    const tierBorderClass = getTierBorderColor(thread.author?.subscription_tier);

    return (
        <ThreadInteractionWrapper>
            <>
            {/* ── Thread Hero Banner ──────────────────────────────────── */}
            <div className="relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-emerald-950/10" />
                <div className="relative px-6 md:px-12 lg:px-16 py-5 md:py-7 max-w-screen-2xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                        <Link href="/forum" className="hover:text-zinc-300 transition">Forum</Link>
                        <span>/</span>
                        <Link href={`/forum/${thread.category.slug}`} className="hover:text-zinc-300 transition">{thread.category.title}</Link>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            {/* Title + badges */}
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                <h1 className="text-xl md:text-3xl font-black tracking-tight leading-tight">{thread.title}</h1>
                                {thread.is_solved && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shrink-0">
                                        ✅ Gelöst
                                    </span>
                                )}
                                {thread.is_locked && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-[11px] font-bold shrink-0">
                                        <Lock size={10} /> Gesperrt
                                    </span>
                                )}
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    <span>{new Date(thread.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MessageSquare size={12} />
                                    <span>{(thread.reply_count ?? posts.length)} Antworten</span>
                                </div>
                                {/* Solved toggle — inline, only for thread author */}
                                {user?.id === thread.author_id && !thread.is_locked && (
                                    <MarkSolvedButton threadId={thread.id} isSolved={thread.is_solved ?? false} />
                                )}
                            </div>
                        </div>

                        {/* Action buttons — right side of hero */}
                        <div className="hidden md:flex items-center gap-1 shrink-0">
                            {user && (
                                <SubscribeButton threadId={thread.id} initialSubscribed={isSubscribed} />
                            )}
                            {user && (
                                <BookmarkButton
                                    targetId={thread.id}
                                    targetType="thread"
                                    initialBookmarked={isThreadBookmarked}
                                />
                            )}
                            <ReportButton targetId={thread.id} targetType="forum_thread" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Layout ─────────────────────────────────────────── */}
            <div className="flex gap-0 max-w-screen-2xl mx-auto">

                {/* ── Left sidebar ─────────────────────────────────────── */}
                <ForumSidebar activeSlug={thread.category?.slug} />

                {/* ── Thread content ───────────────────────────────────── */}
                <main className="flex-1 min-w-0 px-6 pt-6 space-y-5">

                    {/* Jump to replies anchor */}
                    {posts.length > 0 && (
                        <a
                            href="#replies"
                            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-emerald-400 transition font-medium group"
                        >
                            <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                            ↓ {(thread.reply_count ?? posts.length)} Antworten
                        </a>
                    )}

                    {/* ── OP (Original Post) ───────────────────────────── */}
                    <div className="border border-zinc-800/40 hover:border-zinc-700/50 rounded-lg overflow-hidden transition">
                        {/* Author row — compact */}
                        <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                {thread.author ? (
                                    <Link href={`/brewer/${thread.author.id}`} className="flex items-center gap-2.5 group/author">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs overflow-hidden bg-zinc-900 border-[1.5px] transition ${tierBorderClass}`}>
                                            <img
                                                src={thread.author.avatar_url || getTierConfig(thread.author.tier || 'lehrling').avatarPath}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="font-semibold text-white text-[13px] group-hover/author:text-emerald-400 transition">{thread.author.display_name}</span>
                                            {(() => {
                                                if (!thread.author.tier) return null;
                                                const tierConfig = getTierConfig(thread.author.tier);
                                                if (tierConfig.name === 'lehrling') return null;
                                                return (
                                                    <span
                                                        className="text-[9px] uppercase font-bold tracking-wider px-1 py-px rounded bg-zinc-900 border border-zinc-800 leading-none"
                                                        style={{ color: tierConfig.color }}
                                                    >
                                                        {tierConfig.displayName}
                                                    </span>
                                                );
                                            })()}
                                            <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-px rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 leading-none">
                                                OP
                                            </span>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                                            <User size={12} />
                                        </div>
                                        <span className="font-semibold text-zinc-400 text-[13px]">Gelöschter Nutzer</span>
                                    </div>
                                )}
                            </div>

                            {/* Edit/delete — only OP author */}
                            {user?.id === thread.author_id && !thread.is_locked && (
                                <EditDeletePostButtons
                                    targetId={thread.id}
                                    targetType="thread"
                                    initialContent={thread.content}
                                    createdAt={thread.created_at}
                                />
                            )}
                        </div>

                        {/* Linked brew */}
                        {thread.brew && (
                            <div className="mx-4 mt-3 max-w-sm">
                                <Link href={`/brew/${thread.brew.id}`} className="inline-flex items-center gap-2.5 bg-zinc-950/30 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 hover:bg-zinc-900/40 hover:border-zinc-700 transition group/brew">
                                    <div className="w-8 h-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800 flex-shrink-0">
                                        {thread.brew.image_url ? (
                                            <img
                                                src={thread.brew.image_url}
                                                className={`w-full h-full object-cover ${
                                                    (thread.brew.moderation_status === 'pending' || thread.brew.moderation_status === 'rejected') && !thread.brew.image_url.startsWith('/default_label')
                                                    ? 'filter blur-sm opacity-50' : ''
                                                }`}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-sm">🍺</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider leading-none mb-0.5">Betrifft Rezept</div>
                                        <div className="text-xs font-bold text-zinc-300 group-hover/brew:text-emerald-400 transition">{thread.brew.name}</div>
                                    </div>
                                    <span className="text-zinc-600 group-hover/brew:text-zinc-400 text-xs ml-1">→</span>
                                </Link>
                            </div>
                        )}

                        {/* Content */}
                        <div className="px-4 py-3">
                            <MarkdownContent content={thread.content} />
                        </div>

                        {/* Poll */}
                        {poll && (
                            <div className="px-4 pb-2">
                                <PollBlock poll={poll} currentUserId={user?.id ?? null} />
                            </div>
                        )}

                        {/* Vote bar + mobile actions */}
                        <div className="px-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
                            <VoteBar
                                targetId={thread.id}
                                targetType="thread"
                                initialCounts={voteCounts[thread.id] ?? { prost: 0, hilfreich: 0, feuer: 0 }}
                                initialUserVotes={userVotesArray}
                            />
                            {/* Mobile-only action buttons (visible on small screens) */}
                            <div className="flex md:hidden items-center gap-1">
                                {user && <SubscribeButton threadId={thread.id} initialSubscribed={isSubscribed} />}
                                {user && <BookmarkButton targetId={thread.id} targetType="thread" initialBookmarked={isThreadBookmarked} />}
                                <ReportButton targetId={thread.id} targetType="forum_thread" />
                            </div>
                        </div>
                    </div>

                    {/* Realtime new-post notifier */}
                    {(() => {
                        const lastAt = posts.length > 0 ? posts[posts.length - 1].created_at : thread.created_at;
                        return <RealtimePostBanner threadId={thread.id} lastPostAt={lastAt} />;
                    })()}

                    {/* ── Replies ───────────────────────────────────────── */}
                    {posts.length > 0 && (() => {
                        const rootPosts = posts.filter(p => p.parent_id === null);
                        return (
                            <div id="replies" className="space-y-1.5 pt-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3 px-1">
                                    Antworten · {(thread.reply_count ?? posts.length)}
                                </h3>

                                {rootPosts.map((post) => (
                                    <PostBranch
                                        key={post.id}
                                        post={post}
                                        allPosts={posts}
                                        depth={0}
                                        threadAuthorId={thread.author_id}
                                        voteCounts={voteCounts}
                                        userVotesArray={userVotesArray}
                                        currentUserId={user?.id ?? null}
                                        brewMap={brewMap}
                                    />
                                ))}
                            </div>
                        );
                    })()}

                    {/* Load more posts */}
                    {hasMorePosts && (
                        <PostsLoadMore
                            threadId={thread.id}
                            threadAuthorId={thread.author_id}
                            currentUserId={user?.id ?? null}
                            totalReplyCount={thread.reply_count ?? 0}
                            initialLoadedCount={posts.length}
                            pageSize={POSTS_PAGE_SIZE}
                        />
                    )}

                    {/* Reply Input or Login Prompt */}
                    {user ? (
                        thread.is_locked ? (
                            <div className="mt-6 pt-6 border-t border-zinc-800/60">
                                <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center flex flex-col items-center gap-2">
                                    <Lock size={18} className="text-zinc-600" />
                                    <h3 className="font-bold text-zinc-400 text-sm">Thread gesperrt</h3>
                                    <p className="text-zinc-600 text-xs">Dieser Thread akzeptiert keine neuen Antworten.</p>
                                </div>
                            </div>
                        ) : (
                            <ReplyInput threadId={thread.id} />
                        )
                    ) : (
                        <div className="mt-6 pt-6 border-t border-zinc-800/60 sticky bottom-6">
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-center">
                                <h3 className="font-bold text-white mb-1 text-sm">Du möchtest mitdiskutieren?</h3>
                                <p className="text-zinc-500 text-xs mb-4">Melde dich an, um Antworten zu schreiben.</p>
                                <Link href={`/login?next=/forum/thread/${thread.id}`} className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold text-sm transition">
                                    Einloggen
                                </Link>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            </>
            <ViewCountTracker threadId={id} />
        </ThreadInteractionWrapper>
    );
}
