'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  UserDailyActivity,
  BreweryDailyActivity,
  ContentDaily,
  SystemHourly,
  Cohort,
  FeatureUsage,
  AlertRule,
  AlertHistory,
  AdminAuditLog,
  DateRange,
  getCutoffDate,
  AdminDashboardSummary,
  UserGrowthData,
  FeatureAdoptionData,
  RevenueStats,
  SubscriptionEvent,
  EmailReportStats,
  EmailReportLog,
  ScanOverview,
  ScanGeography,
  ScanDevice,
  TopScanBrew,
  CisOverview,
  CisFalseNegativeSummary,
  CisRecentScan,
  CisScoringBreakdown,
  EnterpriseCode,
  AdminScanEvent,
  NonceStats,
  DbHealthStats,
} from '@/lib/types/admin-analytics'

// ============================================================================
// Service Role Client (Bypass RLS)
// ============================================================================
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials for Service Role Client')
    throw new Error('Internal Configuration Error')
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

import { getAlgorithmSettings } from '@/lib/algorithm-settings'

// ============================================================================
// Audit Logging Helper
// Only logs DESTRUCTIVE / SENSITIVE operations (not read-only views)
// ============================================================================

// Actions that should be audited (writes, destructive ops, sensitive reads)
const AUDITED_ACTIONS = new Set([
  'approve_item', 'reject_item', 'delete_content', 'update_report_status',
  'resolve_appeal', 'update_user_subscription', 'trigger_aggregation',
  'set_trending_override', 'clear_trending_override', 'set_brew_featured',
  'save_algorithm_settings', 'save_discover_settings',
  'acknowledge_alert', 'create_alert_rule', 'toggle_alert_rule',
  'admin_login', 'admin_action_rate_limited',
])

async function logAdminAction(
  action: string,
  resourceId?: string | null,
  details?: Record<string, any>
) {
  // Skip logging for read-only operations to reduce DB write load
  if (!AUDITED_ACTIONS.has(action)) return

  try {
    // User identity must come from the session client (not service role)
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    
    if (!user) return

    // Read real IP and User-Agent from request headers
    const requestHeaders = await headers()
    const ip = requestHeaders.get('x-forwarded-for')
      ?? requestHeaders.get('x-real-ip')
      ?? null
    const ua = requestHeaders.get('user-agent') ?? null

    // INSERT must use service role — RLS INSERT policy only allows service_role
    const serviceClient = getServiceRoleClient()
    await serviceClient.from('analytics_admin_audit_logs').insert({
      admin_id: user.id,
      action,
      resource_id: resourceId,
      details,
      ip_address: ip,
      user_agent: ua,
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

// ============================================================================
// Dashboard Summary
// ============================================================================

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary | null> {
  try {
    const supabase = getServiceRoleClient()

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    // Active users (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: activeUserData } = await supabase
      .from('analytics_events')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const activeUsers = new Set(activeUserData?.map(e => e.user_id).filter(Boolean)).size

    // Total brews
    const { count: totalBrews } = await supabase
      .from('brews')
      .select('id', { count: 'exact', head: true })

    // Total sessions
    const { count: totalSessions } = await supabase
      .from('brewing_sessions')
      .select('id', { count: 'exact', head: true })

    // Total breweries
    const { count: totalBreweries } = await supabase
      .from('breweries')
      .select('id', { count: 'exact', head: true })

    // Total scans
    const { count: totalScans } = await supabase
      .from('bottle_scans')
      .select('id', { count: 'exact', head: true })

    // Recent errors (last 24h)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    const { count: errorCount } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'error')
      .gte('created_at', oneDayAgo.toISOString())

    // Average rating
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating')

    const avgRating = ratings?.length 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0

    return {
      totalUsers: totalUsers || 0,
      activeUsers,
      totalBrews: totalBrews || 0,
      totalBreweries: totalBreweries || 0,
      totalSessions: totalSessions || 0,
      totalScans: totalScans || 0,
      errorCount: errorCount || 0,
      avgRating: Math.round(avgRating * 10) / 10,
    }
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return null
  }
}

// ============================================================================
// User Analytics
// ============================================================================

export async function getUserDailyActivity(dateRange: DateRange = '30d') {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  const { data, error } = await supabase
    .from('analytics_user_daily')
    .select('*')
    .gte('date', cutoffDate.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) throw error
  return data as UserDailyActivity[]
}

export async function getUserGrowthChart(dateRange: DateRange = '30d'): Promise<UserGrowthData[]> {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  // Try to build growth chart from profile join date (some schemas use `joined_at`)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('joined_at')
    .gte('joined_at', cutoffDate.toISOString())
    .order('joined_at', { ascending: true })

  if (profiles && profiles.length > 0) {
    const groupedByDate: Record<string, number> = {}
    profiles.forEach((p: any) => {
      const date = (p.joined_at || '').split('T')[0]
      if (!date) return
      groupedByDate[date] = (groupedByDate[date] || 0) + 1
    })

    let totalUsers = 0
    return Object.entries(groupedByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        totalUsers += count
        return {
          date,
          newUsers: count,
          totalUsers,
        }
      })
  }

  // Fallback: use pre-aggregated table `analytics_user_daily` if profiles don't have recent joins
  const { data: aggData } = await supabase
    .from('analytics_user_daily')
    .select('date, new_users, total_users')
    .gte('date', cutoffDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (!aggData || aggData.length === 0) return []

  return aggData.map((row: any) => ({
    date: row.date,
    newUsers: Number(row.new_users) || 0,
    totalUsers: Number(row.total_users) || 0,
  }))
}

export async function getActiveUsersCount(dateRange: DateRange = '30d'): Promise<number> {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  const { data, error } = await supabase
    .from('analytics_user_daily')
    .select('user_id')
    .gte('date', cutoffDate.toISOString().split('T')[0])

  if (error) throw error

  const uniqueUsers = new Set(data.map((d) => d.user_id))
  return uniqueUsers.size
}

export async function getCohortAnalysis() {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('analytics_cohorts')
    .select('*')
    .order('cohort_id', { ascending: false })
    .limit(12) // Last 12 months

  if (error) throw error
  return data as Cohort[]
}

export async function getUserTierDistribution() {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier')

  if (error) {
    console.error('Error fetching profiles for tier distribution:', error)
    throw error
  }

  const distribution = {
    free: 0,
    brewer: 0,
    brewery: 0,
    enterprise: 0,
  }

  data.forEach((profile) => {
    const tier = profile.subscription_tier ? profile.subscription_tier.toString().trim().toLowerCase() : 'free'
    if (tier in distribution) {
      distribution[tier as keyof typeof distribution]++
    } else {
      distribution.free++
    }
  })

  return distribution
}

// ============================================================================
// Brewery Analytics
// ============================================================================

export async function getBreweryDailyStats(dateRange: DateRange = '30d') {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  const { data, error } = await supabase
    .from('analytics_brewery_daily')
    .select('*')
    .gte('date', cutoffDate.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) throw error
  return data as BreweryDailyActivity[]
}

export async function getBreweryGrowthChart(dateRange: DateRange = '30d') {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  // Get daily new brewery signups
  const { data } = await supabase
    .from('breweries')
    .select('created_at')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: true })

  if (!data) return []

  // Group by date
  const groupedByDate: Record<string, number> = {}
  data.forEach((brewery) => {
    const date = brewery.created_at.split('T')[0]
    groupedByDate[date] = (groupedByDate[date] || 0) + 1
  })

  // Calculate cumulative total
  let totalBreweries = 0
  return Object.entries(groupedByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      totalBreweries += count
      return {
        date,
        newBreweries: count,
        totalBreweries,
      }
    })
}

// ============================================================================
// Content Analytics
// ============================================================================

export async function getContentDailyStats(dateRange: DateRange = '30d') {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  const { data, error } = await supabase
    .from('analytics_content_daily')
    .select('*')
    .gte('date', cutoffDate.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) throw error
  return data as ContentDaily[]
}

export async function getTopBrews(limit: number = 10) {
  const supabase = getServiceRoleClient()

  // Get brews with most bottles created
  const { data: brewsWithBottles } = await supabase
    .from('bottles')
    .select('brew_id')

  if (!brewsWithBottles) return []

  // Count bottles per brew
  const brewCounts: Record<string, number> = {}
  brewsWithBottles.forEach((b) => {
    if (b.brew_id) {
      brewCounts[b.brew_id] = (brewCounts[b.brew_id] || 0) + 1
    }
  })

  // Get top brew IDs
  const topBrewIds = Object.entries(brewCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id)

  // Fetch brew details
  const { data: brews } = await supabase
    .from('brews')
    .select('id, name, style, is_public, created_at')
    .in('id', topBrewIds)

  if (!brews) return []

  // Combine with counts
  return brews.map((brew) => ({
    ...brew,
    visibility: brew.is_public ? 'public' : 'private', // Map for UI compatibility
    bottle_count: brewCounts[brew.id] || 0,
  }))
}

export async function getRatingDistribution() {
  // Use Service Role for consistent access regardless of RLS
  const supabase = getServiceRoleClient()

  const { data: ratings } = await supabase
    .from('ratings')
    .select('rating')

  if (!ratings) return []

  // Group by rating value
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratings.forEach((r) => {
    const rounded = Math.round(r.rating)
    if (rounded >= 1 && rounded <= 5) {
      distribution[rounded]++
    }
  })

  return Object.entries(distribution).map(([rating, count]) => ({
    label: `${rating} ⭐`,
    count,
  }))
}

// ============================================================================
// System Health
// ============================================================================

export async function getSystemHourlyStats(dateRange: DateRange = '7d') {
  // Must use Service Role to bypass RLS on analytics tables
  const supabase = getServiceRoleClient()
  
  // Convert dateRange to hours
  let hours = 24
  if (dateRange === '24h') hours = 24
  else if (dateRange === '7d') hours = 7 * 24
  else if (dateRange === '30d') hours = 30 * 24
  else if (dateRange === '90d') hours = 90 * 24
  
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - hours)

  const { data, error } = await supabase
    .from('analytics_system_hourly')
    .select('*')
    .gte('timestamp', cutoffTime.toISOString())
    .order('timestamp', { ascending: false })

  if (error) throw error
  return data as SystemHourly[]
}

