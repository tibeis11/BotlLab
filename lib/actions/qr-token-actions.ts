'use server';

import { createHmac, timingSafeEqual } from 'crypto';
import { generateQrToken } from '@/lib/qr-token';

/**
 * Verifies a QR token against a bottle ID server-side.
 * The secret never leaves the server — only a boolean result is returned.
 */
export async function verifyQrToken(
  token: string,
  bottleId: string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const secret = process.env.QR_TOKEN_SECRET;
    if (!secret) return { valid: false, reason: 'misconfigured' };

    const expected = createHmac('sha256', secret)
      .update(bottleId)
      .digest('hex')
      .slice(0, 16);

    // Length mismatch check before timingSafeEqual (would throw otherwise)
    if (token.length !== expected.length) {
      return { valid: false, reason: 'invalid_signature' };
    }

    const match = timingSafeEqual(
      Buffer.from(token, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );

    return match ? { valid: true } : { valid: false, reason: 'invalid_signature' };
  } catch {
    return { valid: false, reason: 'parse_error' };
  }
}

/**
 * Batch-generates QR tokens for multiple bottles.
 * Called from client-side label generators before creating PDFs/labels.
 * Returns a map of bottleId → token.
 */
export async function generateQrTokensForBottles(
  bottleIds: string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const id of bottleIds) {
    result[id] = generateQrToken(id);
  }
  return result;
}
