'use server';

import { createClient } from '@/lib/supabase-server';

/**
 * Phase 12.2 / 12.3 — Geo-Consent Server Actions
 *
 * Updates the most recent scan for a bottle with browser-based geodata
 * (city, region, country) after the user has given explicit consent.
 */

export async function updateScanWithGeoData(
  bottleId: string,
  geoData: {
    city: string | null;
    region: string | null;
    country: string | null;
  },
) {
  try {
    const supabase = await createClient();

    // Find the most recent scan for this bottle (within the last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentScan } = await supabase
      .from('bottle_scans')
      .select('id')
      .eq('bottle_id', bottleId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!recentScan) {
      console.warn('[Geo] No recent scan found for bottle', bottleId);
      return { success: false, reason: 'no_recent_scan' };
    }

    // Update the scan record with consent-based geo data
    const { error } = await supabase
      .from('bottle_scans')
      .update({
        detected_city: geoData.city,
        detected_region: geoData.region,
        detected_country: geoData.country,
        geo_consent_given: true,
      })
      .eq('id', recentScan.id);

    if (error) {
      console.error('[Geo] Failed to update scan with geo data:', error.message);
      return { success: false, reason: 'update_failed' };
    }

    return { success: true };
  } catch (e) {
    console.error('[Geo] Exception updating scan with geo data:', e);
    return { success: false, reason: 'exception' };
  }
}
