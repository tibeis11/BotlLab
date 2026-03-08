'use client';

import { useClaimAnonymousSessions } from '@/app/hooks/useClaimAnonymousSessions';

/**
 * Invisible component that runs inside AuthProvider.
 * Automatically claims pending anonymous BTB/VibeCheck sessions
 * when a user signs in or registers.
 */
export default function AnonymousSessionClaimer() {
  useClaimAnonymousSessions();
  return null;
}
