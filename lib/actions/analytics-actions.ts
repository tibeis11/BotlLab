'use server'

import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { ANALYTICS_TIER_FEATURES, UserTier } from '@/lib/analytics-tier-features'
import { getAlgorithmSettings } from '@/lib/algorithm-settings'

type AnalyticsCategory = 'monetization' | 'ux' | 'system' | 'engagement' | 'ai' | 'content';

type AnalyticsEvent = {
  event_type: string
  category: AnalyticsCategory
  payload?: Record<string, any>
  path?: string // Optional override, otherwise inferred from referer? (Hard to get in Server Action, better passed or ignored)
  response_time_ms?: number // Optional: server-side route latency in ms
}

/**
 * Tracks a business event for analytics.
 * Respects user's opt-out setting (GDPR).
 */
export async function trackEvent(event: AnalyticsEvent) {
  try {
    const supabase = await createClient()
    
    // 1. Identify User
    const { data: { user } } = await supabase.auth.getUser()
    
    // 2. Check Opt-Out Status (if user is logged in)
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('analytics_opt_out')
            .eq('id', user.id)
            .single();
            
        // ABORT if user opted out
        if (profile?.analytics_opt_out === true) {
            console.log(`[Analytics] Skipped event '${event.event_type}' due to user opt-out.`);
            return;
        }
    }

    // 3. Gather Context
    const headerStore = await headers()
    const userAgent = headerStore.get('user-agent') || 'unknown'
    // Note: In server actions, getting the path is tricky without passing it. 
    // We rely on the caller passing it if important, or store 'server-action'.

    // 4. Insert Event
    const { error } = await supabase.from('analytics_events').insert({
      user_id: user?.id || null, // Can be null if we track anonymous landing page hits later
      event_type: event.event_type,
      category: event.category,
      payload: event.payload || {},
      path: event.path || 'server-action',
      user_agent: userAgent,
      ...(event.response_time_ms != null ? { response_time_ms: event.response_time_ms } : {}),
    });

    if (error) {
      // Log error silently, don't crash the app for analytics
      console.error('[Analytics] Insert Error:', error.message);
    } else {
    //   console.log(`[Analytics] Tracked: ${event.event_type}`);
    }

  } catch (e) {
    console.error('[Analytics] System Exception:', e);
  }
}

/**
 * Atomically increment total_profile_views for a user.
 * Server action to avoid client-side race conditions.
 * SQL equivalent: UPDATE profiles SET total_profile_views = total_profile_views + 1 WHERE id = userId
 *
 * Note: For true atomicity, add a Supabase RPC:
 *   create or replace function increment_profile_views(user_id uuid)
 *   returns void language sql security definer as $$
 *     update profiles set total_profile_views = coalesce(total_profile_views, 0) + 1 where id = user_id;
 *   $$;
 */
export async function incrementProfileViews(userId: string): Promise<void> {
  try {
    const supabase = await createClient();
    // Use Supabase RPC if available, otherwise fall back to select+update on the server
    const { error: rpcError } = await supabase.rpc('increment_profile_views', { p_profile_id: userId });
    if (rpcError) {
      // Fallback: read + write on server side (less race-prone than client-side)
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_profile_views')
        .eq('id', userId)
        .single();
      await supabase
        .from('profiles')
        .update({ total_profile_views: (profile?.total_profile_views ?? 0) + 1 })
        .eq('id', userId);
    }
  } catch (e) {
    // Non-critical: swallow errors, don't break page load
    console.error('[Analytics] incrementProfileViews error:', e);
  }
}

/**
 * Track when user hits a limit (monetization trigger)
 * Simplified wrapper for consistent limit tracking
 */
export async function trackLimitHit(
  limitType: 'brews' | 'bottles' | 'members' | 'remix',
  payload: {
    current: number;
    limit: number;
    tier: string;
    brewery_id?: string;
    [key: string]: any;
  }
) {
  return trackEvent({
    event_type: `limit_reached_${limitType}`,
    category: 'monetization',
    payload: {
      ...payload,
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Detect device type from User-Agent string
 */
function detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
    return 'mobile';
  }
  if (/ipad|tablet|kindle/.test(ua)) {
    return 'tablet';
  }
  if (/mozilla|chrome|safari|firefox|opera|edge/.test(ua)) {
    return 'desktop';
  }
  
  return 'unknown';
}

// =====================================================
// CSV EXPORT (Brewery+ Feature)
// =====================================================

/**
 * Export analytics data as CSV for Brewery+ tier users
 * @param breweryId - Brewery ID to export data for
 * @param options - Filter options (date range, brew)
 * @returns CSV string or error
 */
export async function exportAnalyticsCSV(
  breweryId: string,
  options: {
    startDate?: string;
    endDate?: string;
    brewId?: string;
  } = {}
): Promise<{ data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Check tier access (Brewery+ required)
    // The logged-in user must be the owner of the brewery
    const { data: member, error: memberError } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', breweryId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      console.error('[CSV Export] Member query error:', memberError);
      return { error: 'Error checking membership: ' + memberError.message };
    }

    if (!member || member.role !== 'owner') {
      return { error: 'Only brewery owners can export analytics' };
    }

    // Check the logged-in user's (= owner's) tier
    const { data: ownerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[CSV Export] Profile query error:', profileError);
      return { error: 'Error checking tier: ' + profileError.message };
    }

    const tier = ownerProfile?.subscription_tier || 'free';
    if (tier === 'free' || tier === 'brewer') {
      return { error: 'CSV export requires Brewery tier or higher' };
    }

    // Fetch raw scan data with date filters
    let query = supabase
      .from('bottle_scans')
      .select(`
        created_at,
        bottle_id,
        brew_id,
        brews(name, style),
        country_code,
        city,
        device_type,
        scan_source
      `)
      .eq('brewery_id', breweryId)
      .order('created_at', { ascending: false });

    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }
    if (options.brewId) {
      query = query.eq('brew_id', options.brewId);
    }

    const { data: scans, error } = await query.limit(10000); // Max 10k rows

    if (error) throw error;
    if (!scans || scans.length === 0) {
      return { error: 'No data available for export' };
    }

    // Generate CSV
    const headers = [
      'Timestamp',
      'Brew Name',
      'Brew Style',
      'Country',
      'City',
      'Device',
      'Source',
      'Bottle ID',
      'Brew ID'
    ];

    const rows = scans.map(scan => [
      new Date(scan.created_at).toISOString(),
      (scan.brews as any)?.name || 'Unknown',
      (scan.brews as any)?.style || 'Unknown',
      scan.country_code || '',
      scan.city || '',
      scan.device_type || '',
      scan.scan_source || '',
      scan.bottle_id,
      scan.brew_id || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return { data: csvContent };
  } catch (err: any) {
    console.error('CSV Export Error:', err);
    return { error: err.message || 'Failed to export CSV' };
  }
}

/**
 * Simple bot detection from User-Agent
 */
function isBot(userAgent: string): boolean {
  return /bot|crawler|spider|crawling|lighthouse|pagespeed/i.test(userAgent);
}

/**
 * Track bottle QR code scan (for brewery analytics)
 * GDPR-Compliant: No IP storage, respects user opt-out
 * 
 * @param bottleId - UUID of the scanned bottle
 * @param payload - Additional context (brew, brewery, viewer)
 */
export async function trackBottleScan(
  bottleId: string,
  payload?: {
    brewId?: string;
    breweryId?: string;
    viewerUserId?: string;
    /** Phase 7.3: derived source — now includes 'social' */
    scanSource?: 'qr_code' | 'direct_link' | 'social' | 'share';
    /** Phase 7.2: UTM campaign parameters */
    utmSource?:    string;
    utmMedium?:    string;
    utmCampaign?:  string;
    /** Phase 7.2: normalised referrer domain, e.g. 'instagram.com' */
    referrerDomain?: string;
    /** Phase 10: Optional GPS coordinates from navigator.geolocation (double opt-in) */
    gpsLat?: number;
    gpsLng?: number;
    /** CIS Environment Context: client-reported local time (ISO 8601 + TZ offset).
     * The server runs UTC; this is the only way to know the user's actual hour. */
    localTime?: string;
  }
) {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    
    // 1. Bot Check: Skip tracking for bots
    const userAgent = headersList.get('user-agent') || 'unknown';
    if (isBot(userAgent)) {
      console.log('[Analytics] Bot detected, skipping scan tracking');
      return;
    }

    // 2. Check Opt-Out (if viewer is logged in)
    if (payload?.viewerUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('analytics_opt_out')
        .eq('id', payload.viewerUserId)
        .single();
        
      if (profile?.analytics_opt_out === true) {
        console.log('[Analytics] Skipped bottle scan tracking due to user opt-out');
        return;
      }
    }
    
    // 3. Privacy-Friendly Geo Lookup (In-Memory!)
    const rawIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                  headersList.get('x-real-ip') || 
                  'unknown';
    
    // Use Vercel's geo headers if available (production)
    // Otherwise fall back to 'unknown' (dev environment)
    const geoData = {
      country:   headersList.get('x-vercel-ip-country')   || 'unknown',
      city:      headersList.get('x-vercel-ip-city')      || 'unknown',
      latitude:  headersList.get('x-vercel-ip-latitude')  ?? null,
      longitude: headersList.get('x-vercel-ip-longitude') ?? null,
    };

    // Phase 7.1 — Dev-mode mock for Vercel geo headers (not available locally)
    if (process.env.NODE_ENV === 'development') {
      if (!geoData.country || geoData.country === 'unknown') geoData.country   = 'DE';
      if (!geoData.city    || geoData.city    === 'unknown') geoData.city      = 'M\u00fcnchen';
      if (!geoData.latitude)                                  geoData.latitude  = '48.1351';
      if (!geoData.longitude)                                 geoData.longitude = '11.5820';
    }

    // IMPORTANT: We discard 'rawIp' immediately and never store it!

    // Phase 10: H3 Snapping — Privacy-First Geolocation
    // If the client provided GPS coordinates (double opt-in), snap to H3 hexagon center.
    // Original coordinates are NEVER stored — only the H3 cell center (~450m accuracy).
    let geoSource: 'gps_snapped_h3' | 'ip_vercel' = 'ip_vercel';
    let finalLat: number | null = geoData.latitude ? parseFloat(geoData.latitude) : null;
    let finalLng: number | null = geoData.longitude ? parseFloat(geoData.longitude) : null;

    if (payload?.gpsLat != null && payload?.gpsLng != null) {
      try {
        const { latLngToCell, cellToLatLng } = await import('h3-js');
        // Resolution 8 = ~461m edge length → spatial k-anonymity
        const h3Index = latLngToCell(payload.gpsLat, payload.gpsLng, 8);
        const [snappedLat, snappedLng] = cellToLatLng(h3Index);
        finalLat = snappedLat;
        finalLng = snappedLng;
        geoSource = 'gps_snapped_h3';
      } catch (h3Err) {
        console.error('[Analytics] H3 snapping failed, falling back to IP geo:', h3Err);
        // Fallback: keep IP-based coordinates
      }
    }

    // 4. Daily Rotating Hash for Unique Visitors
    // Salt from ENV or default (rotates daily via date string)
    const dailySalt = new Date().toISOString().slice(0, 10) + (process.env.ANALYTICS_SALT || 'default-salt-change-me');
    const sessionHash = crypto
      .createHash('sha256')
      .update(rawIp + userAgent + dailySalt)
      .digest('hex');

    // 5. Check if viewer is bottle owner + compute bottle age (Phase 7.4)
    let isOwnerScan    = false;
    let bottleAgeDays: number | null = null;
    {
      const { data: bottleRecord } = await supabase
        .from('bottles')
        .select('user_id, filled_at')
        .eq('id', bottleId)
        .single();

      if (payload?.viewerUserId) {
        isOwnerScan = bottleRecord?.user_id === payload.viewerUserId;
      }
      if (bottleRecord?.filled_at) {
        bottleAgeDays = Math.floor(
          (Date.now() - new Date(bottleRecord.filled_at).getTime()) / 86_400_000
        );
      }
    }

    // 6. Check for duplicate scan (same session hash within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentScan } = await supabase
      .from('bottle_scans')
      .select('id')
      .eq('bottle_id', bottleId)
      .eq('session_hash', sessionHash)
      .gte('created_at', fiveMinutesAgo)
      .limit(1)
      .single();

    const isUnique = !recentScan;

    // Check if this visitor is new TODAY for this brewery (for Unique Visitor stats)
    let isNewDailyVisitor = true;
    if (payload?.breweryId) {
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        
        // If we already found a recent scan (within 5 mins), they are definitely not new today
        if (recentScan) {
            isNewDailyVisitor = false;
        } else {
             // Check if they visited earlier today
            const { data: existingVisit } = await supabase
                .from('bottle_scans')
                .select('id')
                .eq('brewery_id', payload.breweryId)
                .eq('session_hash', sessionHash)
                .gte('created_at', todayStart.toISOString())
                .limit(1)
                .single();
                
            if (existingVisit) isNewDailyVisitor = false;
        }
    }

    // Extract hour of day for time-to-glass analysis
    const scanHour = new Date().getHours(); // 0-23

    // 7. Insert Scan Record (without IP!)
    const { error } = await supabase.from('bottle_scans').insert({
      bottle_id:         bottleId,
      brew_id:           payload?.brewId       || null,
      brewery_id:        payload?.breweryId    || null,
      viewer_user_id:    payload?.viewerUserId || null,
      session_hash:      sessionHash,
      country_code:      geoData.country,
      city:              geoData.city,
      latitude:          finalLat,             // Phase 10: H3-snapped or IP-based
      longitude:         finalLng,             // Phase 10: H3-snapped or IP-based
      geo_source:        geoSource,            // Phase 10: 'gps_snapped_h3' | 'ip_vercel'
      user_agent_parsed: `${detectDeviceType(userAgent)}`,
      device_type:       detectDeviceType(userAgent),
      scan_source:       payload?.scanSource || 'qr_code',
      is_owner_scan:     isOwnerScan,
      scanned_at_hour:   scanHour,          // Phase 3: Time-to-Glass tracking
      // Phase 7: Extended scan context
      utm_source:        payload?.utmSource      || null,
      utm_medium:        payload?.utmMedium      || null,
      utm_campaign:      payload?.utmCampaign    || null,
      referrer_domain:   payload?.referrerDomain || null,
      bottle_age_days:   bottleAgeDays,
      // CIS Environment Context: store acknowledged local time for timezone-correct scoring
      local_time:        payload?.localTime || null,
    });
    
    if (error) {
      console.error('[Analytics] Failed to insert bottle scan:', error.message);
      return;
    }

    // 8. Update Daily Stats (Aggregation with hour distribution)
    if (payload?.breweryId) {
      try {
        await supabase.rpc('increment_daily_stats', {
          p_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
          p_brewery_id: payload.breweryId,
          p_brew_id: (payload.brewId || null) as any,
          p_country_code: geoData.country,
          p_device_type: detectDeviceType(userAgent),
          p_hour: scanHour, // Phase 3: Hour tracking
          p_is_new_visitor: isNewDailyVisitor, // Fixed logic
          p_is_logged_in: !!payload?.viewerUserId, // Bug 1.3: Verified Drinker Funnel
        });
      } catch (statsError) {
        // Don't fail the scan if aggregation fails
        console.error('[Analytics] Failed to update daily stats:', statsError);
      }
    }
    
  } catch (e) {
    console.error('[Analytics] Bottle scan tracking exception:', e);
  }
}

/**
 * Track conversion event (user rated after scanning)
 * Call this after a rating is submitted
 */
export async function trackConversion(bottleId: string, userId: string) {
  try {
    const supabase = await createClient();
    
    // Find most recent scan by this user for this bottle (within last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentScan } = await supabase
      .from('bottle_scans')
      .select('id')
      .eq('bottle_id', bottleId)
      .eq('viewer_user_id', userId)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (recentScan) {
      await supabase
        .from('bottle_scans')
        .update({ converted_to_rating: true })
        .eq('id', recentScan.id);
    }
  } catch (e) {
    console.error('[Analytics] Conversion tracking failed:', e);
  }
}

/**
 * Get Analytics Overview for Brewery
 * Returns aggregated stats for dashboard
 */