export async function getRecentErrors(limit: number = 50) {
  // Must use Service Role to bypass RLS on analytics_events
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('category', 'error')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ============================================================================
// Feature Usage
// ============================================================================

export async function getFeatureUsage(dateRange: DateRange = '30d') {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  const { data, error } = await supabase
    .from('analytics_feature_usage')
    .select('*')
    .gte('date', cutoffDate.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) throw error
  return data as FeatureUsage[]
}

export async function getFeatureUsageStats(dateRange: DateRange = '7d') {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  const { data, error } = await supabase
    .from('analytics_feature_usage')
    .select('*')
    .gte('date', cutoffDate.toISOString().split('T')[0])
    .order('usage_count', { ascending: false })

  if (error) throw error

  // Aggregate by feature
  const featureMap: Record<string, any> = {}
  data.forEach((row) => {
    // Normalize feature name (remove _success/_error suffix for grouping, or keep distinct?)
    // Keeping distinct gives better error rate analysis per specific action type
    
    if (!featureMap[row.feature]) {
      // Determine category based on prefix/name
      let category = 'core';
      if (row.feature.includes('generate_') || row.feature.includes('ai')) {
          category = 'premium_ai';
      } else if (row.feature.includes('limit_reached')) {
          category = 'monetization';
      }

      featureMap[row.feature] = {
        feature: row.feature,
        category: category,
        usage_count: 0,
        unique_users: 0,
        success_count: 0,
        error_count: 0
      }
    }
    featureMap[row.feature].usage_count += row.usage_count || 0
    featureMap[row.feature].unique_users += row.unique_users || 0
    featureMap[row.feature].success_count += row.success_count || 0
    featureMap[row.feature].error_count += row.error_count || 0
  })

  return Object.values(featureMap).sort((a: any, b: any) => b.usage_count - a.usage_count)
}

export async function getFeatureUsageSummary(dateRange: DateRange = '30d'): Promise<FeatureAdoptionData[]> {
  const data = await getFeatureUsage(dateRange)

  // Group by feature
  const featureMap: Record<string, { usage: number; users: Set<number>; success: number; error: number; category: string }> = {}

  data.forEach((row) => {
    if (!featureMap[row.feature]) {
      let category = 'core';
      if (row.feature.includes('generate_') || row.feature.includes('ai')) {
          category = 'premium_ai';
      } else if (row.feature.includes('limit_reached')) {
          category = 'monetization';
      }

      featureMap[row.feature] = {
        usage: 0,
        users: new Set(),
        success: 0,
        error: 0,
        category
      }
    }
    featureMap[row.feature].usage += row.usage_count
    featureMap[row.feature].success += row.success_count
    featureMap[row.feature].error += row.error_count
  })

  return Object.entries(featureMap).map(([feature, stats]) => ({
    feature,
    category: stats.category, // Pass this through to UI
    usageCount: stats.usage,
    uniqueUsers: stats.users.size,
    successRate: stats.usage > 0 ? (stats.success / stats.usage) * 100 : 0,
  }))
}

// ============================================================================
// Manual Trigger for Testing
// ============================================================================

export async function triggerAggregation(
  mode: 'daily' | 'hourly' | 'cohorts' | 'features',
  date?: string
) {
  await logAdminAction('trigger_aggregation', null, { mode, date })

  const supabase = getServiceRoleClient()

  const { data, error } = await supabase.functions.invoke('aggregate-analytics', {
    body: { mode, date },
  })

  if (error) {
    // Try to extract the actual response body for a more helpful error message
    let detail = error.message
    try {
      const ctx = (error as any).context
      if (ctx instanceof Response) {
        const text = await ctx.text()
        detail = text || detail
      } else if (typeof ctx === 'string') {
        detail = ctx
      }
    } catch {}
    throw new Error(`Aggregation failed: ${detail}`)
  }

  return data
}

// ============================================================================
// Admin: Update User Subscription Plan (server-side helper)
// ============================================================================
export async function updateUserSubscriptionPlan(email: string, plan: string) {
  try {
    const adminClient = getServiceRoleClient()

    // 1. List users via Admin SDK
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
      throw new Error('Fehler bei der Benutzersuche im Auth-System.')
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      throw new Error('Benutzer mit dieser E-Mail wurde im System nicht gefunden.')
    }

    // 2. Update profiles table for this user id
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        subscription_tier: plan,
        subscription_status: 'active'
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw new Error('Fehler beim Aktualisieren des Profils in der Datenbank.')
    }

    await logAdminAction('update_user_subscription', user.id, { email, plan })

    return { success: true }
  } catch (error: any) {
    console.error('updateUserSubscriptionPlan error:', error)
    throw error
  }
}

// ============================================================================
// Admin: Update User App Mode (drinker ↔ brewer)
// ============================================================================
export async function updateUserAppMode(email: string, mode: 'drinker' | 'brewer') {
  try {
    const adminClient = getServiceRoleClient()

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
      throw new Error('Fehler bei der Benutzersuche im Auth-System.')
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      throw new Error('Benutzer mit dieser E-Mail wurde im System nicht gefunden.')
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ app_mode: mode })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating app_mode:', profileError)
      throw new Error('Fehler beim Aktualisieren des App-Modus.')
    }

    await logAdminAction('update_user_app_mode', user.id, { email, mode })

    return { success: true }
  } catch (error: any) {
    console.error('updateUserAppMode error:', error)
    throw error
  }
}

// ============================================================================
// Audit Logs (for transparency)
// ============================================================================

export async function getAdminAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('analytics_admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as AdminAuditLog[]
}

// ============================================================================
// Security: Content Preview via Service Role (replaces direct client SDK usage)
// ============================================================================

export async function getContentPreviewForAdmin(
  type: 'brew' | 'user' | 'brewery' | 'forum_thread' | 'forum_post',
  id: string
): Promise<{ name: string | null; img: string | null; link: string } | null> {
  const supabase = getServiceRoleClient()

  let table = ''
  let select = 'id'

  if (type === 'brew') { table = 'brews'; select = 'id, name, image_url' }
  else if (type === 'user') { table = 'profiles'; select = 'id, display_name, logo_url' }
  else if (type === 'brewery') { table = 'breweries'; select = 'id, name, logo_url' }
  else if (type === 'forum_thread') { table = 'forum_threads'; select = 'id, title' }
  else if (type === 'forum_post') { table = 'forum_posts'; select = 'id, content, thread_id' }
  else return null

  const { data } = await supabase.from(table).select(select).eq('id', id).maybeSingle()
  if (!data) return null

  const name = (data as any).name
    || (data as any).display_name
    || (data as any).title
    || ((data as any).content ? (data as any).content.substring(0, 40) : 'Unbekannt')
  const img = (data as any).image_url || (data as any).logo_url || null

  let link = '#'
  if (type === 'brew') link = `/brew/${id}`
  if (type === 'user') link = `/brewer/${id}`
  if (type === 'brewery') link = `/brewery/${id}`
  if (type === 'forum_thread') link = `/forum/thread/${id}`
  if (type === 'forum_post') link = `/forum/thread/${(data as any).thread_id}#post-${id}`

  return { name, img, link }
}

// ============================================================================
// Alert Rules & History
// ============================================================================

export async function getAlertRules(): Promise<AlertRule[]> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('analytics_alert_rules')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as AlertRule[]
}

export async function getAlertHistory(limit: number = 50): Promise<AlertHistory[]> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('analytics_alert_history')
    .select('*, analytics_alert_rules(name, metric)')
    .order('triggered_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as AlertHistory[]
}

