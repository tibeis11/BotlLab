'use server'

import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'

type AnalyticsCategory = 'monetization' | 'ux' | 'system' | 'engagement';

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
