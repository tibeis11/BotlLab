import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminDashboardSummary } from '@/lib/actions/analytics-admin-actions'
import { sendAdminDailyReport } from '@/lib/email'

// ============================================================================
// Service Role Client
// ============================================================================
function getSRClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ============================================================================
// GET /api/admin/daily-report
// Triggered daily by Vercel Cron (07:00 UTC) or manually with Bearer token.
//
// Security: requires Authorization: Bearer <CRON_SECRET>
// ============================================================================
export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Fetch recipients ──────────────────────────────────────────────────────
  const supabase = getSRClient()
  const { data: recipients, error: recipientsErr } = await supabase
    .from('admin_users')
    .select('email')
    .eq('role', 'super_admin')
    .eq('is_active', true)
    .eq('daily_report_enabled', true)

  if (recipientsErr) {
    console.error('[daily-report] Failed to fetch recipients:', recipientsErr)
    return NextResponse.json({ error: 'DB error fetching recipients' }, { status: 500 })
  }

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, reason: 'No recipients with daily_report_enabled' })
  }

  // ── Gather platform stats ─────────────────────────────────────────────────
  const summary = await getAdminDashboardSummary()
  if (!summary) {
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 })
  }

  // New users registered today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: newUsersToday } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('joined_at', todayStart.toISOString())

  const reportData = {
    totalUsers:     summary.totalUsers,
    activeUsers30d: summary.activeUsers,
    newUsersToday:  newUsersToday ?? 0,
    totalBrews:     summary.totalBrews,
    totalScans:     summary.totalScans,
    totalBreweries: summary.totalBreweries,
    errorCount24h:  summary.errorCount,
    avgRating:      summary.avgRating,
  }

  // ── Send emails ───────────────────────────────────────────────────────────
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const recipient of recipients) {
    const result = await sendAdminDailyReport(recipient.email, reportData)
    if (result.success) {
      sent++
    } else {
      failed++
      errors.push(`${recipient.email}: ${result.error}`)
      console.error(`[daily-report] Failed to send to ${recipient.email}:`, result.error)
    }
  }

  console.log(`[daily-report] Done. Sent: ${sent}, Failed: ${failed}`)
  return NextResponse.json({ sent, failed, errors: errors.length > 0 ? errors : undefined })
}
