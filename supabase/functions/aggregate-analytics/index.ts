import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AggregateRequest {
  mode: 'daily' | 'hourly' | 'cohorts' | 'features'
  date?: string // Optional: specific date to aggregate (YYYY-MM-DD)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore - Deno.env is available in Deno runtime
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore - Deno.env is available in Deno runtime
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { mode, date }: AggregateRequest = await req.json()

    let result: any

    switch (mode) {
      case 'daily':
        result = await aggregateDailyMetrics(supabaseClient, date)
        break
      case 'hourly':
        result = await aggregateHourlyMetrics(supabaseClient)
        break
      case 'cohorts':
        result = await calculateCohorts(supabaseClient)
        break
      case 'features':
        result = await aggregateFeatureUsage(supabaseClient, date)
        break
      default:
        throw new Error(`Unknown mode: ${mode}`)
    }

    return new Response(
      JSON.stringify({ success: true, mode, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Aggregation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// ============================================================================
// Daily Metrics Aggregation
// ============================================================================
async function aggregateDailyMetrics(supabase: any, specificDate?: string) {
  const yesterday = specificDate ? new Date(specificDate) : new Date()
  if (!specificDate) {
    yesterday.setDate(yesterday.getDate() - 1)
  }
  const dateStr = yesterday.toISOString().split('T')[0]

  console.log(`Aggregating daily metrics for ${dateStr}`)

  // ========== 1. User Activity ==========
  const { data: userEvents } = await supabase
    .from('analytics_events')
    .select('user_id, event_type, category, created_at')
    .gte('created_at', `${dateStr}T00:00:00.000`)
    .lt('created_at', `${dateStr}T23:59:59.999`)

  const userActivityMap = new Map()

  userEvents?.forEach((event: any) => {
    if (!event.user_id) return

    if (!userActivityMap.has(event.user_id)) {
      userActivityMap.set(event.user_id, {
        events_count: 0,
        features_used: new Set(),
        last_event_at: event.created_at
      })
    }

    const userData = userActivityMap.get(event.user_id)
    userData.events_count++
    if (event.category) {
      userData.features_used.add(event.category)
    }
    if (new Date(event.created_at) > new Date(userData.last_event_at)) {
      userData.last_event_at = event.created_at
    }
  })

  // Insert/Update user daily data
  let userInsertCount = 0
  for (const [userId, data] of userActivityMap.entries()) {
    const { error } = await supabase.from('analytics_user_daily').upsert({
      user_id: userId,
      date: dateStr,
      events_count: data.events_count,
      features_used: Array.from(data.features_used),
      last_event_at: data.last_event_at,
      session_duration_seconds: 0 // TODO: Calculate from session data
    })
    if (!error) userInsertCount++
  }

  console.log(`User daily: Processed ${userInsertCount} users`)

  // ========== 2. Brewery Activity ==========
  const { data: breweries } = await supabase.from('breweries').select('id')

  let breweryInsertCount = 0
  for (const brewery of breweries || []) {
    // Get member count
    const { count: membersCount } = await supabase
      .from('brewery_members')
      .select('id', { count: 'exact', head: true })
      .eq('brewery_id', brewery.id)

    // Get brews count
    const { count: brewsCount } = await supabase
      .from('brews')
      .select('id', { count: 'exact', head: true })
      .eq('brewery_id', brewery.id)
      .lte('created_at', `${dateStr}T23:59:59.999`)

    // Get sessions count
    const { count: sessionsCount } = await supabase
      .from('brewing_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('brewery_id', brewery.id)
      .lte('created_at', `${dateStr}T23:59:59.999`)

    // Get bottles scanned today
    const { count: bottlesScanned } = await supabase
      .from('bottle_scans')
      .select('id', { count: 'exact', head: true })
      .eq('brewery_id', brewery.id)
      .gte('created_at', `${dateStr}T00:00:00.000`)
      .lt('created_at', `${dateStr}T23:59:59.999`)

    // Active members (members with events today)
    const { data: activeMembers } = await supabase
      .from('analytics_events')
      .select('user_id')
      .in('user_id', []) // TODO: Get member user_ids first
      .gte('created_at', `${dateStr}T00:00:00.000`)
      .lt('created_at', `${dateStr}T23:59:59.999`)

    const { error } = await supabase.from('analytics_brewery_daily').upsert({
      brewery_id: brewery.id,
      date: dateStr,
      members_count: membersCount || 0,
      brews_count: brewsCount || 0,
      sessions_count: sessionsCount || 0,
      bottles_scanned: bottlesScanned || 0,
      ratings_received: 0, // TODO: Implement
      active_members: new Set(activeMembers?.map((m: { user_id: string }) => m.user_id) || []).size
    })
    if (!error) breweryInsertCount++
  }

  console.log(`Brewery daily: Processed ${breweryInsertCount} breweries`)

  // ========== 3. Content Metrics ==========
  const { count: totalBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: publicBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('visibility', 'public')
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: privateBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('visibility', 'private')
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: teamBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('visibility', 'team')
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: totalSessions } = await supabase
    .from('brewing_sessions')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: totalBottles } = await supabase
    .from('bottles')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { data: ratings } = await supabase
    .from('ratings')
    .select('rating')
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const avgRating =
    ratings?.length > 0
      ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
      : 0

  const { count: brewsCreatedToday } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${dateStr}T00:00:00.000`)
    .lt('created_at', `${dateStr}T23:59:59.999`)

  const { count: sessionsCreatedToday } = await supabase
    .from('brewing_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${dateStr}T00:00:00.000`)
    .lt('created_at', `${dateStr}T23:59:59.999`)

  await supabase.from('analytics_content_daily').upsert({
    date: dateStr,
    total_brews: totalBrews || 0,
    total_sessions: totalSessions || 0,
    total_bottles: totalBottles || 0,
    total_ratings: ratings?.length || 0,
    public_brews: publicBrews || 0,
    private_brews: privateBrews || 0,
    team_brews: teamBrews || 0,
    avg_rating: Math.round(avgRating * 100) / 100,
    brews_created_today: brewsCreatedToday || 0,
    sessions_created_today: sessionsCreatedToday || 0,
  })

  console.log(`Content daily: Updated for ${dateStr}`)

  return {
    date: dateStr,
    usersProcessed: userInsertCount,
    breweriesProcessed: breweryInsertCount,
    contentUpdated: true,
  }
}

// ============================================================================
// Hourly Metrics Aggregation
// ============================================================================
async function aggregateHourlyMetrics(supabase: any) {
  const now = new Date()
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
  const dateStr = lastHour.toISOString().split('T')[0]
  const hour = lastHour.getHours()

  console.log(`Aggregating hourly metrics for ${dateStr} ${hour}:00`)

  // Error count
  const { count: errorCount } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'error')
    .gte('created_at', lastHour.toISOString())
    .lt('created_at', now.toISOString())

  // Active users (unique users with events in this hour)
  const { data: activeUsers } = await supabase
    .from('analytics_events')
    .select('user_id')
    .gte('created_at', lastHour.toISOString())
    .lt('created_at', now.toISOString())

  const uniqueUsers = new Set(
    activeUsers?.map((e: { user_id: string | null }) => e.user_id).filter(Boolean)
  ).size

  // API calls (all events)
  const { count: apiCalls } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', lastHour.toISOString())
    .lt('created_at', now.toISOString())

  await supabase.from('analytics_system_hourly').upsert({
    timestamp: lastHour.toISOString(),
    hour,
    date: dateStr,
    error_count: errorCount || 0,
    active_users_count: uniqueUsers,
    api_calls_count: apiCalls || 0,
    avg_response_time_ms: 0, // TODO: Implement if we track response times
    unique_sessions: 0, // TODO: Implement
  })

  console.log(
    `Hourly: ${dateStr} ${hour}:00 - Errors: ${errorCount}, Users: ${uniqueUsers}, Calls: ${apiCalls}`
  )

  return { date: dateStr, hour, errorCount, uniqueUsers, apiCalls }
}

// ============================================================================
// Cohort Analysis
// ============================================================================
async function calculateCohorts(supabase: any) {
  console.log('Calculating cohorts...')

  // Get all users grouped by signup month (use `joined_at` as signup timestamp)
  const { data: users } = await supabase
    .from('profiles')
    .select('id, joined_at')

  const cohortMap = new Map()

  users?.forEach((user: any) => {
    const signupDate = new Date(user.joined_at)
    const cohortId = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, '0')}`

    if (!cohortMap.has(cohortId)) {
      cohortMap.set(cohortId, {
        cohortDate: new Date(signupDate.getFullYear(), signupDate.getMonth(), 1),
        users: []
      })
    }
    cohortMap.get(cohortId).users.push(user)
  })

  let processedCohorts = 0

  // Calculate retention for each cohort
  for (const [cohortId, cohortData] of cohortMap.entries()) {
    const userIds = cohortData.users.map((u: any) => u.id)
    const cohortDate = cohortData.cohortDate

    // Day 1 retention (active within 24h after signup)
    const day1End = new Date(cohortDate)
    day1End.setDate(day1End.getDate() + 2)

    const { data: day1Active } = await supabase
      .from('analytics_events')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', cohortDate.toISOString())
      .lt('created_at', day1End.toISOString())

    const day1Count = new Set(day1Active?.map((e: { user_id: string }) => e.user_id) || []).size

    // Day 7 retention
    const day7Start = new Date(cohortDate)
    day7Start.setDate(day7Start.getDate() + 7)
    const day7End = new Date(day7Start)
    day7End.setDate(day7End.getDate() + 1)

    const { data: day7Active } = await supabase
      .from('analytics_events')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', day7Start.toISOString())
      .lt('created_at', day7End.toISOString())

    const day7Count = new Set(day7Active?.map((e: { user_id: string }) => e.user_id) || []).size

    // Day 30 retention
    const day30Start = new Date(cohortDate)
    day30Start.setDate(day30Start.getDate() + 30)
    const day30End = new Date(day30Start)
    day30End.setDate(day30End.getDate() + 1)

    const { data: day30Active } = await supabase
      .from('analytics_events')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', day30Start.toISOString())
      .lt('created_at', day30End.toISOString())

    const day30Count = new Set(day30Active?.map((e: { user_id: string }) => e.user_id) || []).size

    // Day 90 retention
    const day90Start = new Date(cohortDate)
    day90Start.setDate(day90Start.getDate() + 90)
    const day90End = new Date(day90Start)
    day90End.setDate(day90End.getDate() + 1)

    const { data: day90Active } = await supabase
      .from('analytics_events')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', day90Start.toISOString())
      .lt('created_at', day90End.toISOString())

    const day90Count = new Set(day90Active?.map((e: { user_id: string }) => e.user_id) || []).size

    // Avg events per user
    const { data: cohortEvents } = await supabase
      .from('analytics_events')
      .select('user_id')
      .in('user_id', userIds)

    const avgEventsPerUser = (cohortEvents?.length || 0) / userIds.length

    // Avg brews per user
    const { data: cohortBrews } = await supabase
      .from('brews')
      .select('owner_id')
      .in('owner_id', userIds)

    const avgBrewsPerUser = (cohortBrews?.length || 0) / userIds.length

    // Paid conversion rate (users with non-free tier)
    const { data: paidUsers } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds)
      .neq('tier', 'free')

    const paidConversionRate = ((paidUsers?.length || 0) / userIds.length) * 100

    await supabase.from('analytics_cohorts').upsert({
      cohort_id: cohortId,
      user_count: userIds.length,
      retention_day1: (day1Count / userIds.length) * 100,
      retention_day7: (day7Count / userIds.length) * 100,
      retention_day30: (day30Count / userIds.length) * 100,
      retention_day90: (day90Count / userIds.length) * 100,
      avg_events_per_user: Math.round(avgEventsPerUser * 100) / 100,
      avg_brews_per_user: Math.round(avgBrewsPerUser * 100) / 100,
      paid_conversion_rate: Math.round(paidConversionRate * 100) / 100,
      avg_ltv: 0, // TODO: Implement when Stripe is integrated
      updated_at: new Date().toISOString()
    })

    processedCohorts++
    console.log(`Cohort ${cohortId}: ${userIds.length} users, Day1: ${day1Count}, Day7: ${day7Count}, Day30: ${day30Count}`)
  }

  return { processedCohorts }
}

// ============================================================================
// Feature Usage Aggregation
// ============================================================================
async function aggregateFeatureUsage(supabase: any, specificDate?: string) {
  const yesterday = specificDate ? new Date(specificDate) : new Date()
  if (!specificDate) {
    yesterday.setDate(yesterday.getDate() - 1)
  }
  const dateStr = yesterday.toISOString().split('T')[0]

  console.log(`Aggregating feature usage for ${dateStr}`)

  const { data: events } = await supabase
    .from('analytics_events')
    .select('category, event_type, user_id')
    .gte('created_at', `${dateStr}T00:00:00.000`)
    .lt('created_at', `${dateStr}T23:59:59.999`)

  const featureMap = new Map()

  events?.forEach((event: any) => {
    const feature = event.category
    if (!feature) return

    if (!featureMap.has(feature)) {
      featureMap.set(feature, {
        usage_count: 0,
        unique_users: new Set(),
        success_count: 0,
        error_count: 0
      })
    }

    const featureData = featureMap.get(feature)
    featureData.usage_count++
    if (event.user_id) featureData.unique_users.add(event.user_id)
    if (event.event_type.includes('success')) featureData.success_count++
    if (event.event_type.includes('error')) featureData.error_count++
  })

  let insertCount = 0
  for (const [feature, data] of featureMap.entries()) {
    const { error } = await supabase.from('analytics_feature_usage').upsert({
      feature,
      date: dateStr,
      usage_count: data.usage_count,
      unique_users: data.unique_users.size,
      success_count: data.success_count,
      error_count: data.error_count,
      avg_duration_seconds: 0 // TODO: Implement if we track durations
    })
    if (!error) insertCount++
  }

  console.log(`Feature usage: Processed ${insertCount} features`)

  return { date: dateStr, features: insertCount }
}
