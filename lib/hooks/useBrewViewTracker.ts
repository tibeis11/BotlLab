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
 * - Uses a single module-level shared IntersectionObserver for all cards
 *   (instead of N observers for N cards — saves memory and avoids
 *   Safari's per-document observer limits)
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

// ─── Shared observer (module-level singleton) ─────────────────────────────────
// One observer for all mounted cards — far cheaper than N separate observers.
// Each Element maps to its intersection callback.

type EntryCallback = (isIntersecting: boolean) => void;
let sharedObserver: IntersectionObserver | null = null;
const callbackMap = new Map<Element, EntryCallback>();

function getSharedObserver(): IntersectionObserver {
  if (!sharedObserver && typeof window !== 'undefined') {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          callbackMap.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { threshold: 0.5 }, // ≥50 % of the card must be visible
    );
  }
  return sharedObserver!;
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
  // Tracks the currently observed element so we can unobserve on teardown
  const elementRef  = useRef<Element | null>(null);

  /**
   * Stable logView — only recreated when brewId / userId / source change.
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
   * Callback ref — registers/unregisters this element with the shared observer.
   * Recreated only when userId or logView changes.
   */
  const callbackRef = useCallback(
    (node: HTMLElement | null) => {
      // ── Teardown previous registration ─────────────────────────
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (elementRef.current) {
        callbackMap.delete(elementRef.current);
        getSharedObserver().unobserve(elementRef.current);
        elementRef.current = null;
      }

      // Skip for unauthenticated users, SSR, or unmounting
      if (!node || !userId || typeof window === 'undefined') return;

      // ── Register with the shared observer ─────────────────────
      elementRef.current = node;

      const handleIntersection = (isIntersecting: boolean) => {
        if (isIntersecting) {
          timerRef.current = setTimeout(logView, DWELL_THRESHOLD_MS);
        } else {
          if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      };

      callbackMap.set(node, handleIntersection);
      getSharedObserver().observe(node);
    },
    [userId, logView],
  );

  return callbackRef;
}

