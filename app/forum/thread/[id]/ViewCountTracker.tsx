'use client';

import { useEffect, useRef } from 'react';

/**
 * Fires a single view-count increment for the given forum thread.
 * Uses a `useRef` guard + `sessionStorage` to ensure the RPC is called
 * exactly once per browser session per thread, even in React StrictMode
 * (which invokes effects twice in development).
 */
export default function ViewCountTracker({ threadId }: { threadId: string }) {
    const tracked = useRef(false);

    useEffect(() => {
        // StrictMode safety: skip the second invocation in dev
        if (tracked.current) return;

        // Skip if already counted in this browser session
        const storageKey = `forum_view_${threadId}`;
        if (sessionStorage.getItem(storageKey)) return;

        tracked.current = true;
        sessionStorage.setItem(storageKey, '1');

        fetch('/api/forum/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId }),
        }).catch(() => {
            // fire-and-forget — silently ignore errors
        });
    }, [threadId]);

    return null;
}
