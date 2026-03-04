import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-rate-limit';

/**
 * Phase 12.2 — Reverse-Geocode Server Route
 *
 * Client sendet nur lat/lng → Server fragt Nominatim ab →
 * nur Stadt + Region + Land werden zurückgegeben.
 * lat/lng verlassen nie den eigenen Server und werden nicht geloggt.
 *
 * Nominatim TOS: max 1 req/s, custom User-Agent erforderlich.
 */

// Rate-Limit: Max 2 requests / minute per IP (generous; each user should call this at most once)
const GEO_RESOLVE_LIMIT = { maxRequests: 2, windowMs: 60_000 };

interface GeoResolveRequest {
  lat: number;
  lng: number;
}

interface GeoResolveResponse {
  city: string | null;
  region: string | null;
  country: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate-limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const { success, retryAfterMs } = checkRateLimit(`geo-resolve:${ip}`, GEO_RESOLVE_LIMIT);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    // 2. Parse & validate body
    const body: GeoResolveRequest = await request.json();
    const { lat, lng } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'lat/lng out of range' }, { status: 400 });
    }

    // 3. Nominatim Reverse Geocoding (EU-hosted, DSGVO-konform)
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
    nominatimUrl.searchParams.set('lat', String(lat));
    nominatimUrl.searchParams.set('lon', String(lng));
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('zoom', '10'); // City-level detail
    nominatimUrl.searchParams.set('addressdetails', '1');

    const nominatimResponse = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'BotlLab/1.0 (https://botllab.com; kontakt@botllab.com)',
        'Accept-Language': 'de,en',
      },
      // Timeout: 5 seconds
      signal: AbortSignal.timeout(5000),
    });

    if (!nominatimResponse.ok) {
      console.error('[Geo] Nominatim error:', nominatimResponse.status, nominatimResponse.statusText);
      return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 });
    }

    const nominatimData = await nominatimResponse.json();

    // 4. Extract only city + region + country (privacy-first: discard everything else)
    const address = nominatimData.address || {};

    const result: GeoResolveResponse = {
      city: address.city || address.town || address.village || address.municipality || null,
      region: address.state || address.county || null,
      country: address.country || null,
    };

    // IMPORTANT: lat/lng are NOT included in the response — they stay on the server
    // and are discarded after this request completes.

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Geocoding timeout' }, { status: 504 });
    }
    console.error('[Geo] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