export async function getUnacknowledgedAlertCount(): Promise<number> {
  const supabase = getServiceRoleClient()
  const { count } = await supabase
    .from('analytics_alert_history')
    .select('id', { count: 'exact', head: true })
    .is('acknowledged_at', null)
  return count || 0
}

export async function toggleAlertRule(ruleId: number, enabled: boolean) {
  await logAdminAction('toggle_alert_rule', String(ruleId), { enabled })
  const supabase = getServiceRoleClient()
  const { error } = await supabase
    .from('analytics_alert_rules')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
  if (error) throw error
  return { success: true }
}

export async function acknowledgeAlert(historyId: number, adminNote?: string) {
  await logAdminAction('acknowledge_alert', String(historyId), { adminNote })
  const supabase = getServiceRoleClient()
  const { data: { user } } = await (await createClient()).auth.getUser()
  const { error } = await supabase
    .from('analytics_alert_history')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user?.id ?? null,
    })
    .eq('id', historyId)
  if (error) throw error
  return { success: true }
}

// ============================================================================
// BotlGuide Feedback
// ============================================================================

// ── BotlGuide Usage Stats (from audit_log RPC) ────────────────────────────

export type BotlguideUsageStats = {
  totalCalls: number
  totalCredits: number
  uniqueUsers: number
  avgResponseMs: number
  p50ResponseMs: number
  p95ResponseMs: number
  errorRate: number
  byCapability: {
    capability: string
    calls: number
    avgMs: number
    credits: number
    errorRate: number
  }[]
  dailyTrend: {
    date: string
    calls: number
    credits: number
    avgMs: number
  }[]
  teamRagUsage: {
    breweryId: string
    calls: number
    ragCalls: number
  }[]
  topErrors: {
    capability: string
    errorMessage: string
    count: number
  }[]
}

export async function getBotlguideUsageStats(
  dateRange: DateRange = '30d'
): Promise<BotlguideUsageStats | null> {
  const supabase = getServiceRoleClient()
  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
  const { data, error } = await supabase.rpc('get_botlguide_usage_stats', { p_days: days })
  if (error) { console.error('Usage stats error:', error); return null }
  return (data as unknown as BotlguideUsageStats) ?? null
}

export type BotlguideFeedbackItem = {
  id: string
  user_id: string | null
  context_key: string
  feedback: 'up' | 'down'
  generated_text: string | null
  created_at: string
}

export type BotlguideFeedbackStats = {
  total: number
  thumbsUp: number
  thumbsDown: number
  positiveRate: number
  byContext: { context_key: string; up: number; down: number; total: number }[]
}

export async function getBotlguideFeedback(
  dateRange: DateRange = '30d',
  limit = 100
): Promise<BotlguideFeedbackItem[]> {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)
  const { data, error } = await supabase
    .from('botlguide_feedback')
    .select('*')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as BotlguideFeedbackItem[]
}

export async function getBotlguideFeedbackStats(
  dateRange: DateRange = '30d'
): Promise<BotlguideFeedbackStats> {
  const items = await getBotlguideFeedback(dateRange, 5000)
  const total = items.length
  const thumbsUp = items.filter(i => i.feedback === 'up').length
  const thumbsDown = items.filter(i => i.feedback === 'down').length

  const byContextMap: Record<string, { up: number; down: number }> = {}
  items.forEach(i => {
    if (!byContextMap[i.context_key]) byContextMap[i.context_key] = { up: 0, down: 0 }
    byContextMap[i.context_key][i.feedback]++
  })

  const byContext = Object.entries(byContextMap)
    .map(([context_key, counts]) => ({
      context_key,
      up: counts.up,
      down: counts.down,
      total: counts.up + counts.down,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  return {
    total,
    thumbsUp,
    thumbsDown,
    positiveRate: total > 0 ? Math.round((thumbsUp / total) * 100) : 0,
    byContext,
  }
}

// ============================================================================
// AI Usage Logs
// ============================================================================

export type AiUsageStats = {
  totalCalls: number
  successCalls: number
  errorCalls: number
  totalCostEur: number
  totalTokens: number
  byType: { type: string; calls: number; cost: number; tokens: number }[]
  byModel: { model: string; calls: number; cost: number }[]
  dailyTrend: { date: string; calls: number; cost: number; errors: number }[]
}

export async function getAiUsageStats(dateRange: DateRange = '30d'): Promise<AiUsageStats> {
  const supabase = getServiceRoleClient()
  const cutoffDate = getCutoffDate(dateRange)

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('generation_type, model_used, tokens_used, cost_estimate, success, created_at')
    .gte('created_at', cutoffDate.toISOString())
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!data) return {
    totalCalls: 0, successCalls: 0, errorCalls: 0,
    totalCostEur: 0, totalTokens: 0, byType: [], byModel: [], dailyTrend: []
  }

  const totalCalls = data.length
  const successCalls = data.filter(r => r.success).length
  const errorCalls = totalCalls - successCalls
  const totalCostEur = data.reduce((s, r) => s + (r.cost_estimate || 0), 0)
  const totalTokens = data.reduce((s, r) => s + (r.tokens_used || 0), 0)

  // By type
  const byTypeMap: Record<string, { calls: number; cost: number; tokens: number }> = {}
  data.forEach(r => {
    if (!byTypeMap[r.generation_type]) byTypeMap[r.generation_type] = { calls: 0, cost: 0, tokens: 0 }
    byTypeMap[r.generation_type].calls++
    byTypeMap[r.generation_type].cost += r.cost_estimate || 0
    byTypeMap[r.generation_type].tokens += r.tokens_used || 0
  })

  // By model
  const byModelMap: Record<string, { calls: number; cost: number }> = {}
  data.forEach(r => {
    if (!byModelMap[r.model_used]) byModelMap[r.model_used] = { calls: 0, cost: 0 }
    byModelMap[r.model_used].calls++
    byModelMap[r.model_used].cost += r.cost_estimate || 0
  })

  // Daily trend
  const dailyMap: Record<string, { calls: number; cost: number; errors: number }> = {}
  data.forEach(r => {
    const date = r.created_at.split('T')[0]
    if (!dailyMap[date]) dailyMap[date] = { calls: 0, cost: 0, errors: 0 }
    dailyMap[date].calls++
    dailyMap[date].cost += r.cost_estimate || 0
    if (!r.success) dailyMap[date].errors++
  })

  return {
    totalCalls,
    successCalls,
    errorCalls,
    totalCostEur: Math.round(totalCostEur * 1000) / 1000,
    totalTokens,
    byType: Object.entries(byTypeMap).map(([type, v]) => ({ type, ...v })),
    byModel: Object.entries(byModelMap).map(([model, v]) => ({ model, ...v })),
    dailyTrend: Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
  }
}

// ============================================================================
// PHASE C.1 – Revenue & Subscriptions
// ============================================================================

const TIER_PRICES: Record<string, number> = {
  free: 0,
  brewer: 4.99,
  brewery: 14.99,
  enterprise: 49.99,
}

const TIER_RANK: Record<string, number> = {
  free: 0,
  brewer: 1,
  brewery: 2,
  enterprise: 3,
}

export async function getRevenueStats(dateRange: DateRange = '30d'): Promise<RevenueStats> {
  const service = getServiceRoleClient()
  const cutoff = getCutoffDate(dateRange)

  // Current subscriptions from profiles
  const { data: profiles } = await service
    .from('profiles')
    .select('subscription_tier, subscription_status')

  const activePaid = (profiles || []).filter(
    p => p.subscription_tier !== 'free' && p.subscription_status === 'active'
  )
  const activePaidUsers = activePaid.length
  const mrrEur = activePaid.reduce((sum, p) => sum + (TIER_PRICES[p.subscription_tier] ?? 0), 0)

  // Subscription events in date range
  const { data: events } = await service
    .from('subscription_history')
    .select('*')
    .gte('changed_at', cutoff.toISOString())
    .order('changed_at', { ascending: false })

  const upgradeLast30d = (events || []).filter(e =>
    e.previous_tier &&
    (TIER_RANK[e.subscription_tier] ?? 0) > (TIER_RANK[e.previous_tier] ?? 0)
  ).length

  const downgradeLast30d = (events || []).filter(e =>
    e.previous_tier &&
    (TIER_RANK[e.subscription_tier] ?? 0) < (TIER_RANK[e.previous_tier] ?? 0)
  ).length

  const churnLast30d = (events || []).filter(
    e => e.subscription_status === 'cancelled'
  ).length

  // Tier distribution
  const distMap: Record<string, number> = { free: 0, brewer: 0, brewery: 0, enterprise: 0 }
  ;(profiles || []).forEach(p => {
    const t = p.subscription_tier || 'free'
    distMap[t] = (distMap[t] || 0) + 1
  })
  const totalUsers = Math.max((profiles || []).length, 1)
  const tierDistribution = Object.entries(distMap).map(([tier, count]) => ({
    tier,
    count,
    pct: Math.round((count / totalUsers) * 100),
  }))

  // Monthly MRR trend (from subscription events)
  const monthlyMap: Record<string, { activeSet: Set<string>; mrr: number }> = {}
  ;(events || []).forEach(e => {
    const month = (e.changed_at as string).slice(0, 7)
    if (!monthlyMap[month]) monthlyMap[month] = { activeSet: new Set(), mrr: 0 }
    if (e.subscription_tier !== 'free' && e.subscription_status === 'active') {
      monthlyMap[month].activeSet.add(e.profile_id)
      monthlyMap[month].mrr += TIER_PRICES[e.subscription_tier] ?? 0
    }
  })
  const monthlyTrend = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      mrr: Math.round(v.mrr * 100) / 100,
      activePaid: v.activeSet.size,
    }))

  return {
    activePaidUsers,
    mrrEur: Math.round(mrrEur * 100) / 100,
    churnLast30d,
    upgradeLast30d,
    downgradeLast30d,
    tierDistribution,
    monthlyTrend,
  }
}

