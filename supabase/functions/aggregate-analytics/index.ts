// @ts-nocheck
// Deno Edge Function — URL imports are intentional and valid in Deno runtime.
// This file is excluded from the Next.js tsconfig but VS Code may still flag
// URL imports when the file is open. @ts-nocheck suppresses those false positives.
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

  // ========== 1. User Activity (Pagination) ==========
  const userActivityMap = new Map()
  let hasMoreUsers = true
  let uPage = 0
  const uPageSize = 1000

  while (hasMoreUsers) {
      const { data: userEvents, error } = await supabase
        .from('analytics_events')
        .select('user_id, event_type, category, created_at')
        .gte('created_at', `${dateStr}T00:00:00.000`)
        .lt('created_at', `${dateStr}T23:59:59.999`)
        .range(uPage * uPageSize, (uPage + 1) * uPageSize - 1)
      
      if (error || !userEvents || userEvents.length === 0) {
          hasMoreUsers = false
          break
      }
      if (userEvents.length < uPageSize) hasMoreUsers = false

      userEvents.forEach((event: any) => {
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
      uPage++
  }

  // D.1: Pre-compute session durations per brewery for this date
  // Fetch brewery memberships here (used by D.1; also fetched again in section 2 for allMembers ref)
  const { data: membersForD1 } = await supabase
    .from('brewery_members')
    .select('brewery_id, user_id')

  const userBreweriesMap = new Map<string, string[]>() // user_id → brewery_id[]
  membersForD1?.forEach((m: any) => {
    if (!userBreweriesMap.has(m.user_id)) userBreweriesMap.set(m.user_id, [])
    userBreweriesMap.get(m.user_id)!.push(m.brewery_id)
  })

  const { data: completedSessions } = await supabase
    .from('brewing_sessions')
    .select('brewery_id, started_at, completed_at')
    .gte('started_at', `${dateStr}T00:00:00.000`)
    .lt('started_at', `${dateStr}T23:59:59.999`)
    .not('started_at', 'is', null)
    .not('completed_at', 'is', null)

  const sessionDurationByBrewery = new Map<string, number>() // brewery_id → total seconds
  completedSessions?.forEach((s: any) => {
    const duration = Math.round(
      (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000
    )
    if (duration > 0 && s.brewery_id) {
      sessionDurationByBrewery.set(
        s.brewery_id,
        (sessionDurationByBrewery.get(s.brewery_id) || 0) + duration
      )
    }
  })

  // Insert/Update user daily data
  let userInsertCount = 0
  for (const [userId, data] of userActivityMap.entries()) {
    // D.1: Sum session durations from all breweries where user is a member
    const userBreweries = userBreweriesMap.get(userId) || []
    const sessionDuration = userBreweries.reduce(
      (sum, bId) => sum + (sessionDurationByBrewery.get(bId) || 0),
      0
    )

    const { error } = await supabase.from('analytics_user_daily').upsert({
      user_id: userId,
      date: dateStr,
      events_count: data.events_count,
      features_used: Array.from(data.features_used),
      last_event_at: data.last_event_at,
      session_duration_seconds: sessionDuration,
    })
    if (!error) userInsertCount++
  }

  console.log(`User daily: Processed ${userInsertCount} users`)

  // ========== 2. Brewery Activity (Bulk Optimized) ==========
  
  // A. Pre-fetch Today's Data
  // Bottle Scans
  const { data: dailyScans } = await supabase
    .from('bottle_scans')
    .select('brewery_id, brew_id')
    .gte('created_at', `${dateStr}T00:00:00.000`)
    .lt('created_at', `${dateStr}T23:59:59.999`)
  
  // Resolve missing brewery_ids from brew_ids
  const scansWithoutBrewery = dailyScans?.filter((s: any) => !s.brewery_id && s.brew_id) || []
  const brewIdsToResolve = [...new Set(scansWithoutBrewery.map((s: any) => s.brew_id))]
  
  let resolvedBrewMap = new Map() // brew_id -> brewery_id

  if (brewIdsToResolve.length > 0) {
      const { data: resolvedBrews } = await supabase
        .from('brews')
        .select('id, brewery_id')
        .in('id', brewIdsToResolve)
      
      resolvedBrews?.forEach((b: any) => {
          if(b.brewery_id) resolvedBrewMap.set(b.id, b.brewery_id)
      })
  }

  const scansMap: Record<string, number> = {}
  dailyScans?.forEach((s: any) => {
      let bId = s.brewery_id
      if (!bId && s.brew_id) {
          bId = resolvedBrewMap.get(s.brew_id)
      }

      if(bId) scansMap[bId] = (scansMap[bId] || 0) + 1
  })

  // Ratings (requires Brew lookup)
  const { data: dailyRatings } = await supabase
    .from('ratings')
    .select('brew_id')
    .gte('created_at', `${dateStr}T00:00:00.000`)
    .lt('created_at', `${dateStr}T23:59:59.999`)
  
  const ratingsMap: Record<string, number> = {} // brewery_id -> count
  if (dailyRatings && dailyRatings.length > 0) {
      const brewIds = [...new Set(dailyRatings.map((r: any) => r.brew_id))]
      // Fetch breweries for these brews
      const { data: brewOwners } = await supabase
        .from('brews')
        .select('id, brewery_id')
        .in('id', brewIds)
      
      const brewOwnerMap = new Map() // brew_id -> brewery_id
      brewOwners?.forEach((b: any) => brewOwnerMap.set(b.id, b.brewery_id))

      dailyRatings.forEach((r: any) => {
          const bId = brewOwnerMap.get(r.brew_id)
          if(bId) ratingsMap[bId] = (ratingsMap[bId] || 0) + 1
      })
  }

  // Memberships (Fetch ALL - assuming manageable size, otherwise paginate)
  // Used for "Active Members" calculation
  const { data: allMembers } = await supabase
    .from('brewery_members')
    .select('brewery_id, user_id')
  
  const breweryMembersMap = new Map() // brewery_id -> Set<user_id>
  allMembers?.forEach((m: any) => {
      if(!breweryMembersMap.has(m.brewery_id)) breweryMembersMap.set(m.brewery_id, new Set())
      breweryMembersMap.get(m.brewery_id).add(m.user_id)
  })

  // B. Process Breweries
  const { data: breweries } = await supabase.from('breweries').select('id')
  let breweryInsertCount = 0

  // Process in batches of 10 for "Total" queries to avoid connection exhaustion
  const BATCH_SIZE = 10
  for (let i = 0; i < (breweries?.length || 0); i += BATCH_SIZE) {
      const batch = breweries!.slice(i, i + BATCH_SIZE)
      
      await Promise.all(batch.map(async (brewery: any) => {
        const bId = brewery.id
        
        // 1. In-Memory Metrics
        const membersSet = breweryMembersMap.get(bId) || new Set()
        const membersCount = membersSet.size
        
        const bottlesScanned = scansMap[bId] || 0
        const ratingsReceived = ratingsMap[bId] || 0
        
        // Active Members: Intersection of Members & Active Users Today
        let activeMembersCount = 0
        if (membersSet.size > 0) {
            for (const memberId of membersSet) {
                if (userActivityMap.has(memberId)) {
                    activeMembersCount++
                }
            }
        }

        // 2. DB Metrics (Daily New Activity)
        // Note: We switched from Cumulative (lte) to Daily New (gte/lt) to support "Activity per Day" charts correctly.
        const { count: brewsCount } = await supabase
          .from('brews')
          .select('id', { count: 'exact', head: true })
          .eq('brewery_id', bId)
          .gte('created_at', `${dateStr}T00:00:00.000`)
          .lt('created_at', `${dateStr}T23:59:59.999`)

        const { count: sessionsCount } = await supabase
          .from('brewing_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('brewery_id', bId)
          .gte('created_at', `${dateStr}T00:00:00.000`)
          .lt('created_at', `${dateStr}T23:59:59.999`)

        const { error } = await supabase.from('analytics_brewery_daily').upsert({
          brewery_id: bId,
          date: dateStr,
          members_count: membersCount,
          brews_count: brewsCount || 0,
          sessions_count: sessionsCount || 0,
          bottles_scanned: bottlesScanned,
          ratings_received: ratingsReceived,
          active_members: activeMembersCount
        })
        if (!error) breweryInsertCount++
      }))
  }

  console.log(`Brewery daily: Processed ${breweryInsertCount} breweries`)

  // ========== 3. Content Metrics ==========
  // (Content Metrics code remains unchanged as it was already efficient enough)
  const { count: totalBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: publicBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', true)
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: privateBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', false)
    .is('brewery_id', null)
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: teamBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', false)
    .not('brewery_id', 'is', null)
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: totalSessions } = await supabase
    .from('brewing_sessions')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', `${dateStr}T23:59:59.999`)

  const { count: totalBottles } = await supabase
    .from('bottles')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', `${dateStr}T23:59:59.999`)

  // Fix: Use count instead of fetching all rows to avoid scalability issues
  const { count: totalRatings } = await supabase
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', `${dateStr}T23:59:59.999`)

  // Note: Calculating true average of ALL ratings requires fetching all rows or an RPC.
  // For now, we fetch a sample of the last 1000 ratings to estimate the current average trend,
  // or if < 1000, it's exact.
  const { data: ratingsSample } = await supabase
    .from('ratings')
    .select('rating')
    .lte('created_at', `${dateStr}T23:59:59.999`)
    .limit(1000)

  const avgRating =
    ratingsSample?.length > 0
      ? ratingsSample.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingsSample.length
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
    total_ratings: totalRatings || 0,
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
  
  // Aggregate the PREVIOUS full hour (e.g., if now is 14:15, aggregate 13:00-14:00)
  // This ensures we always have a complete data set for that hour.
  const startOfHour = new Date(now)
  startOfHour.setMinutes(0, 0, 0) // e.g. 14:00
  startOfHour.setHours(startOfHour.getHours() - 1) // e.g. 13:00
  
  const endOfHour = new Date(startOfHour)
  endOfHour.setHours(endOfHour.getHours() + 1) // e.g. 14:00

  const dateStr = startOfHour.toISOString().split('T')[0]
  const hour = startOfHour.getHours()

  console.log(`Aggregating hourly metrics for ${dateStr} Hour ${hour} (${startOfHour.toISOString()} to ${endOfHour.toISOString()})`)

  // Error count
  const { count: errorCount } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'error')
    .gte('created_at', startOfHour.toISOString())
    .lt('created_at', endOfHour.toISOString())

  // Active users (unique users with events in this hour)
  const { data: activeUsers } = await supabase
    .from('analytics_events')
    .select('user_id')
    .gte('created_at', startOfHour.toISOString())
    .lt('created_at', endOfHour.toISOString())

  const uniqueUsers = new Set(
    activeUsers?.map((e: { user_id: string | null }) => e.user_id).filter(Boolean)
  ).size

  // API calls (all events)
  const { count: apiCalls } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfHour.toISOString())
    .lt('created_at', endOfHour.toISOString())

  // D.2: Count unique sessions active during this hour
  // A session is "active" if it started before endOfHour and (is still open OR completed after startOfHour)
  const { count: uniqueSessionsCount } = await supabase
    .from('brewing_sessions')
    .select('id', { count: 'exact', head: true })
    .lt('started_at', endOfHour.toISOString())
    .or(`completed_at.is.null,completed_at.gt.${startOfHour.toISOString()}`)
    .not('started_at', 'is', null)

  // Compute avg_response_time_ms from instrumented events in this hour
  // Wrapped in try/catch — gracefully skips if column doesn't exist yet (pre-migration)
  let avgResponseTimeMs = 0
  try {
    const { data: responseTimeData } = await supabase
      .from('analytics_events')
      .select('response_time_ms')
      .gte('created_at', startOfHour.toISOString())
      .lt('created_at', endOfHour.toISOString())
      .not('response_time_ms', 'is', null)

    const responseTimes = (responseTimeData ?? [])
      .map((e: { response_time_ms: number }) => e.response_time_ms)
      .filter((v: number) => v > 0)
    avgResponseTimeMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
      : 0
  } catch (_) {
    // Column may not exist yet — default to 0
  }

  await supabase.from('analytics_system_hourly').upsert({
    timestamp: startOfHour.toISOString(),
    hour,
    date: dateStr,
    error_count: errorCount || 0,
    active_users_count: uniqueUsers,
    api_calls_count: apiCalls || 0,
    avg_response_time_ms: avgResponseTimeMs,
    unique_sessions: uniqueSessionsCount || 0,
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

  // 1. Get all users (limit to last 12 months for performance if needed, but we do all for now)
  const { data: users } = await supabase
    .from('profiles')
    .select('id, joined_at')

  if (!users) return { success: true, message: 'No users found' }

  // 2. Group by Cohort (Month)
  const cohortMap = new Map()
  users.forEach((user: any) => {
    if (!user.joined_at) return
    const signupDate = new Date(user.joined_at)
    const cohortId = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, '0')}`

    if (!cohortMap.has(cohortId)) {
      cohortMap.set(cohortId, {
        users: []
      })
    }
    cohortMap.get(cohortId).users.push(user)
  })

  let processedCohorts = 0

  // 3. Process each cohort
  for (const [cohortId, cohortData] of cohortMap.entries()) {
    const cohortUsers = cohortData.users
    const userIds = cohortUsers.map((u: any) => u.id)

    // Optimization: Fetch aggregated daily activity instead of raw events
    // This is much faster and more accurate for "Day N" checks
    const { data: dailyActivity } = await supabase
        .from('analytics_user_daily')
        .select('user_id, date')
        .in('user_id', userIds)
    
    // Create a lookup set: "userId:dateString"
    const activitySet = new Set(
        dailyActivity?.map((d: any) => `${d.user_id}:${d.date}`) || []
    )

    let retainedDay1 = 0
    let retainedDay7 = 0
    let retainedDay30 = 0
    let retainedDay90 = 0

    // Check retention for each user individualy relative to THEIR signup date
    for (const user of cohortUsers) {
        const signupDate = new Date(user.joined_at)
        
        // Helper to check activity on specific day (+/- 1 day window for flexibility)
        const checkActivity = (daysOffset: number) => {
            const targetDate = new Date(signupDate)
            targetDate.setDate(targetDate.getDate() + daysOffset)
            const dateStr = targetDate.toISOString().split('T')[0]
            return activitySet.has(`${user.id}:${dateStr}`)
        }

        // Day 1: Active next day?
        if (checkActivity(1)) retainedDay1++
        
        // Day 7: Active on day 7? (or strictly day 7-8?)
        // Standard strict retention: Active ON day 7. 
        // Rolling retention: Active on Day 7 OR LATER.
        // Let's use strict day check for now, maybe check a small window (Day 7)
        if (checkActivity(7)) retainedDay7++

        // Day 30
        if (checkActivity(30)) retainedDay30++

        // Day 90
        if (checkActivity(90)) retainedDay90++
    }

    // Avg events/brews (Still need raw stats or aggregated stats)
    // We can fetch this from profiles if we had counters, or simple counts
    // For now, let's skip expensive raw event counts or keep them simple
    // Let's use `analytics_user_daily` to sum up events!
    const { data: eventSums } = await supabase
        .from('analytics_user_daily')
        .select('events_count')
        .in('user_id', userIds)
    
    const totalEvents = eventSums?.reduce((sum: number, row: any) => sum + (row.events_count || 0), 0) || 0
    const avgEventsPerUser = totalEvents / userIds.length

    // Avg Brews (from Brews table)
    const { count: totalBrews } = await supabase
        .from('brews')
        .select('id', { count: 'exact', head: true })
        .in('owner_id', userIds)
    
    const avgBrewsPerUser = (totalBrews || 0) / userIds.length

    // Paid conversion
    const { count: paidCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('id', userIds)
      .neq('subscription_tier', 'free') // Assuming 'free' is the default
      .not('subscription_tier', 'is', null)

    const paidConversionRate = ((paidCount || 0) / userIds.length) * 100

    // D.3: Estimate avg_ltv from subscription_history
    // LTV estimate: months spent on each paid tier × monthly price
    const TIER_PRICES: Record<string, number> = {
      brewer: 4.99,
      brewery: 14.99,
      enterprise: 49.99,
    }
    const { data: subHistory } = await supabase
      .from('subscription_history')
      .select('profile_id, subscription_tier, changed_at, subscription_status')
      .in('profile_id', userIds)
      .order('changed_at', { ascending: true })

    // Group events by user and calculate months at each paid tier
    const ltvByUser: Record<string, number> = {}
    const lastEventByUser: Record<string, { tier: string; at: string }> = {}

    ;(subHistory || []).forEach((e: any) => {
      if (!lastEventByUser[e.profile_id]) {
        // First event: nothing to calculate yet
        lastEventByUser[e.profile_id] = { tier: e.subscription_tier, at: e.changed_at }
        return
      }
      const prev = lastEventByUser[e.profile_id]
      const monthsSpent =
        (new Date(e.changed_at).getTime() - new Date(prev.at).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
      const price = TIER_PRICES[prev.tier] ?? 0
      ltvByUser[e.profile_id] = (ltvByUser[e.profile_id] || 0) + monthsSpent * price
      lastEventByUser[e.profile_id] = { tier: e.subscription_tier, at: e.changed_at }
    })

    // Add ongoing revenue for still-active users (from last event to now)
    const now = new Date()
    Object.entries(lastEventByUser).forEach(([uid, last]) => {
      const price = TIER_PRICES[last.tier] ?? 0
      if (price > 0) {
        const monthsSinceLast =
          (now.getTime() - new Date(last.at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        ltvByUser[uid] = (ltvByUser[uid] || 0) + monthsSinceLast * price
      }
    })

    const totalLtv = Object.values(ltvByUser).reduce((s, v) => s + v, 0)
    const avgLtv = userIds.length > 0 ? totalLtv / userIds.length : 0

    await supabase.from('analytics_cohorts').upsert({
      cohort_id: cohortId,
      user_count: userIds.length,
      retention_day1: (retainedDay1 / userIds.length) * 100,
      retention_day7: (retainedDay7 / userIds.length) * 100,
      retention_day30: (retainedDay30 / userIds.length) * 100,
      retention_day90: (retainedDay90 / userIds.length) * 100,
      avg_events_per_user: Math.round(avgEventsPerUser * 100) / 100,
      avg_brews_per_user: Math.round(avgBrewsPerUser * 100) / 100,
      paid_conversion_rate: Math.round(paidConversionRate * 100) / 100,
      avg_ltv: Math.round(avgLtv * 100) / 100,
      updated_at: new Date().toISOString()
    })

    processedCohorts++
    console.log(`Cohort ${cohortId}: ${userIds.length} users processed.`)
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

  const featureMap = new Map()
  let hasMore = true
  let page = 0
  const pageSize = 1000

  // 1. Fetch events in pages to avoid memory/timeout issues
  while (hasMore) {
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('category, event_type, user_id')
      .gte('created_at', `${dateStr}T00:00:00.000`)
      .lt('created_at', `${dateStr}T23:59:59.999`)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
        console.error('Error fetching events page:', error)
        break
    }

    if (!events || events.length === 0) {
        hasMore = false
        break
    }

    if (events.length < pageSize) {
        hasMore = false
    }

    events.forEach((event: any) => {
        // Use event_type as feature name for granularity (e.g. 'scan_bottle', 'create_brew')
        // Fallback to category if event_type is generic or missing
        const feature = event.event_type || event.category
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
        
        // Simple heuristic for success/error tracking
        if (event.category === 'error' || feature.includes('error') || feature.includes('fail')) {
            featureData.error_count++
        } else {
            featureData.success_count++
        }
    })

    page++
  }

  let insertCount = 0
  for (const [feature, data] of featureMap.entries()) {
    const { error } = await supabase.from('analytics_feature_usage').upsert({
      feature,
      date: dateStr,
      usage_count: data.usage_count,
      unique_users: data.unique_users.size,
      success_count: data.success_count,
      error_count: data.error_count,
      avg_duration_seconds: 0
    })
    if (!error) insertCount++
  }

  console.log(`Feature usage: Processed ${insertCount} features`)

  return { date: dateStr, features: insertCount }
}
