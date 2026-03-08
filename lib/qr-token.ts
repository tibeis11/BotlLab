import { createHmac } from 'crypto';

/**
 * Generates a permanent, bottle-specific HMAC token for QR code URLs.
 *
 * The token is deterministic: same bottleId + same secret = same token.
 * This means labels can be reprinted without invalidating existing QR codes.
 *
 * SERVER-ONLY — never import this in client-side code.
 */
export function generateQrToken(bottleId: string): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret) {
    throw new Error('[qr-token] QR_TOKEN_SECRET env variable is not set');
  }
  return createHmac('sha256', secret)
    .update(bottleId)
    .digest('hex')
    .slice(0, 16); // 16 hex chars = 8 bytes — compact for QR codes
}