export async function getSubscriptionEvents(limit: number = 50): Promise<SubscriptionEvent[]> {
  const service = getServiceRoleClient()
  const { data } = await service
    .from('subscription_history')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit)

  return (data || []).map(e => {
    const curRank = TIER_RANK[e.subscription_tier] ?? 0
    const prRank = e.previous_tier != null ? (TIER_RANK[e.previous_tier] ?? 0) : -1

    let eventType: SubscriptionEvent['eventType'] = 'other'
    if (e.subscription_status === 'cancelled') eventType = 'cancel'
    else if (e.changed_reason === 'reactivated') eventType = 'reactivate'
    else if (!e.previous_tier || e.previous_tier === 'free') eventType = 'new'
    else if (curRank > prRank) eventType = 'upgrade'
    else if (curRank < prRank) eventType = 'downgrade'

    return {
      id: e.id as string,
      profileIdMasked: `${(e.profile_id as string).slice(0, 8)}…`,
      tier: e.subscription_tier as string,
      previousTier: (e.previous_tier as string) ?? null,
      status: e.subscription_status as string,
      reason: (e.changed_reason as string) ?? null,
      changedAt: e.changed_at as string,
      eventType,
    }
  })
}

// ============================================================================
// PHASE C.2 – Email Reports
// ============================================================================

export async function getEmailReportStats(): Promise<EmailReportStats> {
  const service = getServiceRoleClient()
  const cutoff30d = getCutoffDate('30d')

  const [{ data: settings }, { data: logs }] = await Promise.all([
    service
      .from('analytics_report_settings')
      .select('frequency, enabled')
      .eq('enabled', true),
    service
      .from('analytics_report_logs')
      .select('status')
      .gte('created_at', cutoff30d.toISOString()),
  ])

  const activeSubscriptions = (settings || []).length
  const weeklySubscriptions = (settings || []).filter(s => s.frequency === 'weekly').length
  const monthlySubscriptions = (settings || []).filter(s => s.frequency === 'monthly').length
  const sentLast30d = (logs || []).filter(l => l.status === 'sent').length
  const failedLast30d = (logs || []).filter(l => l.status === 'failed').length
  const total = sentLast30d + failedLast30d
  const successRate = total > 0 ? Math.round((sentLast30d / total) * 100) : 100

  return {
    activeSubscriptions,
    weeklySubscriptions,
    monthlySubscriptions,
    sentLast30d,
    failedLast30d,
    successRate,
  }
}

export async function getRecentEmailReportLogs(limit: number = 50): Promise<EmailReportLog[]> {
  const service = getServiceRoleClient()
  const { data } = await service
    .from('analytics_report_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).map(l => ({
    id: l.id as string,
    breweryId: l.brewery_id as string,
    periodStart: l.period_start as string,
    periodEnd: l.period_end as string,
    status: l.status as EmailReportLog['status'],
    errorMessage: (l.error_message as string) ?? null,
    emailMasked: l.email_sent_to
      ? (l.email_sent_to as string).replace(/^(.{2}).+?(@.+)$/, '$1***$2')
      : null,
    createdAt: l.created_at as string,
  }))
}

// ============================================================================
// PHASE C.3 – Scan Analytics
// ============================================================================

export async function getScanOverview(dateRange: DateRange = '30d'): Promise<ScanOverview> {
  const service = getServiceRoleClient()
  const cutoff = getCutoffDate(dateRange)
  const cutoffIso = cutoff.toISOString()

  const { data } = await service
    .from('bottle_scans')
    .select('id, session_hash, viewer_user_id, is_owner_scan, created_at')
    .gte('created_at', cutoffIso)

  const rows = data ?? []
  const totalScans = rows.length
  const visitors = new Set(
    rows.map(r => r.session_hash ?? r.viewer_user_id ?? r.id)
  )
  const uniqueVisitors = visitors.size

  const now = new Date()
  const from = new Date(cutoffIso)
  const days = Math.max(
    1,
    Math.round((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  )
  const avgPerDay = Math.round((totalScans / days) * 10) / 10
  const nonOwner = rows.filter(r => !r.is_owner_scan).length
  const conversionRate =
    totalScans > 0 ? Math.round((nonOwner / totalScans) * 100) : 0

  return { totalScans, uniqueVisitors, avgPerDay, conversionRate }
}

export async function getScanGeography(
  dateRange: DateRange = '30d',
  limit = 10
): Promise<ScanGeography[]> {
  const service = getServiceRoleClient()
  const cutoff = getCutoffDate(dateRange)

  const { data } = await service
    .from('bottle_scans')
    .select('country_code')
    .gte('created_at', cutoff.toISOString())
    .not('country_code', 'is', null)

  const rows = data ?? []
  const total = Math.max(rows.length, 1)
  const map: Record<string, number> = {}
  rows.forEach(r => {
    map[r.country_code] = (map[r.country_code] || 0) + 1
  })

  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([countryCode, scans]) => ({
      countryCode,
      scans,
      pct: Math.round((scans / total) * 100),
    }))
}

export async function getScanDeviceSplit(dateRange: DateRange = '30d'): Promise<ScanDevice[]> {
  const service = getServiceRoleClient()
  const cutoff = getCutoffDate(dateRange)

  const { data } = await service
    .from('bottle_scans')
    .select('device_type')
    .gte('created_at', cutoff.toISOString())

  const rows = data ?? []
  const total = Math.max(rows.length, 1)
  const map: Record<string, number> = {}
  rows.forEach(r => {
    const d = (r.device_type as string) || 'unknown'
    map[d] = (map[d] || 0) + 1
  })

  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([deviceType, count]) => ({
      deviceType,
      count,
      pct: Math.round((count / total) * 100),
    }))
}

export async function getTopScanBrews(
  dateRange: DateRange = '30d',
  limit = 10
): Promise<TopScanBrew[]> {
  const service = getServiceRoleClient()
  const cutoff = getCutoffDate(dateRange)

  const { data } = await service
    .from('bottle_scans')
    .select('brew_id, brews(name, breweries(name))')
    .gte('created_at', cutoff.toISOString())
    .not('brew_id', 'is', null)

  const rows = data ?? []
  const map: Record<
    string,
    { brewName: string; breweryName: string; scans: number }
  > = {}
  rows.forEach((r: any) => {
    if (!r.brew_id) return
    if (!map[r.brew_id]) {
      map[r.brew_id] = {
        brewName: r.brews?.name ?? 'Unbekannter Brew',
        breweryName: r.brews?.breweries?.name ?? 'Unbekannte Brauerei',
        scans: 0,
      }
    }
    map[r.brew_id].scans++
  })

  return Object.entries(map)
    .sort(([, a], [, b]) => b.scans - a.scans)
    .slice(0, limit)
    .map(([brewId, v]) => ({ brewId, ...v }))
}

// ============================================================================
// PHASE D — CIS Admin Monitoring (2026-03-08)
// ============================================================================

/**
 * D.1 — Platform-wide CIS overview for the admin Scan Analytics view.
 * Returns source breakdown, weighted drinker estimate, classification backlog,
 * intent distribution, and Hard Proof (confirmed) rate.
 */