export async function getBreweryAnalytics(breweryId: string, options?: {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  brewId?: string;
}) {
  'use server';
  
  const supabase = await createClient();
  
  // Verify user has access to this brewery
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return { error: 'Access denied' };
  }

  // Bug 1.7 fix: Server-side tier enforcement (prevent free users from
  // requesting arbitrary date ranges by manipulating the UI or calling
  // the action directly)
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = (ownerProfile?.subscription_tier || 'free') as UserTier;
  const features = ANALYTICS_TIER_FEATURES[tier];

  if (!features.hasAccess) {
    return { error: 'Analytics requires at least the Brewer tier' };
  }

  // Cap the date range to the tier's maximum — never reject, always clamp
  const earliestAllowed = new Date();
  earliestAllowed.setDate(earliestAllowed.getDate() - features.maxDays);
  const earliestAllowedStr = earliestAllowed.toISOString().slice(0, 10);

  let effectiveStartDate = options?.startDate;
  if (!effectiveStartDate || effectiveStartDate < earliestAllowedStr) {
    // Either no date given (default to max window) or client tried to bypass
    effectiveStartDate = earliestAllowedStr;
  }

  // Build query
  let query = supabase
    .from('analytics_daily_stats')
    .select('*')
    .eq('brewery_id', breweryId);

  // Always apply the enforced start date (never raw options.startDate)
  query = query.gte('date', effectiveStartDate);

  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }
  if (options?.brewId) {
    query = query.eq('brew_id', options.brewId);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('[Analytics] Failed to fetch brewery analytics:', error);
    return { error: error.message };
  }

  return { data };
}

/**
 * Get Analytics Summary (totals)
 */
export async function getBreweryAnalyticsSummary(breweryId: string, options?: {
  startDate?: string;
  endDate?: string;
  brewId?: string;
}) {
  'use server';
  
  const supabase = await createClient();
  const result = await getBreweryAnalytics(breweryId, options);
  if (result.error || !result.data) {
    return result;
  }

  const stats = result.data;
  
  // Aggregate totals
  const summary = {
    totalScans: stats.reduce((sum, s) => sum + s.total_scans, 0),
    uniqueVisitors: stats.reduce((sum, s) => sum + s.unique_visitors, 0),
    // Phase 2: logged-in scans (column added via migration 20260301000000)
    loggedInScans: stats.reduce((sum, s) => sum + (((s as any).logged_in_scans as number) ?? 0), 0),
    scansByDate: stats.reduce((acc, s) => {
      const date = s.date;
      if (!acc[date]) acc[date] = { scans: 0, unique: 0 };
      acc[date].scans += s.total_scans;
      acc[date].unique += s.unique_visitors;
      return acc;
    }, {} as Record<string, { scans: number; unique: number }>),
    scansByCountry: stats.reduce((acc, s) => {
      const country = s.country_code || 'Unknown';
      if (!acc[country]) acc[country] = 0;
      acc[country] += s.total_scans;
      return acc;
    }, {} as Record<string, number>),
    scansByDevice: stats.reduce((acc, s) => {
      const device = s.device_type || 'unknown';
      if (!acc[device]) acc[device] = 0;
      acc[device] += s.total_scans;
      return acc;
    }, {} as Record<string, number>),
    topBrews: stats.reduce((acc, s) => {
      const key = s.brew_id ?? '__no_brew__';
      if (!acc[key]) acc[key] = 0;
      acc[key] += s.total_scans;
      return acc;
    }, {} as Record<string, number>),
    // Phase 3: Time-to-Glass hourly distribution
    scansByHour: stats.reduce((acc, s) => {
      if (s.hour_distribution) {
        const hourData = s.hour_distribution as Record<string, number>;
        Object.entries(hourData).forEach(([hour, count]) => {
          if (!acc[hour]) acc[hour] = 0;
          acc[hour] += count;
        });
      }
      return acc;
    }, {} as Record<string, number>),
  };

  // Phase 4: Fetch raw coordinates for heatmap
  // Limited to max 500 recent points to avoid huge payloads
  let geoPoints: Array<{ lat: number; lng: number }> = [];
  
  try {
    let geoQuery = supabase
      .from('bottle_scans')
      .select('latitude, longitude')
      .eq('brewery_id', breweryId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(500);
    if (options?.startDate) geoQuery = geoQuery.gte('created_at', options.startDate);
    if (options?.endDate)   geoQuery = geoQuery.lte('created_at', options.endDate);
    if (options?.brewId)    geoQuery = geoQuery.eq('brew_id', options.brewId);
    const { data: points } = await geoQuery;
      
    if (points) {
      geoPoints = points.map(p => ({ lat: p.latitude, lng: p.longitude })) as any;
    }
  } catch (geoError) {
    console.warn('[Analytics] Failed to fetch geo points:', geoError);
  }

  // Phase 2: Cap claim counts (Verified Drinker Funnel)
  // collected_caps has no brewery_id so we resolve via brews
  let capsClaimed = 0;
  let capCollectors = 0;
  try {
    // Collect all real brew IDs (exclude sentinel)
    // When brewId filter is active, scope caps to just that brew
    const brewIds = options?.brewId
      ? [options.brewId]
      : Object.keys(summary.topBrews).filter(id => id !== '__no_brew__');
    if (brewIds.length > 0) {
      let capsQuery = supabase
        .from('collected_caps')
        .select('user_id')
        .in('brew_id', brewIds);
      if (options?.startDate) capsQuery = capsQuery.gte('collected_at', options.startDate);
      if (options?.endDate)   capsQuery = capsQuery.lte('collected_at', options.endDate);
      const { data: caps } = await capsQuery;
      if (caps) {
        capsClaimed   = caps.length;
        capCollectors = new Set(caps.map(c => c.user_id).filter(Boolean)).size;
      }
    } else {
      // topology: brewery has no brews yet — fallback to brews table
      const { data: brewRows } = await supabase
        .from('brews')
        .select('id')
        .eq('brewery_id', breweryId);
      if (brewRows && brewRows.length > 0) {
        const ids = brewRows.map(b => b.id);
        let capsQuery = supabase.from('collected_caps').select('user_id').in('brew_id', ids);
        if (options?.startDate) capsQuery = capsQuery.gte('collected_at', options.startDate);
        if (options?.endDate)   capsQuery = capsQuery.lte('collected_at', options.endDate);
        const { data: caps } = await capsQuery;
        if (caps) {
          capsClaimed   = caps.length;
          capCollectors = new Set(caps.map(c => c.user_id).filter(Boolean)).size;
        }
      }
    }
  } catch (capsErr) {
    console.warn('[Analytics] Failed to fetch cap claims:', capsErr);
  }

  // Phase A: Weighted Drinker Estimate + Funnel-consistent scan counts
  //
  // IMPORTANT: We compute these directly from bottle_scans — the SAME table
  // the CIS classifier writes drinking_probability to. Using analytics_daily_stats
  // for totalScans but bottle_scans for estimates caused 200% bugs when the two
  // tables were out of sync. We also rebuild scansByDate and uniqueVisitors from
  // the same query so the chart always matches the metric cards.
  let weightedDrinkerEstimate = 0;
  let funnelTotalScans = summary.totalScans;    // fallback to aggregation table
  let funnelLoggedInScans = summary.loggedInScans;
  let funnelScansByDate = summary.scansByDate;
  let funnelUniqueVisitors = summary.uniqueVisitors;
  try {
    let funnelQuery = (supabase as any)
      .from('bottle_scans')
      .select('drinking_probability, viewer_user_id, created_at, session_hash')
      .eq('brewery_id', breweryId)
      .eq('is_owner_scan', false);
    if (options?.startDate) funnelQuery = funnelQuery.gte('created_at', options.startDate);
    // Append T23:59:59 so the full end day is included — bare date '2026-03-08' on a
    // timestamptz column is cast to '2026-03-08 00:00:00 UTC' by PostgreSQL, which
    // would exclude all scans from that day after midnight UTC.
    if (options?.endDate)   funnelQuery = funnelQuery.lte('created_at', options.endDate + 'T23:59:59');
    if (options?.brewId)    funnelQuery = funnelQuery.eq('brew_id', options.brewId);
    const { data: funnelRows } = await funnelQuery;
    if (funnelRows && funnelRows.length > 0) {
      funnelTotalScans    = funnelRows.length;
      funnelLoggedInScans = funnelRows.filter((r: any) => r.viewer_user_id != null).length;
      // Unclassified scans (null) use BASE_SCORE as default — CIS cron runs once daily,
      // so scans inserted after 08:00 aren't scored yet. 0.3 gives a reasonable intraday estimate.
      weightedDrinkerEstimate = funnelRows.reduce(
        (sum: number, r: { drinking_probability: number | null }) =>
          sum + (r.drinking_probability ?? CIS_SCORING.BASE_SCORE),
        0
      );

      // Rebuild scansByDate from raw rows so chart == metric cards
      const dateMap: Record<string, { scans: number; sessions: Set<string> }> = {};
      for (const r of funnelRows) {
        const date = (r.created_at as string).slice(0, 10); // YYYY-MM-DD
        if (!dateMap[date]) dateMap[date] = { scans: 0, sessions: new Set() };
        dateMap[date].scans++;
        if (r.session_hash) dateMap[date].sessions.add(r.session_hash);
      }
      funnelScansByDate = Object.fromEntries(
        Object.entries(dateMap).map(([date, v]) => [date, { scans: v.scans, unique: v.sessions.size }])
      );

      // Unique visitors = distinct session_hashes across the whole period
      const allSessions = new Set(funnelRows.map((r: any) => r.session_hash).filter(Boolean));
      funnelUniqueVisitors = allSessions.size;
    }
  } catch (funnelErr) {
    console.warn('[Analytics] Failed to compute funnel metrics from bottle_scans:', funnelErr);
  }

  return { 
    data: { 
      ...summary,
      // Override aggregation-table numbers with bottle_scans-consistent values
      totalScans: funnelTotalScans,
      uniqueVisitors: funnelUniqueVisitors,
      loggedInScans: funnelLoggedInScans,
      scansByDate: funnelScansByDate,
      geoPoints,
      capsClaimed,
      capCollectors,
      weightedDrinkerEstimate,
    } as any 
  };
}

/**
 * Phase 2 — Get Cap Claim Rate (brewery-wide)
 * Returns the number of Kronkorken claimed for all brews of a brewery in the given period.
 */
export async function getCapClaimRate(breweryId: string, options?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: { capsClaimed: number; capCollectors: number }; error?: string }> {
  'use server';
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: membership } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', breweryId)
      .eq('user_id', user.id)
      .single();
    if (!membership || membership.role !== 'owner') return { error: 'Access denied' };

    const { data: brewRows } = await supabase
      .from('brews')
      .select('id')
      .eq('brewery_id', breweryId);

    if (!brewRows || brewRows.length === 0) {
      return { data: { capsClaimed: 0, capCollectors: 0 } };
    }

    const brewIds = brewRows.map(b => b.id);
    let q = supabase.from('collected_caps').select('user_id').in('brew_id', brewIds);
    if (options?.startDate) q = q.gte('collected_at', options.startDate);
    if (options?.endDate)   q = q.lte('collected_at', options.endDate);

    const { data: caps, error } = await q;
    if (error) throw error;

    const capsClaimed   = caps?.length ?? 0;
    const capCollectors = new Set((caps ?? []).map(c => c.user_id).filter(Boolean)).size;

    return { data: { capsClaimed, capCollectors } };
  } catch (err: any) {
    console.error('[Analytics] getCapClaimRate error:', err);
    return { error: err.message || 'Failed to fetch cap claims' };
  }
}

/**
 * Phase 2 — Get Cap Claim Rate (per-brew)
 */
export async function getBrewCapClaimRate(brewId: string, options?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: { capsClaimed: number; capCollectors: number }; error?: string }> {
  'use server';
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    // Verify access: user must own the brew or be a brewery owner
    const { data: brew } = await supabase
      .from('brews')
      .select('user_id, brewery_id')
      .eq('id', brewId)
      .single();
    if (!brew) return { error: 'Brew not found' };

    const hasAccess = brew.user_id === user.id || (() => {
      // will be checked below
      return false;
    })();
    if (!hasAccess && brew.brewery_id) {
      const { data: membership } = await supabase
        .from('brewery_members')
        .select('role')
        .eq('brewery_id', brew.brewery_id)
        .eq('user_id', user.id)
        .single();
      if (!membership || membership.role !== 'owner') return { error: 'Access denied' };
    } else if (!hasAccess) {
      return { error: 'Access denied' };
    }

    let q = supabase.from('collected_caps').select('user_id').eq('brew_id', brewId);
    if (options?.startDate) q = q.gte('collected_at', options.startDate);
    if (options?.endDate)   q = q.lte('collected_at', options.endDate);

    const { data: caps, error } = await q;
    if (error) throw error;

    const capsClaimed   = caps?.length ?? 0;
    const capCollectors = new Set((caps ?? []).map(c => c.user_id).filter(Boolean)).size;

    return { data: { capsClaimed, capCollectors } };
  } catch (err: any) {
    console.error('[Analytics] getBrewCapClaimRate error:', err);
    return { error: err.message || 'Failed to fetch brew cap claims' };
  }
}

/**
 * Get Conversion Rate for Brewery
 * Returns scan-to-rating conversion metrics
 */
export async function getConversionRate(breweryId: string, options?: {
  startDate?: string;
  endDate?: string;
  /** Phase 2: optionally scope to a single brew */
  brewId?: string;
}): Promise<{ data?: { totalScans: number; conversions: number; rate: number }; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: 'Unauthorized' };
    }

    // Verify brewery ownership
    const { data: membership } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', breweryId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return { error: 'Only brewery owners can view conversion metrics' };
    }

    // Query scans with conversion flag + confirmed drinking
    // Exclude owner scans — consistent with funnelQuery in getBreweryAnalyticsSummary
    let query = supabase
      .from('bottle_scans')
      .select('id, converted_to_rating, confirmed_drinking')
      .eq('brewery_id', breweryId)
      .eq('is_owner_scan', false);

    if (options?.brewId) {
      query = (query as any).eq('brew_id', options.brewId);
    }
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate + 'T23:59:59');
    }

    const { data: scans, error } = await query;

    if (error) throw error;
    if (!scans || scans.length === 0) {
      return { data: { totalScans: 0, conversions: 0, rate: 0 } };
    }

    const totalScans = scans.length;
    // Verified Drinker: rated OR confirmed drinking via prompt
    const conversions = scans.filter(
      (s: any) => s.converted_to_rating || s.confirmed_drinking === true
    ).length;
    const rate = totalScans > 0 ? (conversions / totalScans) * 100 : 0;

    return { data: { totalScans, conversions, rate } };
  } catch (err: any) {
    console.error('Conversion Rate Error:', err);
    return { error: err.message || 'Failed to get conversion rate' };
  }
}

/**
 * Get Analytics for Specific Brew
 */
export async function getBrewAnalytics(brewId: string, options?: {
  startDate?: string;
  endDate?: string;
}) {
  'use server';
  
  const supabase = await createClient();
  
  // Get brew to verify ownership
  const { data: brew } = await supabase
    .from('brews')
    .select('brewery_id, user_id')
    .eq('id', brewId)
    .single();

  if (!brew) {
    return { error: 'Brew not found' };
  }

  // Verify access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Check if user owns the brew or is brewery owner
  if (brew.user_id !== user.id) {
    if (brew.brewery_id) {
      const { data: membership } = await supabase
        .from('brewery_members')
        .select('role')
        .eq('brewery_id', brew.brewery_id)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'owner') {
        return { error: 'Access denied' };
      }
    } else {
      return { error: 'Access denied' };
    }
  }

  // Fetch stats
  let query = supabase
    .from('analytics_daily_stats')
    .select('*')
    .eq('brew_id', brewId);

  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('[Analytics] Failed to fetch brew analytics:', error);
    return { error: error.message };
  }

  return { data };
}

// ============================================================================
// PHASE 3 — RATER-DEMOGRAFIE
// ============================================================================

export type AgeGroup = '18-25' | '26-35' | '36-50' | '50+' | 'unknown';
export type ExperienceLevel = 'newcomer' | 'experienced' | 'expert' | 'anonymous';
export type ActivityLevel = 'casual' | 'explorer' | 'enthusiast' | 'anonymous';

export type DemographicsResult = {
  totalProfilesAnalyzed: number;
  anonymousScans: number;
  ageGroups: Record<AgeGroup, number>;
  experienceLevels: Record<ExperienceLevel, number>;
  activityLevels: Record<ActivityLevel, number>;
  topLocations: { location: string; count: number }[];
};

/**
 * PRIVACY RULES (BotlLab Privacy Shield):
 * 1. Only profiles with analytics_opt_out IS NOT TRUE are included.
 * 2. Groups with count < 5 are returned as -1 ("zu wenige Daten") to prevent re-identification.
 * 3. No individual data is ever returned — only aggregate buckets.
 */
