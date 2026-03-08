'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyQrToken } from '@/lib/actions/qr-token-actions';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedVerification(bottleId: string): boolean {
  try {
    const raw = localStorage.getItem(`qr_verified_${bottleId}`);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Date.now() - ts < CACHE_TTL_MS) return true;
    localStorage.removeItem(`qr_verified_${bottleId}`);
    return false;
  } catch {
    return false;
  }
}

function cacheVerification(bottleId: string) {
  try {
    localStorage.setItem(`qr_verified_${bottleId}`, String(Date.now()));
  } catch { /* localStorage unavailable */ }
}

function cleanUrlToken() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('_t')) {
      url.searchParams.delete('_t');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch { /* SSR or error */ }
}

/**
 * Verifies whether the current page visit originated from a physical QR code scan.
 * Checks the `_t` URL parameter (HMAC token) against the server, caches the result
 * in localStorage for 24h, and cleans the token from the URL.
 *
 * @param bottleId - The bottle UUID (pass null while loading)
 * @returns { isQrVerified, isVerifying }
 */
export function useQrVerification(bottleId: string | null) {
  const searchParams = useSearchParams();
  const [isQrVerified, setIsQrVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const verifiedRef = useRef(false);
  const qrTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bottleId || verifiedRef.current) return;

    // 1. Check localStorage cache first
    if (getCachedVerification(bottleId)) {
      setIsQrVerified(true);
      verifiedRef.current = true;
      // Restore cached token for nonce-based features (BTB)
      try {
        qrTokenRef.current = localStorage.getItem(`qr_token_${bottleId}`);
      } catch { /* */ }
      cleanUrlToken();
      return;
    }

    // 2. Check URL token
    const token = searchParams.get('_t');
    if (!token) return; // No token, no verification

    verifiedRef.current = true; // prevent re-runs
    setIsVerifying(true);

    verifyQrToken(token, bottleId).then((result) => {
      if (result.valid) {
        setIsQrVerified(true);
        qrTokenRef.current = token;
        cacheVerification(bottleId);
        // Also cache the raw token for nonce-based features
        try { localStorage.setItem(`qr_token_${bottleId}`, token); } catch { /* */ }
      }
      cleanUrlToken();
      setIsVerifying(false);
    }).catch(() => {
      cleanUrlToken();
      setIsVerifying(false);
    });
  }, [bottleId, searchParams]);

  return { isQrVerified, isVerifying, qrToken: qrTokenRef.current };
}
