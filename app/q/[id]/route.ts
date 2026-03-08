import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy QR Code Fallback Route — /q/[id]
 *
 * Old printed labels may point to /q/[id]. This route silently redirects to /b/[id]
 * without a signed token, so the user reaches the page but isQrVerified = false
 * (interactive features like BTB, VibeCheck, and Ratings are locked).
 *
 * New labels embed a pre-signed HMAC token directly in the /b/ URL:
 *   botllab.de/b/ABC123?_t=<hmac_token>
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botllab.de';
  return NextResponse.redirect(`${baseUrl}/b/${id}`, { status: 302 });
}