export async function getCisOverview(dateRange: DateRange = '30d'): Promise<CisOverview> {
  const service = getServiceRoleClient()
  const cutoff = getCutoffDate(dateRange)
  const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  // ── Fetch all scans in range (only fields we need) ─────────────────────────
  const { data: scans } = await service
    .from('bottle_scans')
    .select('id, scan_source, drinking_probability, scan_intent, created_at')
    .gte('created_at', cutoff.toISOString())

  const rows = scans ?? []
  const total = Math.max(rows.length, 1)

  // ── Source breakdown (Hard Rule 0.1 impact) ───────────────────────────────
  const sourceMap: Record<string, number> = {}
  rows.forEach((r: any) => {
    const src = (r.scan_source as string) || 'unknown'
    sourceMap[src] = (sourceMap[src] || 0) + 1
  })
  const sourceBreakdown = Object.entries(sourceMap)
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => ({
      source,
      count,
      pct: Math.round((count / total) * 100),
      isHardZero: source !== 'qr_code',
    }))

  // ── Categorized Estimated Consumers (QR scans only) ─────────────────────────
  const qrRows = rows.filter((r: any) => r.scan_source === 'qr_code')
  const qrScanCount = qrRows.length
  
  let possible = 0
  let likely = 0
  let highlyLikely = 0
  let noConsumption = 0

  qrRows.forEach((r: any) => {
    const p = (r.drinking_probability as number) ?? 0
    if (p >= 0.80) {
      highlyLikely++
    } else if (p >= 0.65) {
      likely++
    } else if (p >= 0.50) {
      possible++
    } else {
      noConsumption++
    }
  })

  const estimatedConsumers = {
    possible,
    likely,
    highlyLikely,
    noConsumption
  }

  // ── Pending classification backlog ────────────────────────────────────────
  const { count: pendingClassification } = await service
    .from('bottle_scans')
    .select('id', { count: 'exact', head: true })
    .is('scan_intent', null)
    .gte('created_at', pendingCutoff) as any

  // ── Intent distribution ───────────────────────────────────────────────────
  const intentMap: Record<string, { count: number; probSum: number }> = {}
  rows.forEach((r: any) => {
    const intent = (r.scan_intent as string) || '__unclassified__'
    if (!intentMap[intent]) intentMap[intent] = { count: 0, probSum: 0 }
    intentMap[intent].count++
    intentMap[intent].probSum += (r.drinking_probability as number) ?? 0
  })
  const classifiedRows = rows.filter((r: any) => r.scan_intent != null)
  const classifiedTotal = Math.max(classifiedRows.length, 1)
  const intentDistribution = Object.entries(intentMap)
    .filter(([intent]) => intent !== '__unclassified__')
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([intent, { count, probSum }]) => ({
      intent,
      count,
      pct: Math.round((count / classifiedTotal) * 100),
      avgProbability: count > 0 ? Math.round((probSum / count) * 1000) / 1000 : 0,
    }))

  // ── Confirmed (Hard Proof) stats ──────────────────────────────────────────
  const confirmedScans = rows.filter((r: any) => r.scan_intent === 'confirmed').length
  const confirmedRate = qrScanCount > 0
    ? Math.round((confirmedScans / qrScanCount) * 1000) / 1000
    : 0

  return {
    sourceBreakdown,
    estimatedConsumers,
    qrScanCount,
    pendingClassification: pendingClassification ?? 0,
    intentDistribution,
    confirmedScans,
    confirmedRate,
  }
}

/**
 * D.2 — False-Negative Tracker for the admin Model Health view.
 * Finds scans classified with drinking_probability < 0.3 where the user
 * later confirmed they were drinking (rating or BTB).
 * Limited to last 30 days to keep queries fast.
 */
export async function getCisFalseNegatives(): Promise<CisFalseNegativeSummary> {
  const service = getServiceRoleClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // ── Load candidate scans (low probability, classified, authenticated) ─────
  const { data: candidateScans } = await service
    .from('bottle_scans')
    .select('id, viewer_user_id, brew_id, drinking_probability, scan_intent, created_at')
    .gte('created_at', cutoff)
    .lt('drinking_probability', 0.3)
    .not('scan_intent', 'is', null)
    .neq('scan_intent', 'confirmed')
    .not('viewer_user_id', 'is', null)
    .limit(2000) as any

  if (!candidateScans || candidateScans.length === 0) {
    return { total: 0, byIntent: [], examples: [] }
  }

  // ── Load ratings in the same period ──────────────────────────────────────
  const { data: ratings } = await service
    .from('ratings')
    .select('user_id, brew_id, created_at')
    .gte('created_at', cutoff) as any

  const ratingSet = new Set<string>(
    (ratings ?? []).map((r: any) => `${r.user_id}::${r.brew_id}`)
  )

  // ── Load BTB events (Phase 8.7: exclude anonymous events to prevent null::brew_id false matches) ──
  const { data: btbEvents } = await service
    .from('tasting_score_events')
    .select('user_id, brew_id, created_at')
    .gte('created_at', cutoff)
    .eq('event_type', 'beat_the_brewer')
    .not('user_id', 'is', null) as any

  const btbSet = new Set<string>(
    (btbEvents ?? []).map((r: any) => `${r.user_id}::${r.brew_id}`)
  )

  // ── Find false negatives ──────────────────────────────────────────────────
  const falseNegs = candidateScans.filter((s: any) => {
    const key = `${s.viewer_user_id}::${s.brew_id}`
    return ratingSet.has(key) || btbSet.has(key)
  })

  if (falseNegs.length === 0) {
    return { total: 0, byIntent: [], examples: [] }
  }

  // ── Resolve brew names for top examples ──────────────────────────────────
  const topExamples = falseNegs.slice(0, 20)
  const brewIds = [...new Set(topExamples.map((s: any) => s.brew_id))].filter(Boolean)
  const { data: brews } = await service
    .from('brews')
    .select('id, name')
    .in('id', brewIds) as any

  const brewNameMap: Record<string, string> = {}
  ;(brews ?? []).forEach((b: any) => { brewNameMap[b.id] = b.name })

  const examples = topExamples.map((s: any) => {
    const ratingKey = `${s.viewer_user_id}::${s.brew_id}`
    return {
      scanId: s.id,
      userId: s.viewer_user_id,
      brewId: s.brew_id,
      brewName: brewNameMap[s.brew_id] ?? 'Unbekannt',
      scanIntent: s.scan_intent,
      drinkingProbability: s.drinking_probability,
      scannedAt: s.created_at,
      proofType: (btbSet.has(ratingKey) ? 'btb' : 'rating') as 'btb' | 'rating',
    }
  })

  // ── Aggregate by intent ───────────────────────────────────────────────────
  const intentCounts: Record<string, number> = {}
  falseNegs.forEach((s: any) => {
    intentCounts[s.scan_intent] = (intentCounts[s.scan_intent] || 0) + 1
  })
  const byIntent = Object.entries(intentCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([intent, count]) => ({ intent, count }))

  return { total: falseNegs.length, byIntent, examples }
}

// ============================================================================
// PHASE E – Operations Overview helpers
// ============================================================================

/** Count brews + breweries awaiting moderation */
export async function getPendingModerationCount(): Promise<number> {
  const service = getServiceRoleClient()
  // Only count items that have actual images needing review
  // (brews without images are auto-approved; default label paths are not real submitted images)
  const [{ count: brewCount }, { count: breweryCount }] = await Promise.all([
    service
      .from('brews')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'pending')
      .not('image_url', 'is', null)
      .not('image_url', 'like', '/default%'),
    service
      .from('breweries')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'pending')
      .not('logo_url', 'is', null),
  ])
  return (brewCount ?? 0) + (breweryCount ?? 0)
}

/** Last N days of distinct active users (from analytics_events — same source as the KPI) */
export async function getDauTrend(days = 7): Promise<{ date: string; dau: number }[]> {
  const service = getServiceRoleClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data } = await service
    .from('analytics_events')
    .select('user_id, created_at')
    .gte('created_at', cutoff.toISOString())
    .not('user_id', 'is', null)

  // Count distinct users per calendar day
  const map: Record<string, Set<string>> = {}
  ;(data ?? []).forEach((r: any) => {
    const date: string = (r.created_at as string).split('T')[0]
    if (!map[date]) map[date] = new Set()
    if (r.user_id) map[date].add(r.user_id)
  })

  // Fill in all days (0 for missing)
  const result: { date: string; dau: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, dau: map[dateStr]?.size ?? 0 })
  }
  return result
}

/** Last N days of scan counts (from bottle_scans) */
export async function getScanTrend(days = 7): Promise<{ date: string; scans: number }[]> {
  const service = getServiceRoleClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data } = await service
    .from('bottle_scans')
    .select('created_at')
    .gte('created_at', cutoff.toISOString())

  const map: Record<string, number> = {}
  ;(data ?? []).forEach((r: any) => {
    const date = (r.created_at as string).split('T')[0]
    map[date] = (map[date] || 0) + 1
  })

  const result: { date: string; scans: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, scans: map[dateStr] ?? 0 })
  }
  return result
}

// ============================================================================
// PHASE 9.8.6 — Model Accuracy Metrics (Scan Intent Classification)
// ============================================================================

export interface ModelAccuracyMetrics {
  overall: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    totalFeedbacks: number;
  };
  perIntent: {
    intent: string;
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
    accuracy: number;
    precision: number | null;
    recall: number | null;
    feedbackCount: number;
    currentProbability: number;
    empiricalProbability: number;
    samplingRate: number;
    samplingMode: 'standard' | 'maintenance' | 're-learning';
  }[];
  calibrationCurve: {
    bin: number;
    predicted: number;
    actual: number;
    n: number;
  }[];
  drift: {
    date: string;
    accuracy: number;
    precision: number;
    recall: number;
  }[];
  alerts: {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    intent?: string;
    recommendation: string;
  }[];
}

