import { createHmac } from 'crypto';

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Convert raw bytes to a Base62 string, zero-padded to `minLength`. */
export function bytesToBase62(buf: Buffer, minLength = 0): string {
  // Work with an array of decimal digits to avoid BigInt (ES2017 compat)
  // Start with the byte values and repeatedly divide by 62
  let digits = Array.from(buf); // each element 0-255
  const base62Chars: string[] = [];

  while (digits.some(d => d !== 0)) {
    let remainder = 0;
    const next: number[] = [];
    for (const d of digits) {
      const val = remainder * 256 + d;
      next.push(Math.floor(val / 62));
      remainder = val % 62;
    }
    base62Chars.push(BASE62_CHARS[remainder]);
    // Remove leading zeros for efficiency
    digits = next.length > 0 ? next : [0];
    while (digits.length > 1 && digits[0] === 0) digits.shift();
  }

  base62Chars.reverse();
  const result = base62Chars.join('') || '0';
  return result.padStart(minLength, '0');
}

/**
 * Generates a permanent, bottle-specific HMAC token for QR code URLs.
 *
 * The token is deterministic: same bottleId + same secret = same token.
 * This means labels can be reprinted without invalidating existing QR codes.
 *
 * Output: 9-char Base62 string derived from 6 bytes of the HMAC-SHA256.
 * Embedded in QR URLs with a dot separator: /b/{shortCode}.{token}
 *
 * SERVER-ONLY — never import this in client-side code.
 */
export function generateQrToken(bottleId: string): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret) {
    throw new Error('[qr-token] QR_TOKEN_SECRET env variable is not set');
  }
  const hmac = createHmac('sha256', secret).update(bottleId).digest();
  // 6 bytes = 48 bits of entropy → 9 chars in Base62 (62^9 > 2^48)
  return bytesToBase62(hmac.subarray(0, 6), 9);
}

/**
 * Generates the legacy 16-char hex token for backward compatibility checks.
 * Used only during verification to accept old QR codes.
 */
export function generateQrTokenLegacy(bottleId: string): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret) {
    throw new Error('[qr-token] QR_TOKEN_SECRET env variable is not set');
  }
  return createHmac('sha256', secret)
    .update(bottleId)
    .digest('hex')
    .slice(0, 16);
}
