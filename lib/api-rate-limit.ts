/**
 * Lightweight in-memory IP-based rate limiter for API routes.
 * 
 * Uses a sliding window approach. Works per-server instance
 * (resets on deploy/restart). Sufficient for protection against
 * basic abuse; for distributed setups, use @upstash/ratelimit.
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    const cutoff = now - windowMs;
    for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter(t => t > cutoff);
        if (entry.timestamps.length === 0) {
            store.delete(key);
        }
    }
}

interface RateLimitConfig {
    /** Max requests allowed within the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
    /** Milliseconds until the oldest request in window expires */
    retryAfterMs: number;
}

/**
 * Check whether a given identifier (typically IP) is within rate limits.
 * 
 * @example
 * ```ts
 * const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
 * const { success, remaining } = checkRateLimit(`forum-search:${ip}`, { maxRequests: 30, windowMs: 60_000 });
 * if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * ```
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const cutoff = now - config.windowMs;

    cleanup(config.windowMs);

    let entry = store.get(identifier);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(identifier, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);

    if (entry.timestamps.length >= config.maxRequests) {
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = oldestInWindow + config.windowMs - now;
        return {
            success: false,
            remaining: 0,
            retryAfterMs: Math.max(0, retryAfterMs),
        };
    }

    entry.timestamps.push(now);

    return {
        success: true,
        remaining: config.maxRequests - entry.timestamps.length,
        retryAfterMs: 0,
    };
}

// ── Pre-configured limiters for Forum API routes ───────────────────────────

/** Forum search: 30 requests / minute per IP */
export const FORUM_SEARCH_LIMIT: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 };

/** Forum threads list: 60 requests / minute per IP */
export const FORUM_THREADS_LIMIT: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 };

/** Forum view count: 120 requests / minute per IP (fires once per thread per session, but be generous) */
export const FORUM_VIEW_LIMIT: RateLimitConfig = { maxRequests: 120, windowMs: 60_000 };