// Default probabilities (mirror of analytics-actions.ts INTENT_PROBABILITIES)
const DEFAULT_PROBS: Record<string, number> = {
  browse: 0.15,
  collection_browse: 0.05,
  repeat: 0.85,
  event: 0.70,
  single: 0.50,
  social_discovery: 0.30,
  confirmed: 1.00,
};

// Base sampling rates per intent
const SAMPLING_RATES: Record<string, number> = {
  single: 0.20,
  social_discovery: 0.15,
  event: 0.10,
  repeat: 0.05,
  browse: 0,
  collection_browse: 0,
  confirmed: 0,
};

/**
 * Phase 9.8.6 — Comprehensive model accuracy metrics for admin dashboard.
 * Requires admin authentication.
 */
export async function getModelAccuracyMetrics(): Promise<ModelAccuracyMetrics | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Admin check
  const headersList = await headers()
  const isAdmin = headersList.get('x-is-admin') === '1'
  if (!isAdmin) {
    // Fallback: check profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if ((profile as any)?.role !== 'admin') return null
  }

  const service = getServiceRoleClient()

  // ── Fetch all feedbacks ───────────────────────────────────────────────
  const { data: feedbacks, error } = await (service as any)
    .from('scan_intent_feedback')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(5000)

  if (error || !feedbacks || feedbacks.length === 0) {
    return {
      overall: { accuracy: 0, precision: 0, recall: 0, f1Score: 0, totalFeedbacks: 0 },
      perIntent: [],
      calibrationCurve: [],
      drift: [],
      alerts: [{
        severity: 'info',
        message: 'Noch keine Feedback-Daten vorhanden',
        recommendation: 'Das System sammelt automatisch Feedback über den Drinker-Bestätigungs-Prompt.',
      }],
    }
  }

  // ── Overall metrics ───────────────────────────────────────────────────
  let tp = 0, tn = 0, fp = 0, fn = 0

  for (const f of feedbacks) {
    const predicted = (f.predicted_probability ?? 0.5) >= 0.5
    const actual = f.actual_drinking === true

    if (predicted && actual) tp++
    else if (predicted && !actual) fp++
    else if (!predicted && actual) fn++
    else tn++
  }

  const total = tp + tn + fp + fn
  const accuracy = total > 0 ? (tp + tn) / total : 0
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0
  const f1Score = (precision + recall) > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0

  // ── Per-intent breakdown ──────────────────────────────────────────────
  const intentMap = new Map<string, { tp: number; tn: number; fp: number; fn: number; count: number; actualDrinkers: number }>()

  for (const f of feedbacks) {
    const intent = f.predicted_intent ?? 'single'
    if (!intentMap.has(intent)) intentMap.set(intent, { tp: 0, tn: 0, fp: 0, fn: 0, count: 0, actualDrinkers: 0 })
    const entry = intentMap.get(intent)!
    entry.count++

    const predicted = (f.predicted_probability ?? 0.5) >= 0.5
    const actual = f.actual_drinking === true
    if (actual) entry.actualDrinkers++

    if (predicted && actual) entry.tp++
    else if (predicted && !actual) entry.fp++
    else if (!predicted && actual) entry.fn++
    else entry.tn++
  }

  const perIntent = Array.from(intentMap.entries()).map(([intent, m]) => {
    const iTotal = m.tp + m.tn + m.fp + m.fn
    const iPrecision = (m.tp + m.fp) > 0 ? m.tp / (m.tp + m.fp) : null
    const iRecall = (m.tp + m.fn) > 0 ? m.tp / (m.tp + m.fn) : null
    const iAccuracy = iTotal > 0 ? (m.tp + m.tn) / iTotal : 0
    const empirical = m.count > 0 ? m.actualDrinkers / m.count : 0

    // Sampling mode logic
    let samplingMode: 'standard' | 'maintenance' | 're-learning' = 'standard'
    if (m.count >= 200) samplingMode = 'maintenance'
    if (iAccuracy < 0.6 && m.count >= 50) samplingMode = 're-learning'

    return {
      intent,
      truePositives: m.tp,
      trueNegatives: m.tn,
      falsePositives: m.fp,
      falseNegatives: m.fn,
      accuracy: Math.round(iAccuracy * 1000) / 1000,
      precision: iPrecision !== null ? Math.round(iPrecision * 1000) / 1000 : null,
      recall: iRecall !== null ? Math.round(iRecall * 1000) / 1000 : null,
      feedbackCount: m.count,
      currentProbability: DEFAULT_PROBS[intent] ?? 0.5,
      empiricalProbability: Math.round(empirical * 1000) / 1000,
      samplingRate: SAMPLING_RATES[intent] ?? 0,
      samplingMode,
    }
  }).sort((a, b) => b.feedbackCount - a.feedbackCount)

  // ── Calibration Curve ─────────────────────────────────────────────────
  const bins = Array.from({ length: 10 }, (_, i) => ({
    bin: i / 10,
    sumPredicted: 0,
    actualDrinkers: 0,
    n: 0,
  }))

  for (const f of feedbacks) {
    const prob = f.predicted_probability ?? 0.5
    const binIndex = Math.min(Math.floor(prob * 10), 9)
    bins[binIndex].sumPredicted += prob
    bins[binIndex].n++
    if (f.actual_drinking === true) bins[binIndex].actualDrinkers++
  }

  const calibrationCurve = bins
    .filter(b => b.n > 0)
    .map(b => ({
      bin: b.bin,
      predicted: Math.round((b.sumPredicted / b.n) * 1000) / 1000,
      actual: Math.round((b.actualDrinkers / b.n) * 1000) / 1000,
      n: b.n,
    }))

  // ── Temporal Drift (7-day rolling window, last 90 days) ───────────────
  const drift: { date: string; accuracy: number; precision: number; recall: number }[] = []

  // Group feedbacks by date
  const byDate = new Map<string, typeof feedbacks>()
  for (const f of feedbacks) {
    const d = (f.created_at as string).split('T')[0]
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(f)
  }

  const sortedDates = Array.from(byDate.keys()).sort()
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const cutoffStr = ninetyDaysAgo.toISOString().split('T')[0]

  // Generate rolling 7-day windows
  const recentDates = sortedDates.filter(d => d >= cutoffStr)
  for (const date of recentDates) {
    const windowStart = new Date(date)
    windowStart.setDate(windowStart.getDate() - 6)
    const windowStartStr = windowStart.toISOString().split('T')[0]

    let wTp = 0, wTn = 0, wFp = 0, wFn = 0
    for (const [d, items] of byDate.entries()) {
      if (d >= windowStartStr && d <= date) {
        for (const f of items) {
          const predicted = (f.predicted_probability ?? 0.5) >= 0.5
          const actual = f.actual_drinking === true
          if (predicted && actual) wTp++
          else if (predicted && !actual) wFp++
          else if (!predicted && actual) wFn++
          else wTn++
        }
      }
    }

    const wTotal = wTp + wTn + wFp + wFn
    if (wTotal >= 5) { // Minimum window size
      drift.push({
        date,
        accuracy: Math.round(((wTp + wTn) / wTotal) * 1000) / 1000,
        precision: (wTp + wFp) > 0 ? Math.round((wTp / (wTp + wFp)) * 1000) / 1000 : 0,
        recall: (wTp + wFn) > 0 ? Math.round((wTp / (wTp + wFn)) * 1000) / 1000 : 0,
      })
    }
  }

  // ── Alerts ────────────────────────────────────────────────────────────
  const alerts: ModelAccuracyMetrics['alerts'] = []

  // Critical: overall accuracy < 70%
  if (accuracy < 0.70 && total >= 50) {
    alerts.push({
      severity: 'critical',
      message: `Gesamt-Accuracy bei ${(accuracy * 100).toFixed(1)}% — unter 70%-Schwelle`,
      recommendation: 'Klassifikationsregeln und Default-Probabilities überprüfen.',
    })
  }

  // Per-intent alerts
  for (const pi of perIntent) {
    if (pi.feedbackCount < 50) {
      alerts.push({
        severity: 'info',
        message: `'${pi.intent}' hat nur ${pi.feedbackCount} Feedbacks — nicht aussagekräftig`,
        intent: pi.intent,
        recommendation: pi.samplingRate > 0
          ? 'Sampling-Rate temporär erhöhen für mehr Daten.'
          : 'Hard-Exclude-Kategorie — kein Sampling vorgesehen.',
      })
      continue
    }

    if (pi.accuracy < 0.60) {
      alerts.push({
        severity: 'critical',
        message: `'${pi.intent}' Accuracy nur ${(pi.accuracy * 100).toFixed(1)}% (N=${pi.feedbackCount})`,
        intent: pi.intent,
        recommendation: `Default-Probability von ${pi.currentProbability} auf ${pi.empiricalProbability.toFixed(2)} anpassen.`,
      })
    } else if (pi.recall !== null && pi.recall < 0.50) {
      alerts.push({
        severity: 'warning',
        message: `'${pi.intent}' Recall nur ${(pi.recall * 100).toFixed(1)}% — viele echte Trinker werden übersehen`,
        intent: pi.intent,
        recommendation: `Default-Probability erhöhen (aktuell: ${pi.currentProbability}, empirisch: ${pi.empiricalProbability.toFixed(2)}).`,
      })
    } else if (pi.precision !== null && pi.precision < 0.50) {
      alerts.push({
        severity: 'warning',
        message: `'${pi.intent}' Precision nur ${(pi.precision * 100).toFixed(1)}% — viele falsche Positives`,
        intent: pi.intent,
        recommendation: 'Klassifikationsregel überprüfen — möglicherweise zu lockere Kriterien.',
      })
    }
  }

  // Drift alert
  if (drift.length >= 14) {
    const recent7 = drift.slice(-7)
    const older = drift.slice(-90, -7)
    const recentAvg = recent7.reduce((s, d) => s + d.accuracy, 0) / recent7.length
    const olderAvg = older.reduce((s, d) => s + d.accuracy, 0) / (older.length || 1)

    if (olderAvg - recentAvg > 0.10) {
      alerts.push({
        severity: 'critical',
        message: `Accuracy-Drift erkannt: 7-Tage-Schnitt (${(recentAvg * 100).toFixed(1)}%) liegt ${((olderAvg - recentAvg) * 100).toFixed(1)}pp unter dem Langzeitschnitt`,
        recommendation: 'Mögliche Ursache: Neue Features, verändertes Nutzerverhalten oder saisonale Effekte.',
      })
    }
  }

  // Cold start info
  if (total < 200) {
    alerts.push({
      severity: 'info',
      message: `Bootstrap-Modus: Erst ${total}/200 Feedbacks gesammelt`,
      recommendation: 'Cold-Start-Bonus aktiv — Sampling-Rate ist erhöht. Genauigkeitswerte erst ab 200 Feedbacks verlässlich.',
    })
  }

  // Healthy status
  if (alerts.length === 0) {
    alerts.push({
      severity: 'info',
      message: 'Modell ist gesund — alle Kategorien über 75% Accuracy',
      recommendation: 'Weiter beobachten. Nächste Überprüfung in 7 Tagen.',
    })
  }

  return {
    overall: {
      accuracy: Math.round(accuracy * 1000) / 1000,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1Score: Math.round(f1Score * 1000) / 1000,
      totalFeedbacks: total,
    },
    perIntent,
    calibrationCurve,
    drift,
    alerts,
  }
}

