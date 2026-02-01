'use server'

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

// ============================================================================
// Audit Logging Helper
// ============================================================================

async function logAdminAction(
  action: string,
  resourceId?: string | null,
  details?: Record<string, any>
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    await supabase.from('analytics_admin_audit_logs').insert({
      admin_id: user.id,
      action,
      resource_id: resourceId,
      details,
      ip_address: null, // TODO: Get from request headers if needed
      user_agent: null, // TODO: Get from request headers if needed
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
    
    await logAdminAction('view_dashboard_summary')

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

  await logAdminAction('view_user_daily_activity', null, { dateRange })

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

  await logAdminAction('view_user_growth', null, { dateRange })
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

  await logAdminAction('view_cohort_analysis')

  const { data, error } = await supabase
    .from('analytics_cohorts')
    .select('*')
    .order('cohort_id', { ascending: false })
    .limit(12) // Last 12 months

  if (error) throw error
  return data as Cohort[]
}

export async function getUserTierDistribution() {
  // Use Service Role to see all users regardless of RLS
  const supabase = getServiceRoleClient()

  await logAdminAction('view_tier_distribution')

  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier')

  if (error) {
    console.error('Error fetching profiles for tier distribution:', error)
    throw error
  }

  // Debug logging
  console.log('Tier Distribution Analysis:', {
    totalProfiles: data.length,
    rawTiers: data.map(p => p.subscription_tier)
  })

  const distribution = {
    free: 0,
    brewer: 0,
    brewery: 0,
    enterprise: 0,
  }

  data.forEach((profile) => {
    // Normalize: trim whitespace and convert to lowercase
    const tier = profile.subscription_tier ? profile.subscription_tier.toString().trim().toLowerCase() : 'free'
    
    if (tier in distribution) {
      distribution[tier as keyof typeof distribution]++
    } else {
      // @ts-ignore
      console.warn(`Unknown tier found: "${tier}" (Raw: "${profile.tier}") - counting as free`)
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

  await logAdminAction('view_brewery_stats', null, { dateRange })

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

  await logAdminAction('view_brewery_growth')

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

  await logAdminAction('view_content_stats', null, { dateRange })

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

  await logAdminAction('view_top_brews', null, { limit })

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
  const supabase = await createClient()

  await logAdminAction('view_rating_distribution')

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
  const supabase = await createClient()
  
  // Convert dateRange to hours
  let hours = 24
  if (dateRange === '24h') hours = 24
  else if (dateRange === '7d') hours = 7 * 24
  else if (dateRange === '30d') hours = 30 * 24
  else if (dateRange === '90d') hours = 90 * 24
  
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - hours)

  await logAdminAction('view_system_health', null, { dateRange })

  const { data, error } = await supabase
    .from('analytics_system_hourly')
    .select('*')
    .gte('timestamp', cutoffTime.toISOString())
    .order('timestamp', { ascending: false })

  if (error) throw error
  return data as SystemHourly[]
}

export async function getRecentErrors(limit: number = 50) {
  const supabase = await createClient()

  await logAdminAction('view_errors', null, { limit })

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

  await logAdminAction('view_feature_usage', null, { dateRange })

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

  await logAdminAction('view_feature_usage_stats', null, { dateRange })

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/aggregate-analytics`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ mode, date }),
    }
  )

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(
      `Aggregation failed: ${response.status} ${response.statusText} - ${bodyText}`
    )
  }

  return await response.json()
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
// Audit Logs (for transparency)
// ============================================================================

export async function getAdminAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('analytics_admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as AdminAuditLog[]
}
