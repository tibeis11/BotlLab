'use client';

// ============================================================================
// useClaimAnonymousSessions — Post-Registration Attribution Hook
//
// Runs after a user signs in/up and checks for pending anonymous game
// sessions (BTB + VibeCheck) stored in localStorage or URL params.
// If found, calls the server-side claiming RPC to attribute the session.
// ============================================================================

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { claimAnonymousSession, type ClaimResult } from '@/lib/actions/beat-the-brewer-actions';

const STORAGE_KEYS = ['btb_pending_token', 'vibe_pending_token'] as const;
const STORAGE_KEY_PREFIXES = ['btb_pending_token_', 'vibe_pending_token_'] as const;

export function useClaimAnonymousSessions() {
  const { user, loading } = useAuth();
  const claimedRef = useRef(false);

  useEffect(() => {
    // Only run once per mount, when user is authenticated and not loading
    if (loading || !user || claimedRef.current) return;
    claimedRef.current = true;

    async function claimPending() {
      const tokensToClaim: string[] = [];

      // 1. Check URL params (from registration CTA link)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const claimToken = urlParams.get('claim_token');
        if (claimToken) {
          tokensToClaim.push(claimToken);
          // Clean up URL without reload
          const url = new URL(window.location.href);
          url.searchParams.delete('claim_token');
          window.history.replaceState({}, '', url.toString());
        }
      } catch { /* URL parsing may fail in some contexts */ }

      // 2. Check localStorage for pending tokens (legacy global keys)
      for (const key of STORAGE_KEYS) {
        try {
          const token = localStorage.getItem(key);
          if (token && !tokensToClaim.includes(token)) {
            tokensToClaim.push(token);
          }
        } catch { /* localStorage may be unavailable */ }
      }

      // 2b. Phase 6.4: Check session-scoped localStorage keys (btb_pending_token_*, vibe_pending_token_*)
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (STORAGE_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
            const token = localStorage.getItem(key);
            if (token && !tokensToClaim.includes(token)) {
              tokensToClaim.push(token);
            }
          }
        }
      } catch { /* localStorage may be unavailable */ }

      if (tokensToClaim.length === 0) return;

      // 3. Claim all pending tokens
      const results: ClaimResult[] = [];
      for (const token of tokensToClaim) {
        try {
          const result = await claimAnonymousSession(token);
          results.push(result);
        } catch (err) {
          console.error('[claim] Failed to claim token:', err);
        }
      }

      // 4. Clean up localStorage after successful claims (legacy + session-scoped keys)
      for (const key of STORAGE_KEYS) {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
      }
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && STORAGE_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) localStorage.removeItem(key);
      } catch { /* ignore */ }

      // Log successful claims for debugging
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        console.log(`[claim] Successfully claimed ${successCount} anonymous session(s)`);
      }
    }

    claimPending();
  }, [user, loading]);
}