// ============================================================================
// Enterprise Codes — Admin CRUD
// ============================================================================

export async function getAdminEnterpriseCodes(): Promise<EnterpriseCode[]> {
  const service = getServiceRoleClient()
  const { data, error } = await service
    .from('enterprise_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Admin] getAdminEnterpriseCodes error:', error.message)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    code: row.code,
    createdAt: row.created_at,
    createdBy: row.created_by,
    currentUses: row.current_uses ?? 0,
    maxUses: row.max_uses,
    expiresAt: row.expires_at,
    isActive: row.is_active ?? true,
  }))
}

export async function createEnterpriseCode(params: {
  code: string
  maxUses: number | null
  expiresAt: string | null
}): Promise<{ success: boolean; error?: string }> {
  const service = getServiceRoleClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await service
    .from('enterprise_codes')
    .insert({
      code: params.code.trim().toUpperCase(),
      max_uses: params.maxUses,
      expires_at: params.expiresAt,
      is_active: true,
      current_uses: 0,
      created_by: user?.id ?? null,
    })

  if (error) {
    console.error('[Admin] createEnterpriseCode error:', error.message)
    return { success: false, error: error.message }
  }

  await logAdminAction('create_enterprise_code', params.code, { maxUses: params.maxUses, expiresAt: params.expiresAt })
  return { success: true }
}

export async function toggleEnterpriseCode(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const service = getServiceRoleClient()
  const { error } = await service
    .from('enterprise_codes')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    console.error('[Admin] toggleEnterpriseCode error:', error.message)
    return { success: false, error: error.message }
  }

  await logAdminAction(isActive ? 'activate_enterprise_code' : 'deactivate_enterprise_code', id, {})
  return { success: true }
}

export async function deleteEnterpriseCode(id: string): Promise<{ success: boolean; error?: string }> {
  const service = getServiceRoleClient()
  const { error } = await service
    .from('enterprise_codes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[Admin] deleteEnterpriseCode error:', error.message)
    return { success: false, error: error.message }
  }

  await logAdminAction('delete_enterprise_code', id, {})
  return { success: true }
}

// ============================================================================
// Admin Scan Geo-Events (scan_events + scan_event_members)
// ============================================================================

export async function getAdminScanEvents(limit = 50): Promise<AdminScanEvent[]> {
  const service = getServiceRoleClient()

  const { data: events, error } = await service
    .from('scan_events')
    .select('id, created_at, event_start, event_end, city, country_code, total_scans, unique_sessions, unique_brews, event_type, confidence, center_lat, center_lng, radius_m, breweries')
    .order('event_start', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Admin] getAdminScanEvents error:', error.message)
    return []
  }

  const eventIds = (events ?? []).map((e: any) => e.id)
  let memberCounts: Record<string, number> = {}

  if (eventIds.length > 0) {
    const { data: members } = await service
      .from('scan_event_members')
      .select('event_id')
      .in('event_id', eventIds)

    for (const m of members ?? []) {
      memberCounts[m.event_id] = (memberCounts[m.event_id] || 0) + 1
    }
  }

  return (events ?? []).map((e: any) => ({
    id: e.id,
    createdAt: e.created_at,
    eventStart: e.event_start,
    eventEnd: e.event_end,
    city: e.city,
    countryCode: e.country_code,
    totalScans: e.total_scans ?? 0,
    uniqueSessions: e.unique_sessions ?? 0,
    uniqueBrews: e.unique_brews ?? null,
    eventType: e.event_type || 'unknown',
    confidence: e.confidence ?? 0.5,
    centerLat: e.center_lat ?? null,
    centerLng: e.center_lng ?? null,
    radiusM: e.radius_m,
    breweries: e.breweries ?? [],
    memberCount: memberCounts[e.id] ?? 0,
  }))
}

// ============================================================================
// Nonce Stats — Anti-Replay Monitoring
// ============================================================================

export async function getNonceStats(): Promise<NonceStats> {
  const service = getServiceRoleClient()
  const now = new Date()
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // All three nonce tables use `used_at` as their timestamp column
  async function countTable(table: 'btb_used_nonces' | 'vibe_check_used_nonces' | 'rating_used_nonces') {
    const [total, last24h, last7d] = await Promise.all([
      service.from(table).select('*', { count: 'exact', head: true }),
      service.from(table).select('*', { count: 'exact', head: true }).gte('used_at', cutoff24h),
      service.from(table).select('*', { count: 'exact', head: true }).gte('used_at', cutoff7d),
    ])
    return {
      total: (total.count as number) ?? 0,
      last24h: (last24h.count as number) ?? 0,
      last7d: (last7d.count as number) ?? 0,
    }
  }

  const [btb, vibeCheck, rating] = await Promise.all([
    countTable('btb_used_nonces'),
    countTable('vibe_check_used_nonces'),
    countTable('rating_used_nonces'),
  ])

  return { btb, vibeCheck, rating }
}

// ============================================================================
// Database Health (via get_db_health_stats RPC)
// ============================================================================
export async function getDbHealthStats(): Promise<DbHealthStats> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase.rpc('get_db_health_stats')
  if (error) throw error

  // RPC returns a jsonb object; Supabase JS returns it as a plain JS object
  const raw = data as Record<string, unknown>

  return {
    dbSizeBytes:       Number(raw.db_size_bytes   ?? 0),
    dbSizePretty:      String(raw.db_size_pretty  ?? '–'),
    activeConnections: Number(raw.active_connections ?? 0),
    idleConnections:   Number(raw.idle_connections   ?? 0),
    totalConnections:  Number(raw.total_connections  ?? 0),
    tableCount:        Number(raw.table_count        ?? 0),
    cacheHitRatio:     raw.cache_hit_ratio != null ? Number(raw.cache_hit_ratio) : null,
    biggestTables: ((raw.biggest_tables as Array<Record<string, unknown>>) ?? []).map(t => ({
      name:           String(t.name           ?? ''),
      totalSize:      String(t.total_size     ?? ''),
      totalSizeBytes: Number(t.total_size_bytes ?? 0),
    })),
  }
}

