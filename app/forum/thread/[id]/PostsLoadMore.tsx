'use client';

import { useState, useCallback } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import ClientForumPost from './ClientForumPost';
import type { VoteCounts } from '@/lib/forum-service';

interface PostAuthor {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    tier: string | null;
    joined_at: string | null;
    subscription_tier: string | null;
}

interface PostData {
    id: string;
    content: string;
    author_id: string | null;
    thread_id: string;
    parent_id: string | null;
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
    author: PostAuthor | null;
}

interface PostsLoadMoreProps {
    threadId: string;
    threadAuthorId: string | null;
    currentUserId: string | null;
    /** Total reply count from the thread (denormalized) */
    totalReplyCount: number;
    /** How many posts were initially loaded */
    initialLoadedCount: number;
    /** The page size used for initial load */
    pageSize?: number;
}

export default function PostsLoadMore({
    threadId,
    threadAuthorId,
    currentUserId,
    totalReplyCount,
    initialLoadedCount,
    pageSize = 30,
}: PostsLoadMoreProps) {
    const [extraPosts, setExtraPosts] = useState<PostData[]>([]);
    const [voteCounts, setVoteCounts] = useState<Record<string, VoteCounts>>({});
    const [userVotes, setUserVotes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(initialLoadedCount);

    const remaining = Math.max(0, totalReplyCount - initialLoadedCount - extraPosts.length);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        try {
            const params = new URLSearchParams({
                threadId,
                offset: String(offset),
                limit: String(pageSize),
                ...(currentUserId ? { userId: currentUserId } : {}),
            });

            const res = await fetch(`/api/forum/posts?${params}`);
            if (!res.ok) return;

            const data = await res.json();
            const newPosts: PostData[] = data.posts ?? [];

            if (newPosts.length < pageSize) setHasMore(false);
            if (newPosts.length > 0) {
                setExtraPosts(prev => [...prev, ...newPosts]);
                setOffset(prev => prev + newPosts.length);
                setVoteCounts(prev => ({ ...prev, ...(data.voteCounts ?? {}) }));
                setUserVotes(prev => {
                    const merged = new Set([...prev, ...(data.userVotes ?? [])]);
                    return Array.from(merged);
                });
            }
        } catch {
            // fail silently
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, offset, threadId, currentUserId, pageSize]);

    // Build tree from extra posts for threaded rendering
    const rootPosts = extraPosts.filter(p => p.parent_id === null);
    const childrenMap = new Map<string, PostData[]>();
    extraPosts.forEach(p => {
        if (p.parent_id) {
            const existing = childrenMap.get(p.parent_id) || [];
            existing.push(p);
            childrenMap.set(p.parent_id, existing);
        }
    });

    function renderPostTree(post: PostData, depth: number) {
        const children = childrenMap.get(post.id) || [];
        const MAX_DEPTH = 3;
        const childDepth = Math.min(depth + 1, MAX_DEPTH);

        return (
            <div key={post.id} className={depth > 0 ? 'mt-0' : undefined}>
                <ClientForumPost
                    post={post}
                    threadAuthorId={threadAuthorId}
                    initialCounts={voteCounts[post.id] ?? { prost: 0, hilfreich: 0, feuer: 0 }}
                    initialUserVotes={userVotes}
                />
                {children.length > 0 && (
                    <div className={`mt-3 space-y-3 ${
                        depth < MAX_DEPTH
                            ? 'ml-4 md:ml-8 border-l-2 border-border pl-3 md:pl-5'
                            : ''
                    }`}>
                        {children.map(child => renderPostTree(child, childDepth))}
                    </div>
                )}
            </div>
        );
    }

    if (remaining <= 0 && extraPosts.length === 0 && !hasMore) return null;

    return (
        <>
            {/* Render dynamically loaded posts */}
            {rootPosts.length > 0 && (
                <div className="space-y-4">
                    {rootPosts.map(post => renderPostTree(post, 0))}
                </div>
            )}

            {/* Load more button */}
            {hasMore && remaining > 0 && (
                <div className="flex justify-center py-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-text-muted text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Antworten laden…</span>
                        </div>
                    ) : (
                        <button
                            onClick={loadMore}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary border border-border-hover hover:border-border-active rounded-xl transition-colors bg-surface/40 hover:bg-surface/70"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Weitere {Math.min(remaining, pageSize)} von {remaining} Antworten laden
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
