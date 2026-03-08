'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ForumThreadCard, { type ForumThread } from './ForumThreadCard';

interface ThreadListLoadMoreProps {
    initialThreads: ForumThread[];
    categoryId: string;
    sort: 'new' | 'top' | 'replies' | 'unanswered' | 'solved';
    /** Number of items per page (must match what the server initially fetched). */
    pageSize?: number;
    /** Optional tag filter. */
    tag?: string;
}

const SENTINEL_CLASS = 'thread-list-sentinel';

export default function ThreadListLoadMore({
    initialThreads,
    categoryId,
    sort,
    pageSize = 20,
    tag,
}: ThreadListLoadMoreProps) {
    const [threads, setThreads] = useState<ForumThread[]>(initialThreads);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialThreads.length >= pageSize);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const offset = threads.length;
            const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : '';
            const res = await fetch(
                `/api/forum/threads?categoryId=${categoryId}&sort=${sort}&offset=${offset}&limit=${pageSize}${tagParam}`
            );
            if (!res.ok) return;
            const { threads: newThreads } = await res.json() as { threads: ForumThread[] };
            if (newThreads.length < pageSize) setHasMore(false);
            if (newThreads.length > 0) setThreads(prev => [...prev, ...newThreads]);
        } catch {
            // fail silently
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, threads.length, categoryId, sort, pageSize]);

    // Intersection Observer — auto-load when sentinel enters viewport
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: '200px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    // Separate pinned (always show at top, don't paginate) from regular
    const pinned   = threads.filter(t => t.is_pinned);
    const regular  = threads.filter(t => !t.is_pinned);

    return (
        <div className="space-y-5">
            {/* Pinned threads */}
            {pinned.length > 0 && (
                <div className="space-y-2">
                    {pinned.map(thread => (
                        <ForumThreadCard key={thread.id} thread={thread} showCategory={false} />
                    ))}
                </div>
            )}

            {/* Regular threads */}
            {regular.length > 0 && (
                <div className="space-y-2">
                    {regular.map(thread => (
                        <ForumThreadCard key={thread.id} thread={thread} showCategory={false} />
                    ))}
                </div>
            )}

            {/* Empty state (delegated to parent when no threads at all) */}

            {/* Sentinel + loading indicator */}
            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-text-muted text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Threads laden…</span>
                        </div>
                    ) : (
                        <button
                            onClick={loadMore}
                            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-hover hover:border-border-active rounded-xl transition-colors bg-surface/40"
                        >
                            Mehr laden
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