// ── CIS Recent Scans with Scoring Breakdown ───────────────────────────────
export async function getRecentCisScans(): Promise<CisRecentScan[]> {
  const supabase = getServiceRoleClient()

  // Phase 0 columns only — always available
  const { data: scans, error } = await (supabase as any)
    .from('bottle_scans')
    .select(`
      id, created_at, scan_source, scan_intent, drinking_probability,
      weather_temp_c, country_code,
      brew_id
    `)
    .not('scan_intent', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !scans) return []

  const cfg = await getAlgorithmSettings().catch(() => null);

  // Best-effort: load Phase 1 columns if migration is applied
  const phase1Map = new Map<string, { local_time: string | null; brew_name: string | null; typical_scan_hour: number | null; typical_temperature: number | null }>();
  try {
    const scanIds = scans.map((s: any) => s.id);
    
    // First, reliably get the brew names (which definitely exist)
    const { data: p0 } = await (supabase as any)
      .from('bottle_scans')
      .select('id, local_time, brews(name)')
      .in('id', scanIds);
      
    if (p0) {
      for (const row of p0) {
        phase1Map.set(row.id, {
          local_time: row.local_time ?? null,
          brew_name: row.brews?.name ?? null,
          typical_scan_hour: null,
          typical_temperature: null,
        });
      }
    }

    // Then attempt to get Phase 1 columns if migrated
    const { data: p1, error: p1Err } = await (supabase as any)
      .from('bottle_scans')
      .select('id, brews ( typical_scan_hour, typical_temperature )')
      .in('id', scanIds);
      
    if (!p1Err && p1) {
      for (const row of p1) {
        const existing = phase1Map.get(row.id);
        if (existing) {
          existing.typical_scan_hour = row.brews?.typical_scan_hour ?? null;
          existing.typical_temperature = row.brews?.typical_temperature ?? null;
        }
      }
    } else if (p1Err) {
      // It is expected to fail if the migration haven't added these to 'brews' yet
      console.warn('DEBUG: Phase 1 brews columns not yet migrated.');
    }
  } catch { /* Suppress */ }

  // Batch lookup tasting_score_events linked to these scans
  const scanEventMap = new Map<string, { event_type: string; plausibility_score: number }[]>()
  try {
    const scanIds = scans.map((s: any) => s.id)
    const { data: tse } = await (supabase as any)
      .from('tasting_score_events')
      .select('bottle_scan_id, event_type, plausibility_score')
      .in('bottle_scan_id', scanIds)
      .in('event_type', ['vibe_check', 'rating_given', 'beat_the_brewer'])
    if (tse) {
      for (const row of tse) {
        if (!row.bottle_scan_id) continue
        let existing = scanEventMap.get(row.bottle_scan_id)
        if (!existing) {
          existing = []
          scanEventMap.set(row.bottle_scan_id, existing)
        }
        existing.push({
          event_type: row.event_type,
          plausibility_score: row.plausibility_score ?? 1.0
        })
      }
    }
  } catch { /* tasting_score_events lookup failed */ }

  const results: CisRecentScan[] = []

  for (const scan of scans) {
    const isHardZero = scan.scan_source !== 'qr_code'

    let breakdown: CisScoringBreakdown
    if (isHardZero) {
      breakdown = {
        isHardZero: true,
        base: 0, fridgeSurf: 0, lastInSession: 0, dwellTime: 0,
        dynamicTime: 0, dynamicTemp: 0, weekendHoliday: 0,
        userRatingBonus: 0, btbBonus: 0, vibecheckBonus: 0,
        plausibilityScore: null,
        total: 0,
        scanLocalHour: null, typicalScanHour: null, hourDiff: null,
        scanTempC: null, typicalTempC: null, tempDiff: null,
        isWeekend: false, isHoliday: false, isFridayEvening: false,
      }
    } else {
      const base = cfg?.cis_base_score ?? 0.30
      const p1 = phase1Map.get(scan.id)

      // Sessions modifier — derived from scan_intent (the stored result of session scoring)
      const fridgeSurf      = scan.scan_intent === 'fridge_surf' ? (cfg?.cis_fridge_surfing_penalty ?? -0.40) : 0
      const lastInSession   = scan.scan_intent !== 'fridge_surf' ? (cfg?.cis_last_in_session_bonus ?? 0.20) : 0

      // Dwell time bonus
      const dwellThresh = cfg?.cis_dwell_time_threshold_s ?? 180
      const dwellTime = (scan.dwell_seconds != null && scan.dwell_seconds >= dwellThresh) ? (cfg?.cis_dwell_time_bonus ?? 0.40) : 0

      // Dynamic time modifier
      const typicalScanHour: number | null = p1?.typical_scan_hour ?? null
      const localTime: string | null = p1?.local_time ?? null
      let scanLocalHour: number | null = null
      let hourDiff: number | null = null
      let dynamicTime = 0
      
      const localTimeForMath = localTime ? new Date(localTime) : new Date(scan.created_at);
      
      if (typicalScanHour !== null) {
        scanLocalHour = localTimeForMath.getHours()
        let diff = Math.abs(scanLocalHour - typicalScanHour)
        if (diff > 12) diff = 24 - diff
        hourDiff = diff
        if (diff <= 2) dynamicTime = (cfg?.cis_dynamic_time_bonus ?? 0.15)
        else if (diff > 5) dynamicTime = (cfg?.cis_dynamic_time_penalty ?? -0.15)
      }

      // Dynamic temperature modifier
      const typicalTempC: number | null = p1?.typical_temperature ?? null
      const scanTempC: number | null = scan.weather_temp_c ?? null
      let tempDiff: number | null = null
      let dynamicTemp = 0
      if (typicalTempC !== null && scanTempC !== null) {
        tempDiff = Math.abs(scanTempC - typicalTempC)
        if (tempDiff <= 5) dynamicTemp = (cfg?.cis_dynamic_temp_bonus ?? 0.05)
        else if (tempDiff > 12) dynamicTemp = (cfg?.cis_dynamic_temp_penalty ?? -0.05)
      }

      // Weekend / holiday modifier
      let isWeekend = false
      let isHoliday = false
      let isFridayEvening = false
      let weekendHoliday = 0

      const evs = scanEventMap.get(scan.id)
      const getPlausibility = (type: string) => {
        if (!evs) return null;
        const matching = evs.filter(e => e.event_type === type);
        if (matching.length === 0) return null;
        return Math.max(...matching.map(e => e.plausibility_score));
      };

      const ratingPlausibility = getPlausibility('rating_given');
      const btbPlausibility = getPlausibility('beat_the_brewer');
      const vibePlausibility = getPlausibility('vibe_check');

      const maxPlausibility = Math.max(
        ratingPlausibility ?? -1,
        btbPlausibility ?? -1,
        vibePlausibility ?? -1
      );
      const activePlausibility = maxPlausibility >= 0 ? maxPlausibility : null;

      const userRatingBonus = ratingPlausibility !== null ? ((cfg?.cis_rating_bonus ?? 0.80) * ratingPlausibility) : 0
      const btbBonus = btbPlausibility !== null ? ((cfg?.cis_btb_bonus ?? 0.80) * btbPlausibility) : 0
      const vibecheckBonus = vibePlausibility !== null ? ((cfg?.cis_vibecheck_bonus ?? 0.30) * vibePlausibility) : 0

      try {
        const { default: Holidays } = await import('date-holidays')
        const countryCode = (scan.country_code as string | null) || 'DE'
        const hd = new Holidays(countryCode)
        const dow  = localTimeForMath.getDay()
        const hour = localTimeForMath.getHours()
        isFridayEvening = dow === 5 && hour >= 17
        isWeekend = dow === 0 || dow === 6
        isHoliday = hd.isHoliday(localTimeForMath) !== false
        if (isFridayEvening || isWeekend || isHoliday) weekendHoliday = (cfg?.cis_weekend_holiday_bonus ?? 0.05)
      } catch { /* ignore */ }

      const rawTotal = base + fridgeSurf + lastInSession + dwellTime + dynamicTime + dynamicTemp + weekendHoliday + userRatingBonus + btbBonus + vibecheckBonus
      const total = Math.max(0.0, Math.min(1.0, rawTotal))

      breakdown = {
        isHardZero: false,
        base, fridgeSurf, lastInSession, dwellTime,
        dynamicTime, dynamicTemp, weekendHoliday,
        userRatingBonus, btbBonus, vibecheckBonus,
        plausibilityScore: activePlausibility,
        total,
        scanLocalHour, typicalScanHour, hourDiff,
        scanTempC, typicalTempC, tempDiff,
        isWeekend, isHoliday, isFridayEvening,
      }
    }

    results.push({
      id: scan.id,
      createdAt: scan.created_at,
      brewName: phase1Map.get(scan.id)?.brew_name ?? null,
      brewId: scan.brew_id ?? null,
      scanSource: scan.scan_source,
      scanIntent: scan.scan_intent,
      drinkingProbability: scan.drinking_probability,
      breakdown,
    })
  }

  return results
}