export async function getRaterDemographics(
  scope: { brewId: string } | { breweryId: string },
  options?: {
    startDate?: string;
    endDate?: string;
    forVerifiedDrinkersOnly?: boolean; // true = nur converted_to_rating = true
  },
): Promise<{ data?: { all: DemographicsResult; verified: DemographicsResult }; error?: string }> {
  'use server';

  const supabase = await createClient();

  // --- Auth & access check ---
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify ownership
  if ('breweryId' in scope) {
    const { data: membership } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', scope.breweryId)
      .eq('user_id', user.id)
      .single();
    if (!membership || membership.role !== 'owner') return { error: 'Access denied' };
  } else {
    const { data: brew } = await supabase
      .from('brews')
      .select('user_id, brewery_id')
      .eq('id', scope.brewId)
      .single();
    if (!brew) return { error: 'Brew not found' };
    if (brew.user_id !== user.id) {
      if (brew.brewery_id) {
        const { data: mem } = await supabase
          .from('brewery_members')
          .select('role')
          .eq('brewery_id', brew.brewery_id)
          .eq('user_id', user.id)
          .single();
        if (!mem || mem.role !== 'owner') return { error: 'Access denied' };
      } else {
        return { error: 'Access denied' };
      }
    }
  }

  // --- Helper: fetch scans & build demographics ---
  async function buildDemographics(verifiedOnly: boolean): Promise<DemographicsResult> {
    // 1. Query bottle_scans
    let q = supabase
      .from('bottle_scans')
      .select('viewer_user_id');

    if ('brewId' in scope) {
      q = q.eq('brew_id', scope.brewId);
    } else {
      q = q.eq('brewery_id', scope.breweryId);
    }
    if (options?.startDate) q = q.gte('created_at', options.startDate);
    if (options?.endDate) q = q.lte('created_at', options.endDate);
    if (verifiedOnly) q = q.eq('converted_to_rating', true);

    const { data: scans } = await q;
    if (!scans || scans.length === 0) {
      return {
        totalProfilesAnalyzed: 0,
        anonymousScans: 0,
        ageGroups: { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0, unknown: 0 },
        experienceLevels: { newcomer: 0, experienced: 0, expert: 0, anonymous: 0 },
        activityLevels: { casual: 0, explorer: 0, enthusiast: 0, anonymous: 0 },
        topLocations: [],
      };
    }

    // 2. Separate anonymous vs. logged-in
    const allIds = scans.map(s => s.viewer_user_id);
    const anonymousScans = allIds.filter(id => !id).length;
    const userIds = [...new Set(allIds.filter((id): id is string => !!id))];

    if (userIds.length === 0) {
      return {
        totalProfilesAnalyzed: 0,
        anonymousScans,
        ageGroups: { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0, unknown: 0 },
        experienceLevels: { newcomer: 0, experienced: 0, expert: 0, anonymous: anonymousScans },
        activityLevels: { casual: 0, explorer: 0, enthusiast: 0, anonymous: anonymousScans },
        topLocations: [],
      };
    }

    // 3. Fetch profiles (privacy-filtered)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, birthdate, joined_at, total_bottle_fills, location')
      .in('id', userIds)
      .neq('analytics_opt_out', true);

    const now = new Date();

    const ageGroups: Record<AgeGroup, number> = { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0, unknown: 0 };
    const experienceLevels: Record<ExperienceLevel, number> = { newcomer: 0, experienced: 0, expert: 0, anonymous: 0 };
    const activityLevels: Record<ActivityLevel, number> = { casual: 0, explorer: 0, enthusiast: 0, anonymous: 0 };
    const locationMap: Record<string, number> = {};

    for (const p of profiles ?? []) {
      // Age group
      if (p.birthdate) {
        const ageYears = (now.getTime() - new Date(p.birthdate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (ageYears < 26) ageGroups['18-25']++;
        else if (ageYears < 36) ageGroups['26-35']++;
        else if (ageYears <= 50) ageGroups['36-50']++;
        else ageGroups['50+']++;
      } else {
        ageGroups.unknown++;
      }

      // Experience level (by account age)
      if (p.joined_at) {
        const monthsOld = (now.getTime() - new Date(p.joined_at).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        if (monthsOld < 6) experienceLevels.newcomer++;
        else if (monthsOld < 24) experienceLevels.experienced++;
        else experienceLevels.expert++;
      } else {
        experienceLevels.anonymous++;
      }

      // Activity level (by total fills)
      const fills = p.total_bottle_fills ?? 0;
      if (fills < 5) activityLevels.casual++;
      else if (fills <= 20) activityLevels.explorer++;
      else activityLevels.enthusiast++;

      // Location
      const loc = p.location?.trim();
      if (loc) {
        const key = loc.toLowerCase();
        locationMap[key] = (locationMap[key] ?? 0) + 1;
      }
    }

    // 4. k-anonymity: groups < 5 → -1
    const anonymize = (rec: Record<string, number>) => {
      const result: Record<string, number> = {};
      for (const [k, v] of Object.entries(rec)) {
        result[k] = v > 0 && v < 5 ? -1 : v;
      }
      return result;
    };

    // 5. Top-5 locations
    const topLocations = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count: count < 5 ? -1 : count }));

    return {
      totalProfilesAnalyzed: profiles?.length ?? 0,
      anonymousScans,
      ageGroups: anonymize(ageGroups) as Record<AgeGroup, number>,
      experienceLevels: anonymize(experienceLevels) as Record<ExperienceLevel, number>,
      activityLevels: anonymize(activityLevels) as Record<ActivityLevel, number>,
      topLocations,
    };
  }

  const [all, verified] = await Promise.all([
    buildDemographics(false),
    buildDemographics(true),
  ]);

  return { data: { all, verified } };
}
// ============================================================================
// PHASE 4 — BIERSTIL-BENCHMARK
// ============================================================================

export type StyleBenchmarkValues = {
  bitterness: number | null;
  sweetness: number | null;
  body: number | null;
  roast: number | null;
  fruitiness: number | null;
};

export type StyleBenchmarkResult = {
  brewStyle: string;
  brewStyleNormalized: string;
  brewValues: StyleBenchmarkValues;
  benchmarkValues: StyleBenchmarkValues;
  /** delta = brewValues - benchmarkValues (null when either side is null) */
  deltas: StyleBenchmarkValues;
  benchmarkBrewCount: number;
  benchmarkRatingCount: number;
  hasEnoughData: boolean;
};

export async function getStyleBenchmark(
  brewId: string,
): Promise<{ data?: StyleBenchmarkResult; error?: string }> {
  'use server';

  const supabase = await createClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 1. Load brew to get style + verify ownership
  const { data: brew } = await supabase
    .from('brews')
    .select('style, user_id, brewery_id')
    .eq('id', brewId)
    .single();

  if (!brew) return { error: 'Brew not found' };

  // Access check
  if (brew.user_id !== user.id) {
    if (brew.brewery_id) {
      const { data: mem } = await supabase
        .from('brewery_members')
        .select('role')
        .eq('brewery_id', brew.brewery_id)
        .eq('user_id', user.id)
        .single();
      if (!mem || mem.role !== 'owner') return { error: 'Access denied' };
    } else {
      return { error: 'Access denied' };
    }
  }

  const brewStyle = brew.style?.trim() ?? '';
  if (!brewStyle || brewStyle.toLowerCase() === 'unbekannt') {
    return {
      data: {
        brewStyle: brewStyle || '',
        brewStyleNormalized: '',
        brewValues: { bitterness: null, sweetness: null, body: null, roast: null, fruitiness: null },
        benchmarkValues: { bitterness: null, sweetness: null, body: null, roast: null, fruitiness: null },
        deltas: { bitterness: null, sweetness: null, body: null, roast: null, fruitiness: null },
        benchmarkBrewCount: 0,
        benchmarkRatingCount: 0,
        hasEnoughData: false,
      },
    };
  }

  const styleNormalized = brewStyle.toLowerCase();

  // 2. Load own taste profile (via RPC — now from flavor_profiles table)
  const { data: ownProfile } = await supabase.rpc('get_brew_flavor_profile', {
    p_brew_id: brewId,
  });

  // 3. Query the materialized view (flavor_profiles-based)
  const { data: benchmark } = await (supabase as any)
    .from('brew_style_flavor_averages')
    .select('avg_bitterness, avg_sweetness, avg_body, avg_roast, avg_fruitiness, brew_count, profile_count')
    .eq('style_normalized', styleNormalized)
    .single();

  if (!benchmark || (benchmark.brew_count ?? 0) < 3) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = ownProfile as any;
    return {
      data: {
        brewStyle,
        brewStyleNormalized: styleNormalized,
        brewValues: op ? {
          bitterness: op.bitterness ?? null,
          sweetness: op.sweetness ?? null,
          body: op.body ?? null,
          roast: op.roast ?? null,
          fruitiness: op.fruitiness ?? null,
        } : { bitterness: null, sweetness: null, body: null, roast: null, fruitiness: null },
        benchmarkValues: { bitterness: null, sweetness: null, body: null, roast: null, fruitiness: null },
        deltas: { bitterness: null, sweetness: null, body: null, roast: null, fruitiness: null },
        benchmarkBrewCount: benchmark?.brew_count ?? 0,
        benchmarkRatingCount: benchmark?.profile_count ?? 0,
        hasEnoughData: false,
      },
    };
  }

  // 4. Calculate deltas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const op2 = ownProfile as any;
  const bv: StyleBenchmarkValues = {
    bitterness: op2?.bitterness ?? null,
    sweetness: op2?.sweetness ?? null,
    body: op2?.body ?? null,
    roast: op2?.roast ?? null,
    fruitiness: op2?.fruitiness ?? null,
  };
  const bm: StyleBenchmarkValues = {
    bitterness: benchmark.avg_bitterness !== null ? Number(benchmark.avg_bitterness) : null,
    sweetness: benchmark.avg_sweetness !== null ? Number(benchmark.avg_sweetness) : null,
    body: benchmark.avg_body !== null ? Number(benchmark.avg_body) : null,
    roast: benchmark.avg_roast !== null ? Number(benchmark.avg_roast) : null,
    fruitiness: benchmark.avg_fruitiness !== null ? Number(benchmark.avg_fruitiness) : null,
  };

  const delta = (own: number | null, bench: number | null) =>
    own !== null && bench !== null ? Math.round((own - bench) * 10) / 10 : null;

  return {
    data: {
      brewStyle,
      brewStyleNormalized: styleNormalized,
      brewValues: bv,
      benchmarkValues: bm,
      deltas: {
        bitterness: delta(bv.bitterness, bm.bitterness),
        sweetness: delta(bv.sweetness, bm.sweetness),
        body: delta(bv.body, bm.body),
        roast: delta(bv.roast, bm.roast),
        fruitiness: delta(bv.fruitiness, bm.fruitiness),
      },
      benchmarkBrewCount: Number(benchmark.brew_count),
      benchmarkRatingCount: Number(benchmark.profile_count),
      hasEnoughData: true,
    },
  };
}

// ============================================================================
// PHASE 4.5 — BATCH A/B TESTING (Sud-gegen-Sud-Vergleich)
// ============================================================================

export type BatchTasteProfile = {
  bitterness: number | null;
  sweetness: number | null;
  body: number | null;
  roast: number | null;
  fruitiness: number | null;
};

export type BatchComparisonResult = {
  brewA: {
    id: string;
    name: string;
    style: string | null;
    ratings: number;
    tasteProfile: BatchTasteProfile;
    avgOverall: number | null;
  };
  brewB: {
    id: string;
    name: string;
    style: string | null;
    ratings: number;
    tasteProfile: BatchTasteProfile;
    avgOverall: number | null;
  };
  /** Deltas: B minus A */
  deltas: BatchTasteProfile;
  /** Dimensions where |delta| > 0.5 */
  significantDifferences: string[];
  overallRatingChange: number | null;
  /** true if either brew has fewer than 10 ratings */
  sampleSizeWarning: boolean;
};

export async function getBatchComparison(
  brewIdA: string,
  brewIdB: string,
): Promise<{ data?: BatchComparisonResult; error?: string }> {
  'use server';

  const supabase = await createClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Load both brews
  const [{ data: brewARow }, { data: brewBRow }] = await Promise.all([
    supabase.from('brews').select('id, name, style, user_id, brewery_id').eq('id', brewIdA).single(),
    supabase.from('brews').select('id, name, style, user_id, brewery_id').eq('id', brewIdB).single(),
  ]);

  if (!brewARow || !brewBRow) return { error: 'Brew nicht gefunden' };

  // Access check: user must own both brews (or be brewery member)
  const canAccess = async (brew: typeof brewARow) => {
    if (brew.user_id === user.id) return true;
    if (brew.brewery_id) {
      const { data: mem } = await supabase
        .from('brewery_members')
        .select('role')
        .eq('brewery_id', brew.brewery_id)
        .eq('user_id', user.id)
        .single();
      return mem?.role === 'owner';
    }
    return false;
  };

  const [accessA, accessB] = await Promise.all([canAccess(brewARow), canAccess(brewBRow)]);
  if (!accessA || !accessB) return { error: 'Zugriff verweigert' };

  // Fetch taste profiles + rating counts in parallel
  const [profileA, profileB, ratingsA, ratingsB] = await Promise.all([
    supabase.rpc('get_brew_flavor_profile', { p_brew_id: brewIdA }),
    supabase.rpc('get_brew_flavor_profile', { p_brew_id: brewIdB }),
    supabase.from('ratings').select('rating').eq('brew_id', brewIdA).eq('moderation_status', 'auto_approved'),
    supabase.from('ratings').select('rating').eq('brew_id', brewIdB).eq('moderation_status', 'auto_approved'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toProfile = (rpc: typeof profileA): BatchTasteProfile => ({
    bitterness: (rpc.data as any)?.bitterness ?? null,
    sweetness: (rpc.data as any)?.sweetness ?? null,
    body: (rpc.data as any)?.body ?? null,
    roast: (rpc.data as any)?.roast ?? null,
    fruitiness: (rpc.data as any)?.fruitiness ?? null,
  });

  const avgScore = (rows: { rating: number }[] | null) => {
    if (!rows || rows.length === 0) return null;
    const vals = rows.map(r => r.rating).filter((v): v is number => v !== null && v !== undefined);
    return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  const pA = toProfile(profileA);
  const pB = toProfile(profileB);
  const DIMENSIONS = ['bitterness', 'sweetness', 'body', 'roast', 'fruitiness'] as const;

  const deltas: BatchTasteProfile = {
    bitterness: pA.bitterness !== null && pB.bitterness !== null ? Math.round((pB.bitterness - pA.bitterness) * 10) / 10 : null,
    sweetness: pA.sweetness !== null && pB.sweetness !== null ? Math.round((pB.sweetness - pA.sweetness) * 10) / 10 : null,
    body: pA.body !== null && pB.body !== null ? Math.round((pB.body - pA.body) * 10) / 10 : null,
    roast: pA.roast !== null && pB.roast !== null ? Math.round((pB.roast - pA.roast) * 10) / 10 : null,
    fruitiness: pA.fruitiness !== null && pB.fruitiness !== null ? Math.round((pB.fruitiness - pA.fruitiness) * 10) / 10 : null,
  };

  const significantDifferences = DIMENSIONS.filter(dim => {
    const d = deltas[dim];
    return d !== null && Math.abs(d) > 0.5;
  });

  const avgA = avgScore(ratingsA.data ?? []);
  const avgB = avgScore(ratingsB.data ?? []);

  return {
    data: {
      brewA: {
        id: brewARow.id,
        name: brewARow.name ?? 'Unbekannt',
        style: brewARow.style,
        ratings: ratingsA.data?.length ?? 0,
        tasteProfile: pA,
        avgOverall: avgA,
      },
      brewB: {
        id: brewBRow.id,
        name: brewBRow.name ?? 'Unbekannt',
        style: brewBRow.style,
        ratings: ratingsB.data?.length ?? 0,
        tasteProfile: pB,
        avgOverall: avgB,
      },
      deltas,
      significantDifferences,
      overallRatingChange: avgA !== null && avgB !== null ? Math.round((avgB - avgA) * 10) / 10 : null,
      sampleSizeWarning: (ratingsA.data?.length ?? 0) < 10 || (ratingsB.data?.length ?? 0) < 10,
    },
  };
}

// ============================================================================
// Phase 5.3 — Off-Flavor Frühwarnsystem
// ============================================================================

const OFF_FLAVOR_TAGS = [
  'sauer', 'butter', 'diacetyl', 'pappe', 'lösungsmittel',
  'grüner apfel', 'acetaldehyd', 'metallisch', 'papier',
  'nass', 'seifig', 'phenolisch',
] as const;

export type OffFlavorAlert = {
  brewId: string;
  brewName: string;
  flaggedTag: string;
  occurrences: number;
  severity: 'warning' | 'critical';
  recentRatingIds: string[];
};

/**
 * Scan a single brew for off-flavor anomalies in the last 30 days.
 * Counts each flagged tag per distinct user (same user only counts once).
 * ≥3 unique users → warning, ≥5 → critical.
 */
export async function detectOffFlavorAnomaly(
  brewId: string
): Promise<{ success: true; alerts: OffFlavorAlert[] } | { success: false; error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: brew } = await supabase
    .from('brews')
    .select('name, brewery_id')
    .eq('id', brewId)
    .single();
  if (!brew) return { success: false, error: 'Brew not found' };
  if (!brew.brewery_id) return { success: false, error: 'Access denied' };

  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', brew.brewery_id)
    .eq('user_id', user.id)
    .single();
  if (!membership) return { success: false, error: 'Access denied' };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select('id, user_id, flavor_tags')
    .eq('brew_id', brewId)
    .gte('created_at', since)
    .not('flavor_tags', 'is', null);

  if (error) return { success: false, error: error.message };

  const tagMap = new Map<string, { userIds: Set<string>; ratingIds: string[] }>();

  for (const rating of ratings ?? []) {
    const tags: string[] = rating.flavor_tags ?? [];
    for (const tag of tags) {
      const normalised = tag.toLowerCase().trim();
      if (!OFF_FLAVOR_TAGS.includes(normalised as typeof OFF_FLAVOR_TAGS[number])) continue;
      if (!tagMap.has(normalised)) tagMap.set(normalised, { userIds: new Set(), ratingIds: [] });
      const entry = tagMap.get(normalised)!;
      if (rating.user_id) entry.userIds.add(rating.user_id);
      entry.ratingIds.push(rating.id);
    }
  }

  const alerts: OffFlavorAlert[] = [];
  for (const [tag, { userIds, ratingIds }] of tagMap.entries()) {
    const count = userIds.size;
    if (count < 3) continue;
    alerts.push({
      brewId,
      brewName: brew.name ?? 'Unbekannt',
      flaggedTag: tag,
      occurrences: count,
      severity: count >= 5 ? 'critical' : 'warning',
      recentRatingIds: ratingIds.slice(0, 10),
    });
  }

  return { success: true, alerts };
}

/**
 * Scan all brews of a brewery for off-flavor anomalies.
 * Returns all alerts across all brews. Requires brewer+ tier.
 */
export async function detectBreweryOffFlavors(breweryId: string): Promise<{
  success: true;
  alerts: OffFlavorAlert[];
  brewsChecked: number;
} | { success: false; error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();
  if (!membership) return { success: false, error: 'Access denied' };

  const { data: brewList, error: brewErr } = await supabase
    .from('brews')
    .select('id, name')
    .eq('brewery_id', breweryId);

  if (brewErr) return { success: false, error: brewErr.message };
  if (!brewList?.length) return { success: true, alerts: [], brewsChecked: 0 };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: ratings, error: ratingErr } = await supabase
    .from('ratings')
    .select('id, brew_id, user_id, flavor_tags')
    .in('brew_id', brewList.map((b: { id: string; name: string | null }) => b.id))
    .gte('created_at', since)
    .not('flavor_tags', 'is', null);

  if (ratingErr) return { success: false, error: ratingErr.message };

  const perBrew = new Map<string, Map<string, { userIds: Set<string>; ratingIds: string[] }>>();
  for (const rating of ratings ?? []) {
    if (!rating.brew_id) continue;
    if (!perBrew.has(rating.brew_id)) perBrew.set(rating.brew_id, new Map());
    const tagMap = perBrew.get(rating.brew_id)!;
    for (const tag of (rating.flavor_tags as string[] ?? [])) {
      const normalised = tag.toLowerCase().trim();
      if (!OFF_FLAVOR_TAGS.includes(normalised as typeof OFF_FLAVOR_TAGS[number])) continue;
      if (!tagMap.has(normalised)) tagMap.set(normalised, { userIds: new Set(), ratingIds: [] });
      const entry = tagMap.get(normalised)!;
      if (rating.user_id) entry.userIds.add(rating.user_id);
      entry.ratingIds.push(rating.id);
    }
  }

  const allAlerts: OffFlavorAlert[] = [];
  for (const brew of brewList) {
    const tagMap = perBrew.get(brew.id);
    if (!tagMap) continue;
    for (const [tag, { userIds, ratingIds }] of tagMap.entries()) {
      const count = userIds.size;
      if (count < 3) continue;
      allAlerts.push({
        brewId: brew.id,
        brewName: brew.name ?? 'Unbekannt',
        flaggedTag: tag,
        occurrences: count,
        severity: count >= 5 ? 'critical' : 'warning',
        recentRatingIds: ratingIds.slice(0, 10),
      });
    }
  }

  allAlerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return b.occurrences - a.occurrences;
  });

  return { success: true, alerts: allAlerts, brewsChecked: brewList.length };
}

