import { createClient } from '@/lib/supabase-server';
import { getAlgorithmSettings, ALGORITHM_DEFAULTS } from '@/lib/algorithm-settings';

export async function getForumCategories() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_categories')
        .select('*, thread_count:forum_threads(count)')
        .neq('slug', 'rezept-kommentare')
        .order('sort_order');
    return (data || []).map((cat: any) => ({
        ...cat,
        thread_count: cat.thread_count?.[0]?.count ?? 0
    }));
}

export async function getRecentThreads(limit = 8, sort: 'new' | 'top' = 'new') {
    const supabase = await createClient();
    const query = supabase
        .from('forum_threads')
        .select(`
            *,
            category:forum_categories(title, slug),
            author:profiles(id, display_name, avatar_url:logo_url, subscription_tier),
            brew:brews(id, name, image_url, moderation_status)
        `)
        .neq('thread_type', 'brew_comments')
        .limit(limit);

    if (sort === 'top') {
        query.order('view_count', { ascending: false });
    } else {
        query.order('last_reply_at', { ascending: false });
    }

    const { data, error } = await query;
    
    if (error) {
        console.error("Error fetching recent threads:", JSON.stringify(error, null, 2));
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('forum_threads')
            .select('*')
            .order('last_reply_at', { ascending: false })
            .limit(limit);
            
        if (!fallbackError) {
             return fallbackData || [];
        }
    }

    return data || [];
}


export async function getCategory(slug: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('forum_categories').select('*').eq('slug', slug).single();
    return data;
}

export async function getCategoryWithStats(slug: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_categories')
        .select('*, thread_count:forum_threads(count)')
        .eq('slug', slug)
        .single();
    if (!data) return null;
    return { ...data, thread_count: data.thread_count?.[0]?.count ?? 0 };
}

export async function getTrendingThreads(limit = 5) {
    const supabase = await createClient();

    // Load algorithm parameters (falls back to defaults if DB unavailable)
    const algoSettings = await getAlgorithmSettings().catch(() => ({ ...ALGORITHM_DEFAULTS }));
    const repliesWeight = algoSettings.forum_hot_replies_weight;
    const viewsDivisor  = algoSettings.forum_hot_views_divisor;
    const ageExponent   = algoSettings.forum_hot_age_exponent;
    const windowDays    = algoSettings.forum_hot_window_days;

    // Pull candidates from the configured look-back window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    const { data } = await supabase
        .from('forum_threads')
        .select(`
            id, title, view_count, reply_count, last_reply_at, created_at,
            category:forum_categories(title, slug)
        `)
        .gte('created_at', cutoff.toISOString())
        .is('deleted_at', null)
        .neq('thread_type', 'brew_comments')
        .limit(100);

    if (!data || data.length === 0) return [];

    const now = Date.now();

    // Hot score: (replies × W_r + views ÷ D_v) / (ageHours + 2)^E
    const scored = data.map(t => {
        const ageHours = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
        const replies = t.reply_count ?? 0;
        const views   = t.view_count  ?? 0;
        const score   = (replies * repliesWeight + views / viewsDivisor) / Math.pow(ageHours + 2, ageExponent);
        return { ...t, _hotScore: score };
    });

    return scored
        .sort((a, b) => b._hotScore - a._hotScore)
        .slice(0, limit);
}

export async function getRecentBrewCommentThreads(limit = 8) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_threads')
        .select(`
            id, title, reply_count, last_reply_at, created_at,
            brew:brews(id, name, image_url, style, brew_type)
        `)
        .eq('thread_type', 'brew_comments')
        .is('deleted_at', null)
        .order('last_reply_at', { ascending: false })
        .limit(limit);
    return data || [];
}

export async function getForumStats() {
    const supabase = await createClient();
    const [{ count: threadCount }, { count: postCount }] = await Promise.all([
        supabase.from('forum_threads').select('*', { count: 'exact', head: true }),
        supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
    ]);
    return { threadCount: threadCount ?? 0, postCount: postCount ?? 0 };
}

export async function getThreadsByCategory(
    categoryId: string,
    sort: 'new' | 'top' | 'replies' | 'unanswered' | 'solved' = 'new',
    limit = 20,
    offset = 0,
    tag?: string,
) {
    const supabase = await createClient();
    let query = supabase
        .from('forum_threads')
        .select(`
            *,
            author:profiles(id, display_name, avatar_url:logo_url, subscription_tier),
            category:forum_categories(title, slug),
            brew:brews(id, name, image_url, moderation_status)
        `)
        .eq('category_id', categoryId)
        .is('deleted_at', null)
        .order('is_pinned', { ascending: false });

    // Tag filter: tag must appear in the tags array
    if (tag) {
        query = query.contains('tags', [tag]);
    }

    if (sort === 'top') {
        query = query.order('view_count', { ascending: false });
    } else if (sort === 'replies') {
        query = query.order('reply_count', { ascending: false });
    } else if (sort === 'unanswered') {
        query = query.or('reply_count.is.null,reply_count.eq.0').order('last_reply_at', { ascending: false });
    } else if (sort === 'solved') {
        query = query.eq('is_solved', true).order('last_reply_at', { ascending: false });
    } else {
        query = query.order('last_reply_at', { ascending: false });
    }

    const { data } = await query.range(offset, offset + limit - 1);
    return data || [];
}

