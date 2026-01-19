// ============================================
// Edge Function: expire-subscriptions
// Schedule: Daily at 00:00 UTC
// Purpose: Auto-downgrade expired subscriptions
// Alerts: Logs to console, future: email admins
// Phase: 1.3 - Daily Cron Job
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration
const ALERT_THRESHOLD = 10; // Alert if more than 10 users expired in one day

interface ExpiryResult {
  expired_count: number;
  expired_user_ids: string[];
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    console.log('[Expiry Cron] Starting daily expiry check...');
    
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    // Call database function
    const { data, error } = await supabase.rpc('expire_subscriptions');
    
    if (error) {
      console.error('[Expiry Cron] ❌ Database function failed:', error);
      
      // TODO: Send alert to admin (Slack/Email/Sentry)
      await sendAdminAlert({
        severity: 'error',
        message: 'expire_subscriptions() failed',
        error: error.message,
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString(),
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Parse results
    const result = data[0] as ExpiryResult;
    const expiredCount = result?.expired_count || 0;
    const expiredUsers = result?.expired_user_ids || [];
    
    const duration = Date.now() - startTime;
    
    console.log(`[Expiry Cron] ✅ Completed in ${duration}ms`);
    console.log(`[Expiry Cron] 📊 Expired subscriptions: ${expiredCount}`);
    
    if (expiredUsers.length > 0) {
      console.log(`[Expiry Cron] 👥 Affected users:`, expiredUsers);
    }
    
    // Alert if unusually high expiry count
    if (expiredCount > ALERT_THRESHOLD) {
      console.warn(`[Expiry Cron] ⚠️ High expiry count: ${expiredCount} users`);
      
      await sendAdminAlert({
        severity: 'warning',
        message: `Unusually high expiry count: ${expiredCount} users`,
        users: expiredUsers,
      });
    }
    
    // TODO: Send expiry notification emails to affected users (Phase 3)
    if (expiredUsers.length > 0) {
      console.log('[Expiry Cron] TODO: Send expiry notification emails');
      // await sendExpiryEmails(expiredUsers);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_count: expiredCount,
        affected_users: expiredUsers.length,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
  } catch (err) {
    console.error('[Expiry Cron] 💥 Unexpected error:', err);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(err),
        timestamp: new Date().toISOString(),
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Send alert to admin (placeholder for future integration)
 */
async function sendAdminAlert(alert: {
  severity: 'error' | 'warning' | 'info';
  message: string;
  error?: string;
  users?: string[];
}) {
  // TODO: Implement Slack webhook or email notification
  console.log(`[Admin Alert] ${alert.severity.toUpperCase()}: ${alert.message}`);
  
  // Future: Send to Slack
  // await fetch(SLACK_WEBHOOK_URL, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     text: `🚨 BotlLab Alert: ${alert.message}`,
  //     attachments: [{
  //       color: alert.severity === 'error' ? 'danger' : 'warning',
  //       fields: [
  //         { title: 'Error', value: alert.error || 'N/A' },
  //         { title: 'Affected Users', value: alert.users?.length || 0 },
  //       ]
  //     }]
  //   })
  // });
}