// ============================================================================
// Phase 5.4 — Shelf-Life / Degradationskurve
// ============================================================================

const SHELF_LIFE_BUCKETS = ['0-7', '8-14', '15-30', '31-60', '60+'] as const;
type ShelfLifeBucket = typeof SHELF_LIFE_BUCKETS[number];

function toShelfLifeBucket(ageDays: number): ShelfLifeBucket {
  if (ageDays <= 7)  return '0-7';
  if (ageDays <= 14) return '8-14';
  if (ageDays <= 30) return '15-30';
  if (ageDays <= 60) return '31-60';
  return '60+';
}

export type ShelfLifeDataPoint = {
  bucket: ShelfLifeBucket;
  avgRating: number;
  ratingCount: number;
};

export type ShelfLifeResult = {
  data: ShelfLifeDataPoint[];
  peakAgeBucket: ShelfLifeBucket | null;
  dropOffBucket: ShelfLifeBucket | null;
  hasEnoughData: boolean;
};

/**
 * Compute the shelf-life degradation curve for a brew.
 * Joins bottle_scans → bottles.filled_at to calculate age in days,
 * then finds matching ratings from the scanning user within ±7 days.
 * Tier: brewery+
 */
export async function getShelfLifeCurve(
  brewId: string
): Promise<{ success: true; result: ShelfLifeResult } | { success: false; error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: brew } = await supabase
    .from('brews')
    .select('brewery_id')
    .eq('id', brewId)
    .single();
  if (!brew) return { success: false, error: 'Brew not found' };
  if (!brew.brewery_id) return { success: false, error: 'Access denied' };

  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', brew.brewery_id)
    .eq('user_id', user.id)
    .single();
  if (!membership) return { success: false, error: 'Access denied' };

  const { data: scans, error: scanErr } = await supabase
    .from('bottle_scans')
    .select('id, viewer_user_id, created_at, bottles(filled_at)')
    .eq('brew_id', brewId)
    .not('viewer_user_id', 'is', null);

  if (scanErr) return { success: false, error: scanErr.message };
  if (!scans?.length) {
    return {
      success: true,
      result: { data: [], peakAgeBucket: null, dropOffBucket: null, hasEnoughData: false },
    };
  }

  const { data: ratings, error: ratingErr } = await supabase
    .from('ratings')
    .select('user_id, rating, created_at')
    .eq('brew_id', brewId)
    .not('rating', 'is', null);

  if (ratingErr) return { success: false, error: ratingErr.message };

  const ratingsByUser = new Map<string, Array<{ overall: number; ts: number }>>();
  for (const r of ratings ?? []) {
    if (!r.user_id || r.rating == null) continue;
    const ts = new Date(r.created_at).getTime();
    if (!ratingsByUser.has(r.user_id)) ratingsByUser.set(r.user_id, []);
    ratingsByUser.get(r.user_id)!.push({ overall: r.rating, ts });
  }

  const bucketAccum = new Map<ShelfLifeBucket, { sum: number; count: number }>();
  for (const bucket of SHELF_LIFE_BUCKETS) bucketAccum.set(bucket, { sum: 0, count: 0 });

  for (const scan of scans) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bottle = (scan as any).bottles as { filled_at: string | null } | null;
    if (!bottle?.filled_at) continue;
    const fillTs = new Date(bottle.filled_at).getTime();
    const scanTs  = new Date(scan.created_at).getTime();
    if (isNaN(fillTs) || isNaN(scanTs)) continue;
    const ageDays = (scanTs - fillTs) / (1000 * 60 * 60 * 24);
    if (ageDays < 0) continue;

    const bucket = toShelfLifeBucket(Math.round(ageDays));
    const userId  = scan.viewer_user_id as string;
    const userRatings = ratingsByUser.get(userId) ?? [];

    const WINDOW = 7 * 24 * 60 * 60 * 1000;
    const matching = userRatings.find(r => Math.abs(r.ts - scanTs) <= WINDOW);
    if (!matching) continue;

    const entry = bucketAccum.get(bucket)!;
    entry.sum   += matching.overall;
    entry.count += 1;
  }

  const data: ShelfLifeDataPoint[] = SHELF_LIFE_BUCKETS
    .filter(b => (bucketAccum.get(b)?.count ?? 0) > 0)
    .map(b => {
      const { sum, count } = bucketAccum.get(b)!;
      return { bucket: b, avgRating: Math.round((sum / count) * 10) / 10, ratingCount: count };
    });

  const hasEnoughData = data.length >= 3;

  let peakAgeBucket: ShelfLifeBucket | null = null;
  let peak = -Infinity;
  for (const d of data) {
    if (d.avgRating > peak) { peak = d.avgRating; peakAgeBucket = d.bucket; }
  }

  let dropOffBucket: ShelfLifeBucket | null = null;
  if (peakAgeBucket) {
    const peakIdx = data.findIndex(d => d.bucket === peakAgeBucket);
    for (let i = peakIdx + 1; i < data.length; i++) {
      if (peak - data[i].avgRating > 0.5) { dropOffBucket = data[i].bucket; break; }
    }
  }

  return { success: true, result: { data, peakAgeBucket, dropOffBucket, hasEnoughData } };
}

// ============================================================================
// Phase 7.6 — Scan Source Breakdown
// ============================================================================

export interface ScanSourceBreakdownItem {
  key: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
  scanSource: string;
  referrerDomain: string | null;
}

const SOCIAL_DOMAIN_LABELS: Record<string, string> = {
  'instagram.com': 'Instagram',
  'facebook.com':  'Facebook',
  'twitter.com':   'Twitter / X',
  'x.com':         'Twitter / X',
  'tiktok.com':    'TikTok',
  'youtube.com':   'YouTube',
  'whatsapp.com':  'WhatsApp',
  'linkedin.com':  'LinkedIn',
  'untappd.com':   'Untappd',
};

const SOCIAL_DOMAIN_ICONS: Record<string, string> = {
  'instagram.com': 'Instagram',
  'facebook.com':  'Facebook',
  'twitter.com':   'Twitter',
  'x.com':         'Twitter',
  'tiktok.com':    'Music',
  'youtube.com':   'Youtube',
  'whatsapp.com':  'MessageCircle',
  'linkedin.com':  'Linkedin',
  'untappd.com':   'Beer',
};

const SCAN_SOURCE_LABELS: Record<string, string> = {
  'qr_code':     'QR-Code (direkt)',
  'direct_link': 'Direkt-Link',
  'social':      'Social Media',
  'share':       'Geteilt',
};

const SCAN_SOURCE_ICONS: Record<string, string> = {
  'qr_code':     'ScanLine',
  'direct_link': 'Link',
  'social':      'Share2',
  'share':       'ArrowUpRight',
};