export async function incrementViewCount(threadId: string) {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('increment_forum_view_count', { thread_id: threadId });
}

export async function getThread(id: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_threads')
        .select(`
            *,
            author:profiles(id, display_name, avatar_url:logo_url, subscription_tier),
            category:forum_categories(*),
            brew:brews(id, name, image_url, moderation_status, brewery_id, style, brew_type, description, likes_count, brewery:breweries(name))
        `)
        .eq('id', id)
        .single();
    return data;
}

export async function getPosts(threadId: string, limit = 30, offset = 0) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_posts')
        .select(`
            *,
            author:profiles(id, display_name, avatar_url:logo_url, joined_at, subscription_tier)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
    return data || [];
}

export async function getUserForumActivity(userId: string) {
    const supabase = await createClient();
    
    // 1. Threads created by user
    const { data: ownThreads } = await supabase
        .from('forum_threads')
        .select(`
            *,
            category:forum_categories(title, slug)
        `)
        .eq('author_id', userId)
        .order('last_reply_at', { ascending: false })
        .limit(5);

    return ownThreads || [];
}

export async function getThreadByBrewId(brewId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_threads')
        .select('*')
        .eq('brew_id', brewId)
        .maybeSingle();
    return data || null;
}

export async function searchForumThreads(query: string, limit = 10) {    if (!query || query.trim().length < 2) return { threads: [], posts: [] };
    const supabase = await createClient();
    const q = query.trim();

    // Full-text search on threads
    const { data: threads } = await supabase
        .from('forum_threads')
        .select(`
            id, title, content, reply_count, view_count, last_reply_at, is_solved,
            category:forum_categories(title, slug),
            author:profiles(id, display_name)
        `)
        .textSearch('search_vector', q, { type: 'websearch', config: 'german' })
        .limit(limit);

    // Full-text search on posts — surfaces matching replies with their thread context
    const { data: posts } = await supabase
        .from('forum_posts')
        .select(`
            id, content, created_at,
            thread:forum_threads(id, title, category:forum_categories(title, slug)),
            author:profiles(id, display_name)
        `)
        .textSearch('search_vector', q, { type: 'websearch', config: 'german' })
        .limit(5);

    return { threads: threads || [], posts: posts || [] };
}

export type ReactionType = 'prost' | 'hilfreich' | 'feuer';
export type VoteCounts = { prost: number; hilfreich: number; feuer: number };
export type VoteMap = Record<string, VoteCounts>;       // keyed by target_id
export type UserVoteSet = Set<string>;                   // `${targetId}:${reactionType}`

export async function getVotesForThread(
    threadId: string,
    postIds: string[],
    userId?: string
): Promise<{ voteCounts: VoteMap; userVotes: UserVoteSet }> {
    const supabase = await createClient();
    const targetIds = [threadId, ...postIds];

    const { data } = await supabase
        .from('forum_votes')
        .select('target_id, reaction_type, user_id')
        .in('target_id', targetIds);

    const voteCounts: VoteMap = {};
    const userVotes: UserVoteSet = new Set();
    const empty: VoteCounts = { prost: 0, hilfreich: 0, feuer: 0 };

    for (const row of (data || [])) {
        if (!voteCounts[row.target_id]) voteCounts[row.target_id] = { ...empty };
        const rt = row.reaction_type as ReactionType;
        if (rt in voteCounts[row.target_id]) {
            voteCounts[row.target_id][rt]++;
        }
        if (userId && row.user_id === userId) {
            userVotes.add(`${row.target_id}:${row.reaction_type}`);
        }
    }

    return { voteCounts, userVotes };
}

export async function getUserBookmarkedIds(userId: string, targetIds: string[]): Promise<Set<string>> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_bookmarks')
        .select('target_id')
        .eq('user_id', userId)
        .in('target_id', targetIds);
    return new Set((data || []).map(r => r.target_id));
}

export interface SavedItem {
    bookmarkId: string;
    bookmarkedAt: string;
    targetType: 'thread' | 'post';
    thread?: {
        id: string;
        title: string;
        content?: string | null;
        last_reply_at: string;
        reply_count?: number | null;
        view_count?: number | null;
        is_solved?: boolean | null;
        tags?: string[] | null;
        category?: { title: string; slug: string } | null;
        author?: { id: string; display_name: string; logo_url?: string | null; subscription_tier?: string | null } | null;
        brew?: { id: string; name: string; image_url?: string | null; moderation_status?: string | null } | null;
    };
    post?: {
        id: string;
        content: string;
        created_at: string;
        deleted_at?: string | null;
        thread?: { id: string; title: string } | null;
        author?: { id: string; display_name: string; logo_url?: string | null } | null;
    };
}

/**
 * Fetches all bookmarked threads and posts for a user, fully hydrated.
 */
export async function getUserSavedContent(userId: string): Promise<SavedItem[]> {
    const supabase = await createClient();

    const { data: bookmarks } = await supabase
        .from('forum_bookmarks')
        .select('id, target_id, target_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (!bookmarks || bookmarks.length === 0) return [];

    const threadIds = bookmarks.filter(b => b.target_type === 'thread').map(b => b.target_id);
    const postIds   = bookmarks.filter(b => b.target_type === 'post').map(b => b.target_id);

    const [threadsRes, postsRes] = await Promise.all([
        threadIds.length > 0
            ? supabase
                .from('forum_threads')
                .select('id, title, content, last_reply_at, reply_count, view_count, is_solved, tags, category:forum_categories(title, slug), author:profiles(id, display_name, logo_url, subscription_tier), brew:brews(id, name, image_url, moderation_status)')
                .in('id', threadIds)
            : Promise.resolve({ data: [] }),
        postIds.length > 0
            ? supabase
                .from('forum_posts')
                .select('id, content, created_at, deleted_at, thread:forum_threads(id, title), author:profiles(id, display_name, logo_url)')
                .in('id', postIds)
            : Promise.resolve({ data: [] }),
    ]);

    const threadMap = new Map((threadsRes.data || []).map((t: any) => [t.id, t]));
    const postMap   = new Map((postsRes.data   || []).map((p: any) => [p.id, p]));

    return bookmarks.map(b => ({
        bookmarkId: b.id,
        bookmarkedAt: b.created_at,
        targetType: b.target_type as 'thread' | 'post',
        thread: b.target_type === 'thread' ? (threadMap.get(b.target_id) ?? undefined) : undefined,
        post:   b.target_type === 'post'   ? (postMap.get(b.target_id)   ?? undefined) : undefined,
    }));
}

// ─── Thread Subscriptions ─────────────────────────────────────────────────────

/** Returns true if the given user is currently subscribed to the thread. */
export async function getThreadSubscription(userId: string, threadId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('thread_id', threadId)
        .maybeSingle();
    return data !== null;
}

/** Returns user IDs of all subscribers for the given thread. */
export async function getThreadSubscriberIds(threadId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_subscriptions')
        .select('user_id')
        .eq('thread_id', threadId);
    return (data ?? []).map(r => r.user_id);
}

// ─── Polls ────────────────────────────────────────────────────────────────────

import type { PollData } from '@/app/forum/thread/[id]/PollBlock';

export async function getThreadPoll(threadId: string, userId?: string): Promise<PollData | null> {
    const supabase = await createClient();

    const { data: poll } = await supabase
        .from('forum_polls')
        .select('id, question, multiple_choice, ends_at')
        .eq('thread_id', threadId)
        .maybeSingle();

    if (!poll) return null;

    const { data: options } = await supabase
        .from('forum_poll_options')
        .select('id, label, sort_order')
        .eq('poll_id', poll.id)
        .order('sort_order');

    if (!options) return null;

    // Vote counts per option
    const optionIds = options.map(o => o.id);
    const { data: votes } = await supabase
        .from('forum_poll_votes')
        .select('option_id')
        .in('option_id', optionIds);

    const votesByOption: Record<string, number> = {};
    for (const v of votes ?? []) {
        votesByOption[v.option_id] = (votesByOption[v.option_id] ?? 0) + 1;
    }

    // Current user's votes
    let userVotedOptionIds: string[] = [];
    if (userId) {
        const { data: myVotes } = await supabase
            .from('forum_poll_votes')
            .select('option_id')
            .eq('user_id', userId)
            .in('option_id', optionIds);
        userVotedOptionIds = (myVotes ?? []).map(v => v.option_id);
    }

    const enrichedOptions = options.map(o => ({
        ...o,
        voteCount: votesByOption[o.id] ?? 0,
    }));

    return {
        id: poll.id,
        question: poll.question,
        multiple_choice: poll.multiple_choice,
        ends_at: poll.ends_at,
        options: enrichedOptions,
        totalVotes: Object.values(votesByOption).reduce((s, c) => s + c, 0),
        userVotedOptionIds,
    };
}
