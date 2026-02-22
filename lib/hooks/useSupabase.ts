"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useMemo } from "react";
import { Database } from "@/lib/database.types";

/**
 * Custom lock implementation that falls back gracefully when Navigator.locks
 * is unavailable or times out (common on mobile browsers).
 */
const navigatorLockWithFallback = async (
  name: string,
  acquireTimeout: number,
  fn: () => Promise<any>
) => {
  if (typeof navigator !== 'undefined' && navigator?.locks?.request) {
    try {
      return await navigator.locks.request(
        name,
        acquireTimeout > 0 ? { mode: 'exclusive' } : { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          if (!lock) return await fn();
          return await fn();
        }
      );
    } catch {
      return await fn();
    }
  }
  return await fn();
};

export function useSupabase() {
  return useMemo(
    () =>
      createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            flowType: 'pkce',
            persistSession: true,
            lock: navigatorLockWithFallback,
          },
        }
      ),
    [],
  );
}
