// @ts-nocheck
// evaluate-alerts/index.ts
// Runs every 15 minutes via pg_cron.
// Evaluates all active alert rules against current metrics and writes to
// analytics_alert_history when thresholds are exceeded.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// Types (mirrors analytics_alert_rules / analytics_alert_history schema)
// ============================================================================

interface AlertRule {
  id: number
  name: string
  description: string | null
  metric: string
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
  threshold: number
  timeframe_minutes: number
  notification_channels: string[]
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  enabled: boolean
  last_triggered_at: string | null
}

// ============================================================================
// Email Notification via Resend (for HIGH-priority alerts)
// Called directly via Resend REST API — no Next.js lib available in Deno
// ============================================================================
async function sendAlertEmail(
  rule: AlertRule,
  message: string,
  currentValue: number
): Promise<void> {
  // @ts-ignore Deno.env
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  // @ts-ignore Deno.env
  const rawEmails = Deno.env.get('ADMIN_EMAILS') ?? ''
  const adminEmails = rawEmails.split(',').map((e: string) => e.trim()).filter(Boolean)

  if (!resendKey || adminEmails.length === 0) {
    console.warn('[evaluate-alerts] RESEND_API_KEY or ADMIN_EMAILS not set — skipping email')
    return
  }

  const priorityColor = { LOW: '#6b7280', MEDIUM: '#f59e0b', HIGH: '#ef4444' }[rule.priority]
  const ts = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>BotlLab Alert</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr><td style="background:#18181b;border-radius:12px;padding:32px;">
      <div style="border-left:4px solid ${priorityColor};padding-left:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${priorityColor};">
          ${rule.priority} PRIORITY ALERT
        </p>
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${rule.name}</h1>
      </div>
      <table width="100%" style="border-collapse:collapse;background:#09090b;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#71717a;">Metrik</td>
          <td style="padding:10px 14px;font-size:13px;color:#e4e4e7;">${rule.metric}</td>
        </tr>
        <tr style="background:#111113;">
          <td style="padding:10px 14px;font-size:12px;color:#71717a;">Aktueller Wert</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${priorityColor};">${currentValue}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#71717a;">Schwellenwert</td>
          <td style="padding:10px 14px;font-size:13px;color:#e4e4e7;">${rule.condition} ${rule.threshold}</td>
        </tr>
        <tr style="background:#111113;">
          <td style="padding:10px 14px;font-size:12px;color:#71717a;">Beschreibung</td>
          <td style="padding:10px 14px;font-size:13px;color:#e4e4e7;">${rule.description ?? '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#71717a;">Zeitstempel</td>
          <td style="padding:10px 14px;font-size:13px;color:#e4e4e7;">${ts}</td>
        </tr>
      </table>
      <div style="margin-top:24px;padding:12px 16px;background:#27272a;border-radius:8px;">
        <p style="margin:0;font-size:12px;color:#71717a;">${message}</p>
      </div>
      <p style="margin:24px 0 0;font-size:11px;color:#52525b;text-align:center;">
        BotlLab Admin Alert · <a href="https://botllab.de/admin/dashboard?section=analytics&view=alerts" style="color:#22d3ee;">Dashboard öffnen</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BotlLab Alerts <alerts@botllab.de>',
        to: adminEmails,
        subject: `🔴 HIGH ALERT: ${rule.name} (${rule.metric} = ${currentValue})`,
        html,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[evaluate-alerts] Resend error ${res.status}: ${errText}`)
    } else {
      console.log(`[evaluate-alerts] 📧 Alert email sent for rule "${rule.name}" to ${adminEmails.length} recipient(s)`)
    }
  } catch (err) {
    console.error('[evaluate-alerts] Failed to send alert email:', err)
  }
}

// ============================================================================
// Metric Fetchers
// Maps rule.metric → current value from aggregation tables
// ============================================================================

async function getMetricValue(
  supabase: ReturnType<typeof createClient>,
  metric: string,
  timeframeMinutes: number
): Promise<number | null> {
  const since = new Date(Date.now() - timeframeMinutes * 60 * 1000).toISOString()

  switch (metric) {
    case 'error_rate': {
      // Latest hourly error count from analytics_system_hourly
      const { data } = await supabase
        .from('analytics_system_hourly')
        .select('error_count')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.error_count ?? null
    }

    case 'active_users': {
      const { data } = await supabase
        .from('analytics_system_hourly')
        .select('active_users_count')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.active_users_count ?? null
    }

    case 'api_calls': {
      const { data } = await supabase
        .from('analytics_system_hourly')
        .select('api_calls_count')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.api_calls_count ?? null
    }

    case 'new_signups': {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since)
      return count ?? null
    }

    case 'failed_payments': {
      const { count } = await supabase
        .from('subscription_history')
        .select('*', { count: 'exact', head: true })
        .gte('changed_at', since)
        .ilike('changed_reason', '%fail%')
      return count ?? null
    }

    case 'pending_moderation': {
      // Count brews + breweries with pending moderation status
      const [brews, breweries] = await Promise.all([
        supabase
          .from('brews')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'pending'),
        supabase
          .from('breweries')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'pending'),
      ])
      return ((brews.count ?? 0) + (breweries.count ?? 0))
    }

    case 'ai_errors': {
      const { count } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since)
        .eq('success', false)
      return count ?? null
    }

    default:
      console.warn(`[evaluate-alerts] Unknown metric: ${metric}`)
      return null
  }
}

// ============================================================================
// Condition Evaluator
// ============================================================================

function evaluateCondition(
  condition: AlertRule['condition'],
  currentValue: number,
  threshold: number
): boolean {
  switch (condition) {
    case 'gt':  return currentValue > threshold
    case 'lt':  return currentValue < threshold
    case 'gte': return currentValue >= threshold
    case 'lte': return currentValue <= threshold
    case 'eq':  return currentValue === threshold
    default:    return false
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore Deno.env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore Deno.env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Fetch all active alert rules
    const { data: rules, error: rulesError } = await supabase
      .from('analytics_alert_rules')
      .select('*')
      .eq('enabled', true)

    if (rulesError) throw rulesError
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active alert rules', triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let triggered = 0
    const results: { rule: string; value: number | null; fired: boolean; reason?: string }[] = []

    for (const rule of rules as AlertRule[]) {
      // 2. Cooldown check — don't re-trigger within timeframe_minutes
      if (rule.last_triggered_at) {
        const lastTriggered = new Date(rule.last_triggered_at).getTime()
        const cooldownMs = rule.timeframe_minutes * 60 * 1000
        if (Date.now() - lastTriggered < cooldownMs) {
          results.push({ rule: rule.name, value: null, fired: false, reason: 'cooldown' })
          continue
        }
      }

      // 3. Get current metric value
      const currentValue = await getMetricValue(supabase, rule.metric, rule.timeframe_minutes)

      if (currentValue === null) {
        results.push({ rule: rule.name, value: null, fired: false, reason: 'metric_unavailable' })
        continue
      }

      // 4. Evaluate condition
      const shouldFire = evaluateCondition(rule.condition, currentValue, rule.threshold)

      if (shouldFire) {
        triggered++

        // 5. Insert alert history record
        const message = `${rule.name}: ${rule.metric} is ${currentValue} (condition: ${rule.condition} ${rule.threshold})`
        const { error: insertError } = await supabase
          .from('analytics_alert_history')
          .insert({
            rule_id: rule.id,
            triggered_at: new Date().toISOString(),
            metric_value: currentValue,
            message,
          })

        if (insertError) {
          console.error(`[evaluate-alerts] Failed to insert history for rule ${rule.id}:`, insertError)
          results.push({ rule: rule.name, value: currentValue, fired: false, reason: 'insert_failed' })
          continue
        }

        // 6. Update last_triggered_at on the rule
        await supabase
          .from('analytics_alert_rules')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', rule.id)

        // 7. Send email for HIGH-priority alerts
        if (rule.priority === 'HIGH') {
          await sendAlertEmail(rule, message, currentValue)
        }

        results.push({ rule: rule.name, value: currentValue, fired: true })
        console.log(`[evaluate-alerts] 🔔 Rule fired: ${message}`)
      } else {
        results.push({ rule: rule.name, value: currentValue, fired: false, reason: 'below_threshold' })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rulesChecked: rules.length,
        triggered,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[evaluate-alerts] Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
