'use server'

import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import crypto from 'crypto'

type AnalyticsCategory = 'monetization' | 'ux' | 'system' | 'engagement' | 'ai' | 'content';

type AnalyticsEvent = {
  event_type: string
  category: AnalyticsCategory
  payload?: Record<string, any>
  path?: string // Optional override, otherwise inferred from referer? (Hard to get in Server Action, better passed or ignored)
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
      user_agent: userAgent
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
      .select('tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[CSV Export] Profile query error:', profileError);
      return { error: 'Error checking tier: ' + profileError.message };
    }

    const tier = ownerProfile?.tier || 'free';
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
    scanSource?: 'qr_code' | 'direct_link' | 'share';
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
      country: headersList.get('x-vercel-ip-country') || 'unknown',
      city: headersList.get('x-vercel-ip-city') || 'unknown',
      latitude: headersList.get('x-vercel-ip-latitude'),
      longitude: headersList.get('x-vercel-ip-longitude')
    };
    
    // IMPORTANT: We discard 'rawIp' immediately and never store it!

    // 4. Daily Rotating Hash for Unique Visitors
    // Salt from ENV or default (rotates daily via date string)
    const dailySalt = new Date().toISOString().slice(0, 10) + (process.env.ANALYTICS_SALT || 'default-salt-change-me');
    const sessionHash = crypto
      .createHash('sha256')
      .update(rawIp + userAgent + dailySalt)
      .digest('hex');

    // 5. Check if viewer is bottle owner (to filter out own scans in analytics)
    let isOwnerScan = false;
    if (payload?.viewerUserId) {
      const { data: bottle } = await supabase
        .from('bottles')
        .select('user_id')
        .eq('id', bottleId)
        .single();
      
      isOwnerScan = bottle?.user_id === payload.viewerUserId;
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

    // Extract hour of day for time-to-glass analysis
    const scanHour = new Date().getHours(); // 0-23

    // 7. Insert Scan Record (without IP!)
    const { error } = await supabase.from('bottle_scans').insert({
      bottle_id: bottleId,
      brew_id: payload?.brewId || null,
      brewery_id: payload?.breweryId || null,
      viewer_user_id: payload?.viewerUserId || null,
      session_hash: sessionHash,
      country_code: geoData.country,
      city: geoData.city,
      latitude: geoData.latitude ? parseFloat(geoData.latitude) : null,
      longitude: geoData.longitude ? parseFloat(geoData.longitude) : null,
      user_agent_parsed: `${detectDeviceType(userAgent)}`, // Could parse more info later
      device_type: detectDeviceType(userAgent),
      scan_source: payload?.scanSource || 'qr_code',
      is_owner_scan: isOwnerScan,
      scanned_at_hour: scanHour // Phase 3: Time-to-Glass tracking
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
          p_brew_id: payload.brewId || null,
          p_country_code: geoData.country,
          p_device_type: detectDeviceType(userAgent),
          p_hour: scanHour // Phase 3: Hour tracking
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

  // Build query
  let query = supabase
    .from('analytics_daily_stats')
    .select('*')
    .eq('brewery_id', breweryId);

  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
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
      if (s.brew_id) {
        if (!acc[s.brew_id]) acc[s.brew_id] = 0;
        acc[s.brew_id] += s.total_scans;
      }
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
  
  // Note: Only fetching points for the heatmap if requested
  // Performance optimization: we could move this to a separate server action
  try {
    const { data: points } = await supabase
      .from('bottle_scans')
      .select('latitude, longitude')
      .eq('brewery_id', breweryId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('created_at', options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Default last 30d
      .limit(500);
      
    if (points) {
      geoPoints = points.map(p => ({ lat: p.latitude, lng: p.longitude }));
    }
  } catch (geoError) {
    console.warn('[Analytics] Failed to fetch geo points:', geoError);
  }

  // Add geoPoints to return data (using 'any' cast as we are extending the return type)
  return { 
    data: { 
      ...summary, 
      geoPoints 
    } as any 
  };
}

/**
 * Get Conversion Rate for Brewery
 * Returns scan-to-rating conversion metrics
 */
export async function getConversionRate(breweryId: string, options?: {
  startDate?: string;
  endDate?: string;
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

    // Query scans with conversion flag
    let query = supabase
      .from('bottle_scans')
      .select('id, converted_to_rating')
      .eq('brewery_id', breweryId);

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    const { data: scans, error } = await query;

    if (error) throw error;
    if (!scans || scans.length === 0) {
      return { data: { totalScans: 0, conversions: 0, rate: 0 } };
    }

    const totalScans = scans.length;
    const conversions = scans.filter(s => s.converted_to_rating).length;
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

