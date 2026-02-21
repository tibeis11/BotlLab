"use client";
/**
 * useBrewViewTracker
 * ──────────────────
 * Tracks dwell-time on a Brew card and writes an implicit engagement signal
 * to the `brew_views` table once the card has been visible for at least
 * DWELL_THRESHOLD_MS milliseconds.
 *
 * - Only fires when the user is logged in (userId provided)
 * - Deduplicates within the browser session via sessionStorage
 * - Fires at most once per (session × brewId) pair — no spam inserts
 * - Uses a callback ref: lifecycle (mount / unmount / userId change) is
 *   handled inside the ref callback, no separate useEffect needed
 *
 * Usage:
 *   const cardRef = useBrewViewTracker({ brewId: brew.id, userId, source: 'discover' });
 *   <Link ref={cardRef}>...</Link>  or  <div ref={cardRef}>...</div>
 */

import { useCallback, useRef } from 'react';
import { useSupabase } from './useSupabase';

const DWELL_THRESHOLD_MS = 3_000; // 3 s before logging a view
const SESSION_KEY        = 'botllab_viewed_brews';

// ─── Session-deduplication helpers ───────────────────────────────────────────

function getSessionViewed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function markSessionViewed(brewId: string): void {
  try {
    const set = getSessionViewed();
    set.add(brewId);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // sessionStorage unavailable (SSR / private mode) — silently ignore
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface Options {
  brewId:  string;
  userId:  string | undefined;
  source?: 'discover' | 'search' | 'direct' | 'profile';
}

export function useBrewViewTracker({ brewId, userId, source = 'discover' }: Options) {
  const supabase    = useSupabase();
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /**
   * Stable logView function — captured by the callback ref closure.
   * useCallback deps include brewId/userId/source so a new function is only
   * created when those change (i.e. when the ref callback also recreates).
   */
  const logView = useCallback(async () => {
    if (!userId) return;
    
    // Respektiere Opt-Out
    if (sessionStorage.getItem('botllab_analytics_opt_out') === 'true') return;

    if (getSessionViewed().has(brewId)) return;
    markSessionViewed(brewId);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('brew_views').insert({
        user_id:       userId,
        brew_id:       brewId,
        dwell_seconds: Math.round(DWELL_THRESHOLD_MS / 1000),
        source,
      });
    } catch {
      // Non-critical — never surface errors to the user
    }
  }, [brewId, userId, source, supabase]);

  /**
   * Callback ref — sets up/tears down the IntersectionObserver whenever
   * the element mounts, unmounts, or `userId` / `logView` changes.
   */
  const callbackRef = useCallback(
    (node: HTMLElement | null) => {
      // ── Teardown any previous observer ─────────────────────────
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Skip for unauthenticated users, SSR, or unmounting
      if (!node || !userId || typeof window === 'undefined') return;

      // ── Set up a fresh observer ─────────────────────────────────
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            timerRef.current = setTimeout(logView, DWELL_THRESHOLD_MS);
          } else {
            if (timerRef.current !== null) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
          }
        },
        { threshold: 0.5 }, // ≥50% of the card must be visible
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [userId, logView],
  );

  return callbackRef;
}
