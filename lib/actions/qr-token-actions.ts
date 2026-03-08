'use server';

import { timingSafeEqual } from 'crypto';
import { generateQrToken, generateQrTokenLegacy } from '@/lib/qr-token';

/**
 * Verifies a QR token against a bottle ID server-side.
 * Supports both legacy hex tokens (16 chars) and new Base62 tokens (9 chars).
 * The secret never leaves the server — only a boolean result is returned.
 */
export async function verifyQrToken(
  token: string,
  bottleId: string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const secret = process.env.QR_TOKEN_SECRET;
    if (!secret) return { valid: false, reason: 'misconfigured' };

    // Try new Base62 format first (9-char tokens)
    const expectedNew = generateQrToken(bottleId);
    if (
      token.length === expectedNew.length &&
      timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(expectedNew, 'utf8'))
    ) {
      return { valid: true };
    }

    // Fall back to legacy hex format (16-char tokens) for old QR codes
    const expectedLegacy = generateQrTokenLegacy(bottleId);
    if (
      token.length === expectedLegacy.length &&
      timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(expectedLegacy, 'utf8'))
    ) {
      return { valid: true };
    }

    return { valid: false, reason: 'invalid_signature' };
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