export async function getScanSourceBreakdown(
  breweryId: string,
  options?: { startDate?: string; endDate?: string; brewId?: string }
): Promise<{ success: boolean; items?: ScanSourceBreakdownItem[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  let query = supabase
    .from('bottle_scans')
    .select('scan_source, referrer_domain')
    .eq('brewery_id', breweryId)
    .eq('is_owner_scan', false);

  if (options?.startDate) query = query.gte('created_at', options.startDate);
  if (options?.endDate)   query = query.lt('created_at', options.endDate);
  if (options?.brewId)    query = query.eq('brew_id', options.brewId);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: true, items: [] };

  const total = data.length;
  const countMap = new Map<string, { scanSource: string; referrerDomain: string | null; count: number }>();

  for (const row of (data as any[])) {
    const src = (row.scan_source  as string | null) || 'qr_code';
    const ref = (row.referrer_domain as string | null) || null;
    const key = `${src}::${ref ?? ''}`;
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(key, { scanSource: src, referrerDomain: ref, count: 1 });
    }
  }

  const items: ScanSourceBreakdownItem[] = Array.from(countMap.values())
    .map(({ scanSource, referrerDomain, count }) => {
      const domainLabel = referrerDomain ? SOCIAL_DOMAIN_LABELS[referrerDomain] : null;
      const label = domainLabel ?? SCAN_SOURCE_LABELS[scanSource] ?? scanSource;
      const icon  = referrerDomain
        ? (SOCIAL_DOMAIN_ICONS[referrerDomain] ?? 'Globe')
        : (SCAN_SOURCE_ICONS[scanSource] ?? 'Search');

      return {
        key:            `${scanSource}::${referrerDomain ?? ''}`,
        label,
        icon,
        count,
        percentage:     Math.round((count / total) * 100),
        scanSource,
        referrerDomain,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // top 8 sources

  return { success: true, items };
}

// ============================================================================
// Phase 8 — Wetter-Korrelation
// ============================================================================

export interface ScanWeatherBreakdownItem {
  condition: string;        // 'sunny', 'rainy', etc.
  category: string;         // 'hot', 'warm', 'cool', 'cold'
  label: string;            // German human-readable label
  icon: string;
  count: number;
  percentage: number;
}

const WEATHER_CONDITION_META: Record<string, { label: string; icon: string }> = {
  sunny:         { label: 'Sonnig',           icon: '☀️'  },
  partly_cloudy: { label: 'Leicht bewölkt',   icon: '⛅'  },
  cloudy:        { label: 'Bewölkt',          icon: '☁️'  },
  foggy:         { label: 'Nebel',            icon: '🌫️' },
  rainy:         { label: 'Regnerisch',       icon: '🌧️' },
  snowy:         { label: 'Schnee',           icon: '❄️'  },
  stormy:        { label: 'Gewitter',         icon: '⛈️' },
  unknown:       { label: 'Unbekannt',        icon: '❓'  },
};

/**
 * Phase 8 — Return weather breakdown for a brewery's scans.
 * Only counts scans where weather_condition IS NOT NULL and != 'unavailable'.
 * Tier: brewery+
 */
export async function getScanWeatherBreakdown(
  breweryId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<{
  success: boolean;
  items?: ScanWeatherBreakdownItem[];
  totalWithWeather?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Access check
  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();
  if (!membership || membership.role !== 'owner') return { success: false, error: 'Access denied' };

  // Tier check — brewery+ required
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  const tier = (ownerProfile?.subscription_tier || 'free') as UserTier;
  if (tier === 'free' || tier === 'brewer') {
    return { success: false, error: 'Wetter-Korrelation erfordert den Brewery-Plan oder höher' };
  }

  // Query
  let query = (supabase as any)
    .from('bottle_scans')
    .select('weather_condition, weather_category')
    .eq('brewery_id', breweryId)
    .not('weather_condition', 'is', null)
    .neq('weather_condition', 'unavailable');

  if (options?.startDate) query = query.gte('created_at', options.startDate);
  if (options?.endDate)   query = query.lt('created_at', options.endDate);

  const { data, error } = await query;
  if (error) return { success: false, error: (error as any).message };
  if (!data || data.length === 0) return { success: true, items: [], totalWithWeather: 0 };

  const total: number = data.length;
  const countMap = new Map<string, { condition: string; category: string; count: number }>();

  for (const row of data) {
    const condition: string = row.weather_condition || 'unknown';
    const category: string  = row.weather_category  || 'unknown';
    const key = `${condition}::${category}`;
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(key, { condition, category, count: 1 });
    }
  }

  const items: ScanWeatherBreakdownItem[] = Array.from(countMap.values())
    .map(({ condition, category, count }) => {
      const meta = WEATHER_CONDITION_META[condition] ?? { label: condition, icon: '🌡️' };
      return {
        condition,
        category,
        label: meta.label,
        icon: meta.icon,
        count,
        percentage: Math.round((count / total) * 100),
      };
    })
    .sort((a, b) => b.count - a.count);

  return { success: true, items, totalWithWeather: total };
}
// ============================================================================
// Phase 9 — Scan Intent Classification + Drinker-Bestätigung
// ============================================================================

/**
 * Default drinking probabilities per intent category.
 * Phase 0 (2026-03-08): Categories extended with non_qr and fridge_surf.
 * QR-based probabilities are now computed dynamically by classifyCisScans().
 */
const INTENT_PROBABILITIES: Record<string, number> = {
  confirmed:         1.00,
  repeat:            0.85,
  event:             0.70,
  single:            0.50,
  social_discovery:  0.00,   // Phase 0: non-QR → no drinking probability
  browse:            0.15,
  collection_browse: 0.05,
  fridge_surf:       0.05,   // Phase 0: detected Fridge Surfing
  non_qr:            0.00,   // Phase 0: hard rule — shared link, direct URL
};

const INTENT_LABELS: Record<string, { label: string; icon: string }> = {
  single:            { label: 'Einzelscan',            icon: 'Smartphone' },
  browse:            { label: 'Browse (Kühlschrank)',   icon: 'Search' },
  collection_browse: { label: 'Sammlung durchstöbern', icon: 'Archive' },
  fridge_surf:       { label: 'Kühlschrank-Surfen',    icon: 'Layers' },
  non_qr:            { label: 'Geteilter Link',        icon: 'Link' },
  repeat:            { label: 'Wiederkommer',          icon: 'RefreshCw' },
  event:             { label: 'Event / Verkostung',    icon: 'CalendarDays' },
  social_discovery:  { label: 'Social-Entdeckung',     icon: 'Share2' },
  confirmed:         { label: 'Bestätigt',             icon: 'CheckCircle2' },
};

// ============================================================================
// Phase 0 — CIS Engine v2 Scoring Constants (2026-03-08)
// Additive scoring model for session-aware classification.
// ============================================================================
const CIS_SCORING = {
  BASE_SCORE:               0.30,
  FRIDGE_SURFING_PENALTY:  -0.40,  // Another different bottle scanned within SESSION_WINDOW_MS
  DWELL_TIME_BONUS:         0.40,  // dwell_seconds >= DWELL_TIME_THRESHOLD_S
  LAST_IN_SESSION_BONUS:    0.20,  // No follow-up scan on a different bottle within SESSION_WINDOW_MS
  SESSION_WINDOW_MS:        15 * 60 * 1000,  // 15 minutes
  DWELL_TIME_THRESHOLD_S:   180,             // 3 minutes
  // ── CIS Environment Context modifiers (2026-03-17) ──────────────────────
  // Max cumulative effect: +0.25 / -0.25 (keeps these as light fine-tuning)
  DYNAMIC_TIME_BONUS:       0.15,  // local_time is within ±2h of brew's typical_scan_hour
  DYNAMIC_TIME_PENALTY:    -0.15,  // local_time is >5h away from brew's typical_scan_hour
  DYNAMIC_TEMP_BONUS:       0.05,  // weather_temp_c is within ±5°C of brew's typical_temperature
  DYNAMIC_TEMP_PENALTY:    -0.05,  // weather_temp_c is >12°C away from brew's typical_temperature
  WEEKEND_HOLIDAY_BONUS:    0.05,  // scan on Friday evening, weekend or public holiday
} as const;

/**
 * 9.2 — Browse-Scan-Erkennung (Batch-Klassifikation)
 *
 * @deprecated Superseded by classifyCisScans() (Phase 0, 2026-03-08).
 * Kept as a no-op so existing call-sites do not break.
 */
export async function classifyBrowseScans(): Promise<number> {
  return 0;
}

// ============================================================================
// Phase 0 — CIS Engine v2: classifyCisScans()
//
// Unified, session-aware classification that replaces the old
// classifyBrowseScans() + classifySingleScans() pipeline.
//
// Algorithm:
//   1. Hard Rule (0.1): Non-QR scans  → drinking_probability = 0.0 immediately
//   2. Session context (0.2): load all scans in the same session_hash to detect
//      "Fridge Surfing" — another different bottle scanned within 15 min.
//   3. Additive scoring:
//      BASE_SCORE                         = 0.30
//      + FRIDGE_SURFING_PENALTY  (-0.40)  if follow-up scan on different bottle < 15 min
//      + LAST_IN_SESSION_BONUS   (+0.20)  if no follow-up scan (= decision scan)
//      + DWELL_TIME_BONUS        (+0.40)  if dwell_seconds >= 180s
//      Clamped to [0.0, 1.0]
//   4. Intent label derived from final score:
//      < 0.15 → fridge_surf  |  0.15–0.44 → browse  |  >= 0.45 → single
//
// Runs via cron every 15 min. Only processes scans older than 15 min
// (session window is considered closed at that point).
// ============================================================================
export async function classifyCisScans(): Promise<{ nonQr: number; session: number }> {
  const supabase = await createClient();

  // ── Load live scoring config (falls back to CIS_SCORING hardcoded defaults) ──
  let cfg: {
    BASE_SCORE: number;
    FRIDGE_SURFING_PENALTY: number;
    DWELL_TIME_BONUS: number;
    LAST_IN_SESSION_BONUS: number;
    SESSION_WINDOW_MS: number;
    DWELL_TIME_THRESHOLD_S: number;
    DYNAMIC_TIME_BONUS: number;
    DYNAMIC_TIME_PENALTY: number;
    DYNAMIC_TEMP_BONUS: number;
    DYNAMIC_TEMP_PENALTY: number;
    WEEKEND_HOLIDAY_BONUS: number;
  } = { ...CIS_SCORING };
  try {
    const s = await getAlgorithmSettings();
    cfg = {
      BASE_SCORE:               s.cis_base_score,
      FRIDGE_SURFING_PENALTY:   s.cis_fridge_surfing_penalty,
      DWELL_TIME_BONUS:         s.cis_dwell_time_bonus,
      LAST_IN_SESSION_BONUS:    s.cis_last_in_session_bonus,
      SESSION_WINDOW_MS:        s.cis_session_window_minutes * 60 * 1000,
      DWELL_TIME_THRESHOLD_S:   s.cis_dwell_time_threshold_s,
      DYNAMIC_TIME_BONUS:       s.cis_dynamic_time_bonus,
      DYNAMIC_TIME_PENALTY:     s.cis_dynamic_time_penalty,
      DYNAMIC_TEMP_BONUS:       s.cis_dynamic_temp_bonus,
      DYNAMIC_TEMP_PENALTY:     s.cis_dynamic_temp_penalty,
      WEEKEND_HOLIDAY_BONUS:    s.cis_weekend_holiday_bonus,
    };
  } catch {
    // keep hardcoded defaults on error
  }

  const sessionCutoff = new Date(Date.now() - cfg.SESSION_WINDOW_MS).toISOString();

  // ── 1. Load unclassified scans older than 15 min ──────────────────────────
  const { data: scans, error } = await (supabase as any)
    .from('bottle_scans')
    .select(`
      id, session_hash, bottle_id, brew_id, scan_source, dwell_seconds, created_at,
      local_time, weather_temp_c, country_code,
      brews ( typical_scan_hour, typical_temperature )
    `)
    .is('scan_intent', null)
    .lte('created_at', sessionCutoff)
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error || !scans || scans.length === 0) return { nonQr: 0, session: 0 };

  // ── 2. Load full session context for neighbour-scan detection ─────────────
  const sessionHashes = [
    ...new Set(scans.map((s: any) => s.session_hash).filter(Boolean)),
  ] as string[];

  const sessionContext = new Map<string, Array<{
    id: string;
    bottle_id: string | null;
    created_at: string;
  }>>();

  if (sessionHashes.length > 0) {
    const { data: ctx } = await (supabase as any)
      .from('bottle_scans')
      .select('id, session_hash, bottle_id, created_at')
      .in('session_hash', sessionHashes)
      .order('created_at', { ascending: true });

    for (const s of ctx ?? []) {
      if (!s.session_hash) continue;
      if (!sessionContext.has(s.session_hash)) sessionContext.set(s.session_hash, []);
      sessionContext.get(s.session_hash)!.push({
        id: s.id,
        bottle_id: s.bottle_id,
        created_at: s.created_at,
      });
    }
  }

  // ── 3. Score each scan ────────────────────────────────────────────────────
  type UpdateRow = { id: string; scan_intent: string; drinking_probability: number };
  const updates: UpdateRow[] = [];
  let nonQrCount = 0;

  for (const scan of scans) {
    // Hard Rule 0.1 — Not from QR camera → probability 0, label by source
    if (scan.scan_source !== 'qr_code') {
      const intent = scan.scan_source === 'social' ? 'social_discovery' : 'non_qr';
      updates.push({ id: scan.id, scan_intent: intent, drinking_probability: 0.0 });
      nonQrCount++;
      continue;
    }

    // Additive scoring for QR scans ─────────────────────────────────────────
    let score: number = cfg.BASE_SCORE;
    const thisScanTime = new Date(scan.created_at).getTime();
    const sessionScans = sessionContext.get(scan.session_hash ?? '') ?? [];

    // Has a DIFFERENT bottle been scanned within 15 min after this? → Fridge surfing
    const hasFollowUpOnDifferentBottle = sessionScans.some((s) => {
      if (s.id === scan.id) return false;
      if (s.bottle_id === scan.bottle_id) return false; // Re-scan of same bottle: not surfing
      const delta = new Date(s.created_at).getTime() - thisScanTime;
      return delta > 0 && delta < cfg.SESSION_WINDOW_MS;
    });

    if (hasFollowUpOnDifferentBottle) {
      score += cfg.FRIDGE_SURFING_PENALTY; // –0.40
    } else {
      // "Decision scan" — this is where the user committed
      score += cfg.LAST_IN_SESSION_BONUS; // +0.20
    }

    // Dwell time bonus — only fires once dwell_seconds is populated (Phase 0.3)
    if (scan.dwell_seconds != null && scan.dwell_seconds >= cfg.DWELL_TIME_THRESHOLD_S) {
      score += cfg.DWELL_TIME_BONUS; // +0.40
    }

    // ── CIS Environment Context modifiers (Phase 1, 2026-03-17) ─────────────────

    // Dynamic Time Modifier — compare local scan hour with brew's learned peak hour.
    // local_time is stored as wall-clock (no TZ) so getHours() on a UTC server
    // correctly returns the user's local hour.
    const brewTypicalHour: number | null = scan.brews?.typical_scan_hour ?? null;
    if (brewTypicalHour !== null && scan.local_time != null) {
      const scanLocalHour = new Date(scan.local_time).getHours();
      let hourDiff = Math.abs(scanLocalHour - brewTypicalHour);
      if (hourDiff > 12) hourDiff = 24 - hourDiff; // cyclic wrap (e.g. 23h vs 1h → diff = 2)
      if (hourDiff <= 2) {
        score += cfg.DYNAMIC_TIME_BONUS;   // +0.15 — perfect time window
      } else if (hourDiff > 5) {
        score += cfg.DYNAMIC_TIME_PENALTY; // −0.15 — atypical time
      }
      // Soft zone (2 < diff ≤ 5): no modifier applied
    }

    // Dynamic Temperature Modifier — compare scan weather vs brew's learned temperature.
    // Only fires when both the scan has weather data and the brew has a baseline.
    const brewTypicalTemp: number | null = scan.brews?.typical_temperature ?? null;
    if (brewTypicalTemp !== null && scan.weather_temp_c != null) {
      const tempDiff = Math.abs(scan.weather_temp_c - brewTypicalTemp);
      if (tempDiff <= 5) {
        score += cfg.DYNAMIC_TEMP_BONUS;   // +0.05 — weather matches brew profile
      } else if (tempDiff > 12) {
        score += cfg.DYNAMIC_TEMP_PENALTY; // −0.05 — clearly wrong weather for this brew
      }
    }

    // Weekend / Holiday Modifier — Friday evening, weekend, or public holiday in
    // the scan's country (falls back to DE when country_code is unknown).
    if (scan.local_time != null) {
      try {
        // Dynamic import so date-holidays is only loaded when needed
        const { default: Holidays } = await import('date-holidays');
        const countryCode = (scan.country_code as string | null) || 'DE';
        const hd = new Holidays(countryCode);
        const localDate = new Date(scan.local_time);
        const dow  = localDate.getDay();   // 0 = Sun, 5 = Fri, 6 = Sat
        const hour = localDate.getHours();
        const isFridayEvening = dow === 5 && hour >= 17;
        const isWeekend       = dow === 0 || dow === 6;
        const isHoliday       = hd.isHoliday(localDate) !== false;
        if (isFridayEvening || isWeekend || isHoliday) {
          score += cfg.WEEKEND_HOLIDAY_BONUS; // +0.05
        }
      } catch {
        // date-holidays failure must never break classifyCisScans
      }
    }

    // Clamp to [0.0, 1.0]
    score = Math.max(0.0, Math.min(1.0, score));

    // Map score to intent label
    let intent: string;
    if (score < 0.15)       intent = 'fridge_surf';
    else if (score < 0.45)  intent = 'browse';
    else                    intent = 'single';

    updates.push({ id: scan.id, scan_intent: intent, drinking_probability: score });
  }

  if (updates.length === 0) return { nonQr: nonQrCount, session: 0 };

  // ── 4. Batch update, grouped by intent + probability to minimise DB calls ─
  const byKey = new Map<string, string[]>();
  const payloadMap = new Map<string, { scan_intent: string; drinking_probability: number }>();

  for (const u of updates) {
    const prob = Math.round(u.drinking_probability * 100) / 100;
    const key = `${u.scan_intent}::${prob}`;
    if (!byKey.has(key)) {
      byKey.set(key, []);
      payloadMap.set(key, { scan_intent: u.scan_intent, drinking_probability: prob });
    }
    byKey.get(key)!.push(u.id);
  }

  let classifiedSession = 0;
  for (const [key, ids] of byKey) {
    const payload = payloadMap.get(key)!;
    const { error: err } = await (supabase as any)
      .from('bottle_scans')
      .update({
        scan_intent: payload.scan_intent,
        drinking_probability: payload.drinking_probability,
      })
      .in('id', ids)
      .is('scan_intent', null);
    if (!err) classifiedSession += ids.length;
  }

  return { nonQr: nonQrCount, session: classifiedSession };
}

/**
 * 9.3 — Repeat-Scan-Erkennung (Loyalty-Klassifikation)
 *
 * Nur für eingeloggte Nutzer. Selber User hat verschiedene _physische_
 * Flaschen desselben Brews an mindestens 2 verschiedenen Tagen gescannt.
 * Probability steigt leicht mit jedem weiteren Tag, max 0.95.
 *
 * @returns Anzahl der klassifizierten Scans
 */
export async function classifyRepeatScans(): Promise<number> {
  const supabase = await createClient();

  // Hole alle unklassifizierten Scans von eingeloggten Nutzern
  const { data: scans, error } = await (supabase as any)
    .from('bottle_scans')
    .select('id, viewer_user_id, brew_id, bottle_id, created_at')
    .is('scan_intent', null)
    .not('viewer_user_id', 'is', null)
    .not('brew_id', 'is', null)
    .limit(5000);

  if (error || !scans || scans.length === 0) return 0;

  // Gruppiere nach (viewer_user_id, brew_id)
  const userBrewGroups = new Map<string, typeof scans>();
  for (const scan of scans) {
    const key = `${scan.viewer_user_id}::${scan.brew_id}`;
    if (!userBrewGroups.has(key)) userBrewGroups.set(key, []);
    userBrewGroups.get(key)!.push(scan);
  }

  const repeatUpdates: Array<{ id: string; probability: number }> = [];

  for (const [, group] of userBrewGroups) {
    // Zähle verschiedene Tage und verschiedene Flaschen
    const distinctDays = new Set(group.map((s: any) =>
      new Date(s.created_at).toISOString().slice(0, 10)
    ));
    const distinctBottles = new Set(group.map((s: any) => s.bottle_id).filter(Boolean));

    // Bedingung: ≥2 verschiedene Tage UND ≥2 verschiedene Flaschen
    if (distinctDays.size >= 2 && distinctBottles.size >= 2) {
      // Probability steigt leicht mit jedem Tag, max 0.95
      const prob = Math.min(
        INTENT_PROBABILITIES.repeat + (distinctDays.size - 2) * 0.03,
        0.95
      );
      for (const scan of group) {
        repeatUpdates.push({ id: scan.id, probability: prob });
      }
    }
  }

  if (repeatUpdates.length === 0) return 0;

  // Batch-Update (alle gleiche Probability → group by prob)
  const byProb = new Map<number, string[]>();
  for (const { id, probability } of repeatUpdates) {
    const p = Math.round(probability * 100) / 100;
    if (!byProb.has(p)) byProb.set(p, []);
    byProb.get(p)!.push(id);
  }

  let classified = 0;
  for (const [prob, ids] of byProb) {
    const { error: err } = await (supabase as any)
      .from('bottle_scans')
      .update({
        scan_intent: 'repeat',
        drinking_probability: prob,
      })
      .in('id', ids)
      .is('scan_intent', null);
    if (!err) classified += ids.length;
  }

  return classified;
}

/**
 * Classify social-discovery scans based on referrer or UTM.
 * @deprecated Superseded by classifyCisScans() (Phase 0, 2026-03-08).
 * Social scans are now classified as social_discovery with probability 0.0
 * inside the unified CIS engine (Hard Rule 0.1).
 */
export async function classifySocialScans(): Promise<number> {
  return 0;
}

/**
 * Classify remaining unclassified scans as 'single' (default fallback).
 * @deprecated Superseded by classifyCisScans() (Phase 0, 2026-03-08).
 * classifyCisScans() handles all fallback classification after the 15-min window.
 */
export async function classifySingleScans(): Promise<number> {
  return 0;
}

/**
 * 9.4.5 + 9.5 — Drinker-Bestätigung Server Action (mit Feedback-Loop-Logging)
 *
 * Wird aufgerufen, wenn ein Nutzer auf dem DrinkingConfirmationPrompt
 * "Ja, Prost!" oder "Nein, nur schauen" klickt.
 */
export async function confirmDrinking(
  scanId: string,
  confirmed: boolean,
  context: {
    engagementSignal: 'after_rating' | 'scroll_ratings' | 'dwell_30s' | 'exit_intent';
    dwellTimeSeconds: number;
    scrollDepth: number;
    samplingRate: number;
    samplingReason: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Hole den aktuellen Scan-Record
    const { data: scan, error: scanErr } = await (supabase as any)
      .from('bottle_scans')
      .select('id, scan_intent, drinking_probability, referrer_domain, device_type, viewer_user_id, created_at, session_hash')
      .eq('id', scanId)
      .single();

    if (scanErr || !scan) {
      return { success: false, error: 'Scan not found' };
    }

    // 2. Scan-Record aktualisieren
    const { error: updateErr } = await (supabase as any)
      .from('bottle_scans')
      .update({
        confirmed_drinking: confirmed,
        // Intent bleibt erhalten für Analyse — nur bei Bestätigung auf 'confirmed' upgraden
        scan_intent: confirmed ? 'confirmed' : scan.scan_intent,
        drinking_probability: confirmed ? 1.0 : 0.1,
      } as never)
      .eq('id', scanId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 3. Zähle Scans in dieser Session (für context_features)
    let sessionScanCount = 1;
    if (scan.session_hash) {
      const { count } = await supabase
        .from('bottle_scans')
        .select('id', { count: 'exact', head: true })
        .eq('session_hash', scan.session_hash);
      sessionScanCount = count ?? 1;
    }

    // 4. Berechne error_type und prediction_correct
    const predictedDrinker = (scan.drinking_probability ?? 0.5) >= 0.5;
    let errorType: string;
    let predictionCorrect: boolean;
    if (confirmed && predictedDrinker) {
      errorType = 'true_positive';
      predictionCorrect = true;
    } else if (!confirmed && !predictedDrinker) {
      errorType = 'true_negative';
      predictionCorrect = true;
    } else if (confirmed && !predictedDrinker) {
      errorType = 'false_negative';
      predictionCorrect = false;
    } else {
      errorType = 'false_positive';
      predictionCorrect = false;
    }

    // 5. Feedback-Record loggen für Modell-Training
    const scanDate = new Date(scan.created_at);
    await (supabase as any)
      .from('scan_intent_feedback')
      .insert({
        scan_id: scanId,
        predicted_intent: scan.scan_intent ?? 'single',
        predicted_probability: scan.drinking_probability ?? 0.5,
        actual_drinking: confirmed,
        context_features: {
          engagement_signal: context.engagementSignal,
          dwell_time_seconds: context.dwellTimeSeconds,
          scroll_depth: context.scrollDepth,
          referrer_source: scan.referrer_domain ?? null,
          device_type: scan.device_type ?? null,
          scans_in_session: sessionScanCount,
          is_logged_in: !!scan.viewer_user_id,
          hour_of_day: scanDate.getHours(),
          day_of_week: scanDate.getDay(),
        },
        sampling_rate: context.samplingRate,
        sampling_reason: context.samplingReason,
        prediction_correct: predictionCorrect,
        error_type: errorType,
      });

    return { success: true };
  } catch (err: any) {
    console.error('[Analytics] confirmDrinking error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

// ============================================================================
// 9.6 — getScanIntentBreakdown
// ============================================================================

export interface IntentBreakdownItem {
  intent: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
  avgDrinkingProbability: number;
}

export interface IntentBreakdownResult {
  intents: IntentBreakdownItem[];
  totalScans: number;
  weightedDrinkerEstimate: number;
  confirmedDrinkers: number;
  modelAccuracy: number | null;
}

/**
 * Phase 9.6 — Scan Intent Breakdown for a brewery.
 * Returns distribution of intent categories + weighted drinker estimate.
 * Tier: brewery+
 */
export async function getScanIntentBreakdown(
  breweryId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<{ success: boolean; data?: IntentBreakdownResult; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Access check
  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();
  if (!membership || membership.role !== 'owner') return { success: false, error: 'Access denied' };

  // Tier check — brewery+ required
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  const tier = (ownerProfile?.subscription_tier || 'free') as UserTier;
  if (tier === 'free' || tier === 'brewer') {
    return { success: false, error: 'Scan-Intent-Analyse erfordert den Brewery-Plan oder höher' };
  }

  // Query all scans with intent data
  let query = (supabase as any)
    .from('bottle_scans')
    .select('scan_intent, drinking_probability, confirmed_drinking')
    .eq('brewery_id', breweryId)
    .not('scan_intent', 'is', null);

  if (options?.startDate) query = query.gte('created_at', options.startDate);
  if (options?.endDate)   query = query.lt('created_at', options.endDate);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: true,
      data: {
        intents: [],
        totalScans: 0,
        weightedDrinkerEstimate: 0,
        confirmedDrinkers: 0,
        modelAccuracy: null,
      },
    };
  }

  const total = data.length;

  // Count per intent
  const intentCounts = new Map<string, { count: number; probSum: number }>();
  let weightedSum = 0;
  let confirmedCount = 0;

  for (const row of data) {
    const intent = row.scan_intent || 'single';
    const prob = row.drinking_probability ?? INTENT_PROBABILITIES[intent] ?? 0.5;
    if (!intentCounts.has(intent)) intentCounts.set(intent, { count: 0, probSum: 0 });
    const entry = intentCounts.get(intent)!;
    entry.count++;
    entry.probSum += prob;
    weightedSum += prob;
    if (row.confirmed_drinking === true) confirmedCount++;
  }

  const intents: IntentBreakdownItem[] = Array.from(intentCounts.entries())
    .map(([intent, { count, probSum }]) => {
      const meta = INTENT_LABELS[intent] ?? { label: intent, icon: '❓' };
      return {
        intent,
        label: meta.label,
        icon: meta.icon,
        count,
        percentage: Math.round((count / total) * 100),
        avgDrinkingProbability: Math.round((probSum / count) * 100) / 100,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Model accuracy: check feedback table if enough data
  let modelAccuracy: number | null = null;
  try {
    const { data: feedbacks } = await (supabase as any)
      .from('scan_intent_feedback')
      .select('prediction_correct')
      .limit(1000);

    if (feedbacks && feedbacks.length >= 50) {
      const correct = feedbacks.filter((f: any) => f.prediction_correct === true).length;
      modelAccuracy = Math.round((correct / feedbacks.length) * 100) / 100;
    }
  } catch { /* ignore — table might not exist yet */ }

  return {
    success: true,
    data: {
      intents,
      totalScans: total,
      weightedDrinkerEstimate: Math.round(weightedSum * 10) / 10,
      confirmedDrinkers: confirmedCount,
      modelAccuracy,
    },
  };
}

// ============================================================================
// 9.4 — Smart Sampling: Resolve scan + decide whether to ask
// ============================================================================

/**
 * Resolves the most recent scan for a bottle in the current session
 * and decides via Smart Sampling whether to show the confirmation prompt.
 *
 * Called from the DrinkingConfirmationPrompt client component.
 */
export async function resolveScanForPrompt(
  bottleId: string
): Promise<{
  shouldAsk: boolean;
  scanId: string | null;
  reason: string;
  samplingRate: number;
}> {
  try {
    const supabase = await createClient();

    // Find most recent scan for this bottle in last 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: scan } = await (supabase as any)
      .from('bottle_scans')
      .select('id, scan_intent, drinking_probability, is_owner_scan, confirmed_drinking, converted_to_rating, viewer_user_id')
      .eq('bottle_id', bottleId)
      .gte('created_at', thirtyMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!scan) {
      return { shouldAsk: false, scanId: null, reason: 'no_recent_scan', samplingRate: 0 };
    }

    // Hard excludes — Prompt-Hierarchie:
    // If any Hard Proof is already recorded, the popup is unnecessary and must not fire.
    if (scan.is_owner_scan) {
      return { shouldAsk: false, scanId: scan.id, reason: 'owner_scan', samplingRate: 0 };
    }
    // confirmed_drinking already answered by the prompt (or another mechanism)
    if (scan.confirmed_drinking !== null) {
      return { shouldAsk: false, scanId: scan.id, reason: 'already_confirmed', samplingRate: 0 };
    }
    // scan_intent = 'confirmed' means BTB, Rating, or previous prompt already set this
    if (scan.scan_intent === 'confirmed') {
      return { shouldAsk: false, scanId: scan.id, reason: 'hard_proof_exists', samplingRate: 0 };
    }
    // Rating was submitted → scan already upgraded to confirmed (Phase 0.4)
    if (scan.converted_to_rating) {
      return { shouldAsk: false, scanId: scan.id, reason: 'already_rated', samplingRate: 0 };
    }
    // Non-QR / fridge-surfing scans — drinking is implausible, skip the popup
    if (scan.scan_intent === 'fridge_surf' || scan.scan_intent === 'non_qr' ||
        scan.scan_intent === 'browse' || scan.scan_intent === 'collection_browse' ||
        scan.scan_intent === 'social_discovery') {
      return { shouldAsk: false, scanId: scan.id, reason: 'intent_excluded', samplingRate: 0 };
    }

    // Check user scan history for progressive disclosure
    let totalScans = 0;
    if (scan.viewer_user_id) {
      const { count } = await supabase
        .from('bottle_scans')
        .select('id', { count: 'exact', head: true })
        .eq('viewer_user_id', scan.viewer_user_id);
      totalScans = count ?? 0;

      // Design Decision 22: Never ask first-time users (≤2 scans)
      if (totalScans <= 2) {
        return { shouldAsk: false, scanId: scan.id, reason: 'new_user_trust_building', samplingRate: 0 };
      }
    }

    // Uncertainty-based sampling
    const prob = scan.drinking_probability ?? 0.5;
    const uncertainty = 1 - Math.abs(2 * prob - 1);

    // Base sampling rates per intent
    const BASE_RATES: Record<string, number> = {
      single: 0.20,
      social_discovery: 0.15,
      event: 0.10,
      repeat: 0.05,
      browse: 0, collection_browse: 0, confirmed: 0,
    };

    const baseRate = BASE_RATES[scan.scan_intent ?? 'single'] ?? 0.20;

    // Cold start bonus — higher sampling when we have few feedbacks
    let coldStartBonus = 0;
    try {
      const { count: feedbackCount } = await (supabase as any)
        .from('scan_intent_feedback')
        .select('id', { count: 'exact', head: true });
      if ((feedbackCount ?? 0) < 200) coldStartBonus = 0.15;
    } catch { /* table may not exist yet */ }

    const samplingRate = Math.min(
      baseRate + coldStartBonus + uncertainty * 0.15,
      0.50
    );

    const shouldAsk = Math.random() < samplingRate;
    return {
      shouldAsk,
      scanId: scan.id,
      reason: shouldAsk ? `sampled_at_${Math.round(samplingRate * 100)}pct` : 'not_sampled',
      samplingRate,
    };
  } catch (err) {
    console.error('[Analytics] resolveScanForPrompt error:', err);
    return { shouldAsk: false, scanId: null, reason: 'error', samplingRate: 0 };
  }
}

// ============================================================================
// Phase 10: Event-Scan-Cluster-Erkennung
// ============================================================================

/**
 * Phase 10.2/10.3: Detect event clusters via PostGIS ST_ClusterDBSCAN.
 * Called by the hourly cron job (/api/analytics/detect-events).
 * Calls the SQL function `execute_event_clustering()` which:
 * 1. Selects GPS-snapped scans (geo_source = 'gps_snapped_h3') from last 24h
 * 2. Applies ST_ClusterDBSCAN (eps ~1km, minpoints 4)
 * 3. Filters clusters with < 3 unique sessions (anti-bot)
 * 4. Inserts new scan_events + scan_event_members
 * Returns the number of newly detected events.
 */
export async function detectEventClusters(): Promise<{
  newEvents: number;
  notifiedBreweries: string[];
}> {
  const supabase = await createClient();
  const notifiedBreweries: string[] = [];

  try {
    // Call the PostGIS clustering function
    // Note: scan_events + execute_event_clustering not yet in generated types (run supabase gen types after migration)
    const { data, error } = await (supabase as any).rpc('execute_event_clustering', {
      eps_degrees: 0.009,    // ~1km
      min_points: 4,
      min_sessions: 3,
      lookback_hours: 24,
    });

    if (error) {
      console.error('[Analytics] Event clustering RPC error:', error.message);
      return { newEvents: 0, notifiedBreweries: [] };
    }

    const newEventCount: number = typeof data === 'number' ? data : 0;
    console.log(`[Analytics] Event clustering complete: ${newEventCount} new events detected`);

    // Notify breweries about new events (Phase 10.7)
    if (newEventCount > 0) {
      // Fetch newly created events (last 5 minutes = created during this run)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: newEvents } = await (supabase as any)
        .from('scan_events')
        .select('id, event_start, event_end, city, country_code, total_scans, unique_sessions, breweries, brew_ids, event_type')
        .gte('created_at', fiveMinAgo);

      if (newEvents && newEvents.length > 0) {
        for (const event of newEvents as any[]) {
          if (!event.breweries || event.breweries.length === 0) continue;

          for (const breweryId of event.breweries) {
            try {
              // Get brewery owner email + brewery name
              const { data: brewery } = await supabase
                .from('breweries')
                .select('name')
                .eq('id', breweryId)
                .single();

              const { data: owner } = await supabase
                .from('brewery_members')
                .select('user_id')
                .eq('brewery_id', breweryId)
                .eq('role', 'owner')
                .single();

              if (owner?.user_id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('display_name')
                  .eq('id', owner.user_id)
                  .single();

                // Get email from auth (profiles may not have email column)
                const { data: authUser } = await (supabase as any).auth.admin.getUserById(owner.user_id);
                const ownerEmail = authUser?.user?.email;

                if (ownerEmail) {
                  // Get brew names for the notification
                  let brewNames: string[] = [];
                  if (event.brew_ids && event.brew_ids.length > 0) {
                    const { data: brews } = await supabase
                      .from('brews')
                      .select('name')
                      .in('id', event.brew_ids.slice(0, 5)); // Max 5 brew names
                    brewNames = (brews?.map((b: any) => b.name).filter(Boolean) as string[]) || [];
                  }

                  const { sendEventDetectedEmail } = await import('@/lib/email');
                  await sendEventDetectedEmail(
                    ownerEmail,
                    (profile as any)?.display_name || 'Brauer',
                    brewery?.name || 'Deine Brauerei',
                    brewNames.join(', ') || 'dein Bier',
                    event.city || 'unbekannter Ort',
                    event.total_scans,
                    event.unique_sessions,
                    new Date(event.event_start).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    new Date(event.event_end).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                    event.event_type || 'unknown',
                    breweryId,
                    event.id,
                  );
                  notifiedBreweries.push(breweryId);
                }
              }
            } catch (notifErr) {
              console.error(`[Analytics] Failed to notify brewery ${breweryId}:`, notifErr);
            }
          }
        }
      }
    }

    return { newEvents: newEventCount, notifiedBreweries };
  } catch (err) {
    console.error('[Analytics] detectEventClusters error:', err);
    return { newEvents: 0, notifiedBreweries: [] };
  }
}

/**
 * Phase 10.4: Get detected events for a brewery.
 * Tier-gated: enterprise.
 */
type DetectedEvent = {
  id: string;
  createdAt: string;
  eventStart: string;
  eventEnd: string;
  city: string | null;
  countryCode: string | null;
  totalScans: number;
  uniqueSessions: number;
  uniqueBrews: number;
  eventType: 'tasting' | 'festival' | 'party' | 'meetup' | 'unknown';
  confidence: number;
  brewerLabel: string | null;
  brewerNotes: string | null;
  centerLat: number;
  centerLng: number;
  radiusM: number | null;
  brewIds: string[];
  breweries: string[];
};

export async function getDetectedEvents(
  breweryId: string,
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<DetectedEvent[]> {
  const supabase = await createClient();

  try {
    let query = (supabase as any)
      .from('scan_events')
      .select('*')
      .contains('breweries', [breweryId])
      .order('event_start', { ascending: false });

    if (options?.startDate) {
      query = query.gte('event_start', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('event_end', options.endDate);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Analytics] getDetectedEvents error:', error.message);
      return [];
    }

    return (data || []).map((e: any) => ({
      id: e.id,
      createdAt: e.created_at,
      eventStart: e.event_start,
      eventEnd: e.event_end,
      city: e.city,
      countryCode: e.country_code,
      totalScans: e.total_scans,
      uniqueSessions: e.unique_sessions,
      uniqueBrews: e.unique_brews,
      eventType: e.event_type || 'unknown',
      confidence: parseFloat(e.confidence) || 0.5,
      brewerLabel: e.brewer_label,
      brewerNotes: e.brewer_notes,
      centerLat: parseFloat(e.center_lat),
      centerLng: parseFloat(e.center_lng),
      radiusM: e.radius_m,
      brewIds: e.brew_ids || [],
      breweries: e.breweries || [],
    }));
  } catch (err) {
    console.error('[Analytics] getDetectedEvents exception:', err);
    return [];
  }
}

/**
 * Phase 10.6: Update event annotation (brewer label + notes).
 * Only brewery owners can annotate their events.
 */
export async function updateEventAnnotation(
  eventId: string,
  breweryId: string,
  annotation: { brewerLabel?: string; brewerNotes?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Verify the brewery is part of this event
    const { data: event } = await (supabase as any)
      .from('scan_events')
      .select('id, breweries')
      .eq('id', eventId)
      .single();

    if (!event) {
      return { success: false, error: 'Event nicht gefunden' };
    }

    if (!(event as any).breweries?.includes(breweryId)) {
      return { success: false, error: 'Kein Zugriff auf dieses Event' };
    }

    const updateData: any = {};
    if (annotation.brewerLabel !== undefined) updateData.brewer_label = annotation.brewerLabel;
    if (annotation.brewerNotes !== undefined) updateData.brewer_notes = annotation.brewerNotes;

    const { error } = await (supabase as any)
      .from('scan_events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('[Analytics] updateEventAnnotation error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Analytics] updateEventAnnotation exception:', err);
    return { success: false, error: 'Unerwarteter Fehler' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 13.1 — Bottle Journey
// ─────────────────────────────────────────────────────────────────────────────

export type JourneyStep = {
  scanId: string;
  scannedAt: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  countryCode: string | null;
  isOwnerScan: boolean;
  scanIntent: string | null;
  deviceType: string | null;
  distanceFromPreviousKm: number | null;
  daysFromPrevious: number | null;
};

export type BottleJourney = {
  bottleId: string;
  brewId: string | null;
  brewName: string | null;
  filledAt: string | null;
  totalScans: number;
  totalDistanceKm: number;
  totalDaysInCirculation: number;
  steps: JourneyStep[];
};

/** Haversine distance in km between two lat/lng pairs */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottle Picker for Journey — list brewery inventory bottles
// ─────────────────────────────────────────────────────────────────────────────

export type BottlePickerItem = {
  id: string;
  bottleNumber: number;
  brewName: string | null;
  brewStyle: string | null;
  filledAt: string | null;
  scanCount: number;
};

/**
 * Returns a lightweight list of bottles belonging to a brewery,
 * enriched with scan count so the user can pick one for the Journey view.
 */
export async function getBreweryBottlesForJourney(
  breweryId: string,
): Promise<BottlePickerItem[]> {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Access check: must be a brewery member
  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();
  if (!membership) return [];

  // Fetch bottles with brew info
  const { data: bottles } = await supabase
    .from('bottles')
    .select('id, bottle_number, filled_at, brews(name, style)')
    .eq('brewery_id', breweryId)
    .order('bottle_number', { ascending: false })
    .limit(500);

  if (!bottles || bottles.length === 0) return [];

  // Batch-fetch scan counts for these bottles
  const bottleIds = bottles.map((b) => b.id);
  const { data: scanCounts } = await supabase
    .from('bottle_scans')
    .select('bottle_id')
    .in('bottle_id', bottleIds);

  const countMap = new Map<string, number>();
  if (scanCounts) {
    for (const row of scanCounts) {
      countMap.set(row.bottle_id, (countMap.get(row.bottle_id) ?? 0) + 1);
    }
  }

  return bottles.map((b) => ({
    id: b.id,
    bottleNumber: b.bottle_number,
    brewName: (b as any).brews?.name ?? null,
    brewStyle: (b as any).brews?.style ?? null,
    filledAt: b.filled_at,
    scanCount: countMap.get(b.id) ?? 0,
  }));
}

export async function getBottleJourney(
  bottleId: string,
): Promise<BottleJourney | null> {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Load bottle + brew name
  const { data: bottle } = await supabase
    .from('bottles')
    .select('id, brew_id, brewery_id, user_id, filled_at, brews(name)')
    .eq('id', bottleId)
    .single();

  if (!bottle) return null;

  // Access check: bottle owner OR brewery member
  let canAccess = bottle.user_id === user.id;
  if (!canAccess && bottle.brewery_id) {
    const { data: mem } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', bottle.brewery_id)
      .eq('user_id', user.id)
      .single();
    canAccess = !!(mem?.role);
  }
  if (!canAccess) return null;

  // Fetch scans ordered chronologically
  const { data: scans } = await supabase
    .from('bottle_scans')
    .select('id, created_at, latitude, longitude, city, country_code, is_owner_scan, scan_intent, device_type')
    .eq('bottle_id', bottleId)
    .order('created_at', { ascending: true });

  if (!scans || scans.length === 0) {
    return {
      bottleId,
      brewId: bottle.brew_id,
      brewName: (bottle as any).brews?.name ?? null,
      filledAt: bottle.filled_at,
      totalScans: 0,
      totalDistanceKm: 0,
      totalDaysInCirculation: 0,
      steps: [],
    };
  }

  let totalDistanceKm = 0;
  const steps: JourneyStep[] = scans.map((scan, i) => {
    let distanceFromPreviousKm: number | null = null;
    let daysFromPrevious: number | null = null;

    if (i > 0) {
      const prev = scans[i - 1];
      if (prev.latitude != null && prev.longitude != null && scan.latitude != null && scan.longitude != null) {
        distanceFromPreviousKm = Math.round(haversineKm(prev.latitude, prev.longitude, scan.latitude, scan.longitude));
        totalDistanceKm += distanceFromPreviousKm;
      }
      daysFromPrevious = Math.round(
        (new Date(scan.created_at).getTime() - new Date(prev.created_at).getTime()) / 86400000,
      );
    }

    return {
      scanId: scan.id,
      scannedAt: scan.created_at,
      latitude: scan.latitude,
      longitude: scan.longitude,
      city: scan.city,
      countryCode: scan.country_code,
      isOwnerScan: scan.is_owner_scan ?? false,
      scanIntent: scan.scan_intent,
      deviceType: scan.device_type,
      distanceFromPreviousKm,
      daysFromPrevious,
    };
  });

  const totalDaysInCirculation =
    scans.length > 1
      ? Math.round(
          (new Date(scans[scans.length - 1].created_at).getTime() -
            new Date(scans[0].created_at).getTime()) /
            86400000,
        )
      : 0;

  return {
    bottleId,
    brewId: bottle.brew_id,
    brewName: (bottle as any).brews?.name ?? null,
    filledAt: bottle.filled_at,
    totalScans: scans.length,
    totalDistanceKm: Math.round(totalDistanceKm),
    totalDaysInCirculation,
    steps,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 13.3 — Loyalty Breakdown
// ─────────────────────────────────────────────────────────────────────────────

export type LoyaltySegment = 'one_time' | 'returning' | 'fan';

export type LoyaltyBreakdown = {
  segments: {
    segment: LoyaltySegment;
    label: string;
    userCount: number;
    avgRating: number | null;
    scanCount: number;
    color: string;
  }[];
  anonymousScans: number;
  totalTrackedUsers: number;
};

export async function getLoyaltyBreakdown(
  brewId: string,
): Promise<LoyaltyBreakdown | null> {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Access check: must be brewery member or brew owner
  const { data: brew } = await supabase
    .from('brews')
    .select('user_id, brewery_id')
    .eq('id', brewId)
    .single();
  if (!brew) return null;

  let canAccess = brew.user_id === user.id;
  if (!canAccess && brew.brewery_id) {
    const { data: mem } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', brew.brewery_id)
      .eq('user_id', user.id)
      .single();
    canAccess = !!(mem?.role);
  }
  if (!canAccess) return null;

  // Fetch all non-owner scans for the brew
  const { data: scans } = await supabase
    .from('bottle_scans')
    .select('id, viewer_user_id, created_at')
    .eq('brew_id', brewId)
    .neq('is_owner_scan', true);

  if (!scans) return null;

  const anonymousScans = scans.filter((s) => !s.viewer_user_id).length;
  const trackedScans = scans.filter((s) => !!s.viewer_user_id);

  // Group scans by user and count distinct days
  const userDaysMap = new Map<string, Set<string>>();
  const userScanCountMap = new Map<string, number>();
  for (const scan of trackedScans) {
    const uid = scan.viewer_user_id!;
    const day = scan.created_at.slice(0, 10);
    if (!userDaysMap.has(uid)) userDaysMap.set(uid, new Set());
    userDaysMap.get(uid)!.add(day);
    userScanCountMap.set(uid, (userScanCountMap.get(uid) ?? 0) + 1);
  }

  // Classify users
  const segmentMap: Record<LoyaltySegment, string[]> = { one_time: [], returning: [], fan: [] };
  for (const [uid, days] of userDaysMap.entries()) {
    const d = days.size;
    const seg: LoyaltySegment = d >= 5 ? 'fan' : d >= 2 ? 'returning' : 'one_time';
    segmentMap[seg].push(uid);
  }

  // Fetch ratings to compute avg per segment
  const allTrackedUserIds = [...userDaysMap.keys()];
  const { data: ratings } = allTrackedUserIds.length > 0
    ? await supabase
        .from('ratings')
        .select('user_id, rating')
        .eq('brew_id', brewId)
        .in('user_id', allTrackedUserIds)
    : { data: [] };

  const avgRatingForUsers = (uids: string[]): number | null => {
    const r = (ratings ?? []).filter((x) => uids.includes(x.user_id ?? ''));
    if (r.length === 0) return null;
    return Math.round((r.reduce((a, b) => a + b.rating, 0) / r.length) * 10) / 10;
  };

  const scanCountForUsers = (uids: string[]): number =>
    uids.reduce((acc, uid) => acc + (userScanCountMap.get(uid) ?? 0), 0);

  const segmentDefs: { segment: LoyaltySegment; label: string; color: string }[] = [
    { segment: 'fan',      label: 'Fans (5+ Tage)',       color: '#10b981' }, // green
    { segment: 'returning',label: 'Wiederkommer (2–4)',   color: '#f59e0b' }, // amber
    { segment: 'one_time', label: 'Einmaltrinker (1)',     color: '#71717a' }, // zinc
  ];

  return {
    segments: segmentDefs.map(({ segment, label, color }) => ({
      segment,
      label,
      color,
      userCount: segmentMap[segment].length,
      avgRating: avgRatingForUsers(segmentMap[segment]),
      scanCount: scanCountForUsers(segmentMap[segment]),
    })),
    anonymousScans,
    totalTrackedUsers: allTrackedUserIds.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 13.5 — Seasonality Index
// ─────────────────────────────────────────────────────────────────────────────

export type MonthlyDistribution = {
  month: number; // 1–12
  monthName: string;
  scans: number;
  percentage: number;
};

export type SeasonalityResult = {
  distribution: MonthlyDistribution[];
  peakMonth: number;
  peakMonthName: string;
  seasonalityScore: number; // 0–1
  insight: string;
  hasEnoughData: boolean; // needs ≥6 months with scans
};

const MONTH_NAMES_DE = [
  'Jan','Feb','Mär','Apr','Mai','Jun',
  'Jul','Aug','Sep','Okt','Nov','Dez',
];

function calculateSeasonalityScore(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const evenShare = total / 12;
  const deviation = counts.reduce((acc, c) => acc + Math.abs(c - evenShare), 0);
  return Math.min(deviation / (2 * total), 1);
}

export async function getSeasonalityIndex(brewId: string): Promise<SeasonalityResult | null> {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Access check
  const { data: brew } = await supabase
    .from('brews')
    .select('user_id, brewery_id, name')
    .eq('id', brewId)
    .single();
  if (!brew) return null;

  let canAccess = brew.user_id === user.id;
  if (!canAccess && brew.brewery_id) {
    const { data: mem } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', brew.brewery_id)
      .eq('user_id', user.id)
      .single();
    canAccess = !!(mem?.role);
  }
  if (!canAccess) return null;

  const { data: scans } = await supabase
    .from('bottle_scans')
    .select('created_at')
    .eq('brew_id', brewId)
    .neq('is_owner_scan', true);

  if (!scans || scans.length < 10) {
    return {
      distribution: MONTH_NAMES_DE.map((monthName, i) => ({ month: i + 1, monthName, scans: 0, percentage: 0 })),
      peakMonth: 1,
      peakMonthName: MONTH_NAMES_DE[0],
      seasonalityScore: 0,
      insight: 'Noch nicht genug Daten für eine Saisonalitäts-Analyse.',
      hasEnoughData: false,
    };
  }

  const counts = Array(12).fill(0) as number[];
  for (const scan of scans) {
    const month = new Date(scan.created_at).getMonth(); // 0-based
    counts[month]++;
  }

  const total = counts.reduce((a, b) => a + b, 0);
  const distribution: MonthlyDistribution[] = counts.map((scans, i) => ({
    month: i + 1,
    monthName: MONTH_NAMES_DE[i],
    scans,
    percentage: total > 0 ? Math.round((scans / total) * 100) : 0,
  }));

  const peakIdx = counts.indexOf(Math.max(...counts));
  const peakMonth = peakIdx + 1;
  const peakMonthName = MONTH_NAMES_DE[peakIdx];
  const score = calculateSeasonalityScore(counts);
  const monthsWithData = counts.filter((c) => c > 0).length;
  const hasEnoughData = monthsWithData >= 3;

  let insight: string;
  if (score < 0.15) {
    insight = `"${(brew as any).name}" wird gleichmäßig das ganze Jahr konsumiert — kein saisonaler Peak.`;
  } else if (score < 0.4) {
    insight = `Leichte Tendenz Richtung ${peakMonthName} (Score: ${(score * 100).toFixed(0)}%). Erwäge saisonales Marketing.`;
  } else {
    insight = `Starker ${peakMonthName}-Peak (Saisonalitäts-Score: ${(score * 100).toFixed(0)}%). Verstärke Marketing vor der Saison.`;
  }

  return { distribution, peakMonth, peakMonthName, seasonalityScore: score, insight, hasEnoughData };
}

// ============================================================================
// Phase 14 — Marktintelligenz & Distribution
// ============================================================================

// ─── 14.1 Local Trend Radar ──────────────────────────────────────────────────

export type LocalTrend = {
  style: string;
  scanChangePercent: number;  // positive = growing demand
  avgRatingInRadius: number;
  competitorCount: number;    // breweries brewing this style nearby (≥3 to show)
  opportunity: 'high' | 'medium' | 'low';
};

export type LocalTrendRadarResult = {
  trends: LocalTrend[];
  radiusKm: number;
  periodDays: number;         // comparison window used
  hasEnoughData: boolean;
  insight: string;
};

export async function getLocalTrendRadar(
  breweryId: string,
  radiusKm = 50
): Promise<LocalTrendRadarResult | null> {
  const supabase = await createClient();

  // 1 — Derive brewery coordinates from its own recent scans (breweries table has no lat/lng)
  const ownScansForGeo = await supabase
    .from('bottle_scans')
    .select('latitude, longitude')
    .eq('brewery_id', breweryId)
    .not('latitude', 'is', null)
    .limit(100);

  const geoScans = (ownScansForGeo.data ?? []).filter(
    (s) => s.latitude != null && s.longitude != null
  ) as Array<{ latitude: number; longitude: number }>;

  if (geoScans.length === 0) {
    return {
      trends: [],
      radiusKm,
      periodDays: 60,
      hasEnoughData: false,
      insight: 'Keine Geo-Daten für deine Brauerei verfügbar. Scans müssen Standortfreigabe enthalten.',
    };
  }

  const brLat = geoScans.reduce((s, r) => s + r.latitude, 0) / geoScans.length;
  const brLng = geoScans.reduce((s, r) => s + r.longitude, 0) / geoScans.length;

  // 2 — Recent window: last 60 days vs previous 60 days
  const now = new Date();
  const recentStart = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const prevStart   = new Date(now.getTime() - 120 * 86_400_000).toISOString();

  // 3 — Get all scans with brew style + scan location (excl. own brewery)
  const { data: scans, error: scanErr } = await supabase
    .from('bottle_scans')
    .select('id, created_at, latitude, longitude, brews!inner(id, brewery_id, style_normalized, style)')
    .neq('brews.brewery_id', breweryId)
    .gte('created_at', prevStart)
    .limit(5000);

  if (scanErr || !scans) return null;

  // 4 — Filter to radius
  type ScanRow = typeof scans[number];
  const inRadius = (scans as ScanRow[]).filter((s) => {
    const sLat = (s as any).latitude as number | null;
    const sLng = (s as any).longitude as number | null;
    if (!sLat || !sLng) return false;
    return haversineKm(brLat, brLng, sLat, sLng) <= radiusKm;
  });

  if (inRadius.length < 20) {
    return {
      trends: [],
      radiusKm,
      periodDays: 60,
      hasEnoughData: false,
      insight: `Nicht genügend Daten im ${radiusKm}-km-Radius gefunden. Erweitere den Radius oder warte auf mehr Scan-Aktivität.`,
    };
  }

  // 5 — Aggregate per style
  type StyleBucket = {
    recentScans: number;
    prevScans: number;
    breweryIds: Set<string>;
  };

  const styleMap = new Map<string, StyleBucket>();

  for (const s of inRadius) {
    const brew = (s as any).brews as { style_normalized?: string | null; style?: string | null; brewery_id?: string | null } | null;
    const style = brew?.style_normalized ?? brew?.style ?? 'Unbekannt';
    const brewId = brew?.brewery_id ?? '';
    if (!styleMap.has(style)) {
      styleMap.set(style, { recentScans: 0, prevScans: 0, breweryIds: new Set() });
    }
    const bucket = styleMap.get(style)!;
    const createdAt = (s as any).created_at as string;
    if (createdAt >= recentStart) {
      bucket.recentScans++;
    } else {
      bucket.prevScans++;
    }
    if (brewId) bucket.breweryIds.add(brewId);
  }

  // 6 — Build LocalTrend array (only styles with ≥3 breweries)
  const trends: LocalTrend[] = [];
  for (const [style, bucket] of styleMap) {
    if (bucket.breweryIds.size < 3) continue;  // privacy: k-anonymity
    const prevNorm  = Math.max(bucket.prevScans, 1);
    const change    = Math.round(((bucket.recentScans - prevNorm) / prevNorm) * 100);
    const avgRating = 0; // ratings are in a separate table — not joined here for performance
    const compCount = bucket.breweryIds.size;
    const opportunity: LocalTrend['opportunity'] =
      change > 15 && compCount < 5 ? 'high' :
      change > 0  && compCount < 10 ? 'medium' : 'low';
    trends.push({ style, scanChangePercent: change, avgRatingInRadius: avgRating, competitorCount: compCount, opportunity });
  }

  trends.sort((a, b) => {
    const oScore = { high: 2, medium: 1, low: 0 };
    return oScore[b.opportunity] - oScore[a.opportunity] || b.scanChangePercent - a.scanChangePercent;
  });

  const topHigh = trends.find((t) => t.opportunity === 'high');
  const insight = topHigh
    ? `Im ${radiusKm}-km-Radius wächst die Nachfrage nach "${topHigh.style}" um ${topHigh.scanChangePercent > 0 ? '+' : ''}${topHigh.scanChangePercent}%, aber nur ${topHigh.competitorCount} Brauereien brauen diesen Stil — eine Marktlücke.`
    : trends.length > 0
    ? `${trends.length} Bierstile sind in deinem ${radiusKm}-km-Radius aktiv. Keine klare Marktlücke identifiziert.`
    : `Zu wenig regionale Daten für konkrete Empfehlungen.`;

  return { trends: trends.slice(0, 8), radiusKm, periodDays: 60, hasEnoughData: true, insight };
}

// ─── 14.2 Cross-Consumption (Distribution Leads) ─────────────────────────────

export type CrossConsumptionInsight = {
  overlapBreweryCount: number;    // anonymized: how many other breweries my drinkers also visit
  topOverlapStyles: string[];     // styles my drinkers also drink
  geographicHotspots: Array<{
    city: string;
    scanPercentage: number;
  }>;
  myDrinkerCount: number;
  privacyNote: string;
};

export async function getCrossConsumptionInsights(
  breweryId: string
): Promise<CrossConsumptionInsight | null> {
  const supabase = await createClient();

  // 1 — Find users who scanned this brewery's brews
  const { data: myBrews, error: brewErr } = await supabase
    .from('brews')
    .select('id')
    .eq('brewery_id', breweryId)
    .limit(200);

  if (brewErr || !myBrews || myBrews.length === 0) return null;

  const myBrewIds = myBrews.map((b) => b.id);

  const { data: myScans, error: myScanErr } = await supabase
    .from('bottle_scans')
    .select('viewer_user_id, city')
    .in('brew_id', myBrewIds)
    .not('viewer_user_id', 'is', null)
    .limit(2000);

  if (myScanErr || !myScans || myScans.length === 0) return null;

  const myUserIds = [...new Set(myScans.map((s) => s.viewer_user_id).filter(Boolean))] as string[];

  if (myUserIds.length < 10) {
    return {
      overlapBreweryCount: 0,
      topOverlapStyles: [],
      geographicHotspots: [],
      myDrinkerCount: myUserIds.length,
      privacyNote: 'Noch zu wenig Trinker für Cross-Consumption-Analyse (min. 10 benötigt).',
    };
  }

  // 2 — Find what else these users scan (other breweries, anonymized)
  const { data: otherScans, error: otherErr } = await supabase
    .from('bottle_scans')
    .select('viewer_user_id, city, brews!inner(brewery_id, style_normalized, style)')
    .in('viewer_user_id', myUserIds.slice(0, 500))   // cap for performance
    .not('brews.brewery_id', 'eq', breweryId)
    .limit(5000);

  if (otherErr || !otherScans) return null;

  // 3 — Aggregate
  const otherBreweryIds = new Set<string>();
  const styleCount = new Map<string, number>();
  const cityCount  = new Map<string, number>();

  for (const scan of otherScans) {
    const brew = (scan as any).brews as { brewery_id?: string | null; style_normalized?: string | null; style?: string | null } | null;
    if (brew?.brewery_id) otherBreweryIds.add(brew.brewery_id);
    const style = brew?.style_normalized ?? brew?.style;
    if (style) styleCount.set(style, (styleCount.get(style) ?? 0) + 1);
    const city = (scan as any).city as string | null;
    if (city) cityCount.set(city, (cityCount.get(city) ?? 0) + 1);
  }

  const topStyles = [...styleCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([style]) => style);

  const totalCityScans = [...cityCount.values()].reduce((a, b) => a + b, 0);
  const hotspots = [...cityCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city, count]) => ({
      city,
      scanPercentage: Math.round((count / Math.max(totalCityScans, 1)) * 100),
    }));

  return {
    overlapBreweryCount: otherBreweryIds.size,
    topOverlapStyles: topStyles,
    geographicHotspots: hotspots,
    myDrinkerCount: myUserIds.length,
    privacyNote: 'Andere Brauereien werden nicht namentlich genannt (Privacy Shield).',
  };
}

// ─── 14.3 Style Seasonality (Platform-wide) ──────────────────────────────────

export type StyleSeasonalityResult = {
  style: string;
  distribution: MonthlyDistribution[];  // reuse Phase 13.5 type
  peakMonth: number;
  peakMonthName: string;
  releaseRecommendation: string;        // e.g. "Bestes Release-Fenster: September"
  totalScans: number;
  hasEnoughData: boolean;
};

export async function getStyleSeasonality(
  style: string
): Promise<StyleSeasonalityResult | null> {
  const supabase = await createClient();

  if (!style || style.trim() === '') return null;

  // Scans in the last 24 months for this style platform-wide
  const since = new Date(Date.now() - 730 * 86_400_000).toISOString();

  const { data: scans, error } = await supabase
    .from('bottle_scans')
    .select('created_at, brews!inner(style_normalized, style)')
    .or(`brews.style_normalized.ilike.%${style}%,brews.style.ilike.%${style}%`)
    .gte('created_at', since)
    .limit(10000);

  if (error || !scans) return null;

  if (scans.length < 30) {
    return {
      style,
      distribution: [],
      peakMonth: 0,
      peakMonthName: '',
      releaseRecommendation: `Nicht genügend Daten für "${style}" (${scans.length} Scans). Min. 30 benötigt.`,
      totalScans: scans.length,
      hasEnoughData: false,
    };
  }

  // Aggregate by month (1–12)
  const counts = Array(12).fill(0) as number[];
  for (const s of scans) {
    const date = new Date((s as any).created_at as string);
    if (!isNaN(date.getTime())) {
      counts[date.getMonth()]++;
    }
  }

  const total = counts.reduce((a, b) => a + b, 0);
  const distribution: MonthlyDistribution[] = counts.map((scanCount, i) => ({
    month: i + 1,
    monthName: MONTH_NAMES_DE[i],
    scans: scanCount,
    percentage: total > 0 ? Math.round((scanCount / total) * 100) : 0,
  }));

  const peakIdx  = counts.indexOf(Math.max(...counts));
  const peakMonth     = peakIdx + 1;
  const peakMonthName = MONTH_NAMES_DE[peakIdx];

  // Recommend releasing ~6 weeks before peak
  const releaseIdx  = (peakIdx - 1 + 12) % 12;   // one month before peak
  const releaseMonth = MONTH_NAMES_DE[releaseIdx];
  const releaseRecommendation = `Bestes Release-Fenster für "${style}": ${releaseMonth} (Peak im ${peakMonthName}, ${distribution[peakIdx].percentage}% aller Jahres-Scans).`;

  return {
    style,
    distribution,
    peakMonth,
    peakMonthName,
    releaseRecommendation,
    totalScans: total,
    hasEnoughData: true,
  };
}

// ============================================================================
// Phase 9 — Vibe Analytics for Brewery Dashboard
// ============================================================================

export interface VibeCount {
  vibe: string;
  count: number;
  percentage: number;
}

export interface VibeBrewSummary {
  brewId: string;
  brewName: string;
  totalVibeChecks: number;
  topVibes: VibeCount[];
}

export interface BreweryVibeAnalytics {
  totalVibeChecks: number;
  breweryTopVibes: VibeCount[];
  brewSummaries: VibeBrewSummary[];
  socialVsSolo: { social: number; solo: number; other: number };
}

const SOCIAL_VIBES = new Set(['party', 'friends', 'festival', 'bbq', 'date', 'feierabend', 'teambuilding']);
const SOLO_VIBES = new Set(['couch', 'gaming', 'reading', 'meditation', 'cooking', 'bath', 'alone', 'relax', 'selfcare']);

/**
 * Phase 9.1: Get brewery-wide vibe analytics.
 * Fetches all vibe_check events from tasting_score_events for all brews of this brewery.
 */
export async function getBreweryVibeAnalytics(
  breweryId: string,
): Promise<BreweryVibeAnalytics> {
  const supabase = await createClient();

  // Verify membership
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalVibeChecks: 0, breweryTopVibes: [], brewSummaries: [], socialVsSolo: { social: 0, solo: 0, other: 0 } };

  const { data: member } = await supabase
    .from('brewery_members')
    .select('id')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return { totalVibeChecks: 0, breweryTopVibes: [], brewSummaries: [], socialVsSolo: { social: 0, solo: 0, other: 0 } };

  // Get all brews for this brewery
  const { data: brews } = await supabase
    .from('brews')
    .select('id, name')
    .eq('brewery_id', breweryId);

  if (!brews || brews.length === 0) {
    return { totalVibeChecks: 0, breweryTopVibes: [], brewSummaries: [], socialVsSolo: { social: 0, solo: 0, other: 0 } };
  }

  const brewIds = brews.map(b => b.id);
  const brewNameMap: Record<string, string> = {};
  brews.forEach(b => { brewNameMap[b.id] = b.name ?? b.id; });

  // Fetch all vibe_check events for this brewery's brews
  const { data: events } = await supabase
    .from('tasting_score_events')
    .select('brew_id, metadata, created_at')
    .eq('event_type', 'vibe_check')
    .in('brew_id', brewIds);

  if (!events || events.length === 0) {
    return { totalVibeChecks: 0, breweryTopVibes: [], brewSummaries: [], socialVsSolo: { social: 0, solo: 0, other: 0 } };
  }

  // Aggregate vibes
  const breweryVibeCounts: Record<string, number> = {};
  const perBrewVibeCounts: Record<string, Record<string, number>> = {};
  const perBrewTotal: Record<string, number> = {};
  let totalChecks = 0;
  let socialCount = 0, soloCount = 0, otherCount = 0;

  for (const ev of events) {
    const vibes = (ev.metadata as any)?.vibes;
    if (!Array.isArray(vibes) || vibes.length === 0) continue;
    totalChecks++;
    const bId = ev.brew_id;
    if (!bId) continue;
    perBrewTotal[bId] = (perBrewTotal[bId] || 0) + 1;

    // Categorize this check (use first vibe for social/solo classification)
    let classified = false;
    for (const v of vibes) {
      if (SOCIAL_VIBES.has(v)) { socialCount++; classified = true; break; }
      if (SOLO_VIBES.has(v)) { soloCount++; classified = true; break; }
    }
    if (!classified) otherCount++;

    for (const v of vibes) {
      breweryVibeCounts[v] = (breweryVibeCounts[v] || 0) + 1;
      if (!perBrewVibeCounts[bId]) perBrewVibeCounts[bId] = {};
      perBrewVibeCounts[bId][v] = (perBrewVibeCounts[bId][v] || 0) + 1;
    }
  }

  // Build brewery-wide top vibes
  const breweryTopVibes = Object.entries(breweryVibeCounts)
    .map(([vibe, count]) => ({ vibe, count, percentage: totalChecks > 0 ? Math.round((count / totalChecks) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Build per-brew summaries (only brews with data)
  const brewSummaries: VibeBrewSummary[] = Object.entries(perBrewTotal)
    .map(([brewId, total]) => {
      const counts = perBrewVibeCounts[brewId] || {};
      const topVibes = Object.entries(counts)
        .map(([vibe, count]) => ({ vibe, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      return { brewId, brewName: brewNameMap[brewId] || 'Unbekannt', totalVibeChecks: total, topVibes };
    })
    .sort((a, b) => b.totalVibeChecks - a.totalVibeChecks);

  return {
    totalVibeChecks: totalChecks,
    breweryTopVibes,
    brewSummaries,
    socialVsSolo: { social: socialCount, solo: soloCount, other: otherCount },
  };
}

export interface VibeTimeSlot {
  hour: number;
  vibe: string;
  count: number;
}

/**
 * Phase 9.4: Get vibe × time-of-day heatmap data.
 * Returns counts of each vibe per hour of day (0-23).
 */
export async function getVibeTimeHeatmap(
  breweryId: string,
): Promise<{ slots: VibeTimeSlot[]; vibes: string[]; totalChecks: number }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { slots: [], vibes: [], totalChecks: 0 };

  const { data: member } = await supabase
    .from('brewery_members')
    .select('id')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return { slots: [], vibes: [], totalChecks: 0 };

  // Get brew IDs
  const { data: brews } = await supabase
    .from('brews')
    .select('id')
    .eq('brewery_id', breweryId);

  if (!brews || brews.length === 0) return { slots: [], vibes: [], totalChecks: 0 };

  const { data: events } = await supabase
    .from('tasting_score_events')
    .select('metadata, created_at')
    .eq('event_type', 'vibe_check')
    .in('brew_id', brews.map(b => b.id));

  if (!events || events.length === 0) return { slots: [], vibes: [], totalChecks: 0 };

  const slotMap: Record<string, number> = {}; // "hour:vibe" → count
  const vibeSet = new Set<string>();
  let totalChecks = 0;

  for (const ev of events) {
    const vibes = (ev.metadata as any)?.vibes;
    if (!Array.isArray(vibes) || vibes.length === 0) continue;
    totalChecks++;
    const hour = new Date(ev.created_at).getHours();
    for (const v of vibes) {
      vibeSet.add(v);
      const key = `${hour}:${v}`;
      slotMap[key] = (slotMap[key] || 0) + 1;
    }
  }

  const slots: VibeTimeSlot[] = Object.entries(slotMap).map(([key, count]) => {
    const [h, ...rest] = key.split(':');
    return { hour: parseInt(h), vibe: rest.join(':'), count };
  });

  return {
    slots,
    vibes: [...vibeSet].sort(),
    totalChecks,
  };
}
