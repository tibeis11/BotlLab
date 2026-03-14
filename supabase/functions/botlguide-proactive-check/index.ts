// @ts-nocheck
// botlguide-proactive-check/index.ts
// Runs every 6 hours via pg_cron.
// Scans all active fermentation sessions of Premium users (brewery/enterprise)
// and writes actionable insights into `analytics_ai_insights`.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveSession {
  id: string
  brew_id: string | null
  user_id: string
  brewery_id: string | null
  phase: string
  started_at: string
  brews?: {
    id: string
    name: string
    style: string | null
    brew_type: string | null
    data: Record<string, unknown> | null
  } | null
}

interface Measurement {
  id: string
  measured_at: string
  gravity: number | null
  temperature: number | null
}

interface NewInsight {
  user_id: string
  brewery_id: string | null
  session_id: string
  brew_id: string | null
  insight_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
}

// ── Helper ────────────────────────────────────────────────────────────────────

function hoursBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 3_600_000
}

async function analyzeSessions(
  supabase: ReturnType<typeof createClient>,
  sessions: ActiveSession[]
): Promise<NewInsight[]> {
  const insights: NewInsight[] = []
  const now = new Date().toISOString()

  for (const session of sessions) {
    const brewName = session.brews?.name ?? 'Deine aktuelle Sud'
    const brewId = session.brew_id ?? session.brews?.id ?? null

    // ── Measurements ──────────────────────────────────────────────────────────
    const { data: measurements } = await supabase
      .from('brew_measurements')
      .select('id, measured_at, gravity, temperature')
      .eq('brew_id', session.brew_id)
      .order('measured_at', { ascending: false })
      .limit(10)

    const m: Measurement[] = measurements ?? []

    // ── 1. Gravity Stagnation > 48h ───────────────────────────────────────────
    if (session.phase === 'fermenting' && m.length >= 2) {
      const gravityReadings = m.filter(x => x.gravity !== null)
      if (gravityReadings.length >= 2) {
        const latest = gravityReadings[0]
        const previous = gravityReadings[1]
        const timeDiff = hoursBetween(latest.measured_at, previous.measured_at)
        const gravityDiff = Math.abs((latest.gravity ?? 0) - (previous.gravity ?? 0))

        if (timeDiff >= 48 && gravityDiff < 0.002) {
          // Check: insight doesn't already exist (not dismissed) for this session
          const { data: existing } = await supabase
            .from('analytics_ai_insights')
            .select('id')
            .eq('session_id', session.id)
            .eq('insight_type', 'fermentation_stall')
            .eq('is_dismissed', false)
            .maybeSingle()

          if (!existing) {
            insights.push({
              user_id: session.user_id,
              brewery_id: session.brewery_id,
              session_id: session.id,
              brew_id: brewId,
              insight_type: 'fermentation_stall',
              severity: 'warning',
              title: `Gärung stagniert: ${brewName}`,
              body: `Die Dichte hat sich in den letzten ${Math.round(timeDiff)} Stunden kaum verändert (${latest.gravity?.toFixed(3)} → ${previous.gravity?.toFixed(3)}). Mögliche Ursachen: Stuck Fermentation, zu kalte Temperatur oder Hefe erschöpft. Temperatur prüfen und ggf. Hefe aufwecken.`,
            })
          }
        }
      }
    }

    // ── 2. Temperature Anomaly ────────────────────────────────────────────────
    if (m.length >= 1) {
      const latestTemp = m.find(x => x.temperature !== null)
      if (latestTemp?.temperature !== null) {
        const temp = latestTemp!.temperature as number
        // For fermenting: typical ale range 18–24°C, lager 8–14°C
        // Use brew type to determine tolerance; default ale range
        const isLager = ['lager', 'pilsner'].includes(
          (session.brews?.brew_type ?? '').toLowerCase()
        )
        const [minTemp, maxTemp] = isLager ? [7, 15] : [15, 26]

        if (temp < minTemp || temp > maxTemp) {
          const { data: existing } = await supabase
            .from('analytics_ai_insights')
            .select('id')
            .eq('session_id', session.id)
            .eq('insight_type', 'temp_anomaly')
            .eq('is_dismissed', false)
            .maybeSingle()

          if (!existing) {
            const severity = temp < minTemp - 3 || temp > maxTemp + 5 ? 'critical' : 'warning'
            const direction = temp < minTemp ? 'zu kalt' : 'zu warm'
            insights.push({
              user_id: session.user_id,
              brewery_id: session.brewery_id,
              session_id: session.id,
              brew_id: brewId,
              insight_type: 'temp_anomaly',
              severity,
              title: `Temperatur außerhalb Toleranz: ${brewName}`,
              body: `Aktuelle Temperatur ${temp.toFixed(1)} °C ist ${direction} für ${isLager ? 'Lagerbier' : 'Ale'} (Zielbereich ${minTemp}–${maxTemp} °C). Bei zu niedrigen Temperaturen kann die Gärung ins Stocken geraten, bei zu hohen entstehen Fusel-Alkohole.`,
            })
          }
        }
      }
    }

    // ── 3. Fermentation Overly Long > 21 days ─────────────────────────────────
    if (session.phase === 'fermenting') {
      const daysRunning = hoursBetween(session.started_at, now) / 24
      if (daysRunning > 21) {
        const { data: existing } = await supabase
          .from('analytics_ai_insights')
          .select('id')
          .eq('session_id', session.id)
          .eq('insight_type', 'slow_fermentation')
          .eq('is_dismissed', false)
          .maybeSingle()

        if (!existing) {
          insights.push({
            user_id: session.user_id,
            brewery_id: session.brewery_id,
            session_id: session.id,
            brew_id: brewId,
            insight_type: 'slow_fermentation',
            severity: 'info',
            title: `Lange Gärzeit: ${brewName}`,
            body: `Diese Sud gärt seit ${Math.round(daysRunning)} Tagen. Für die meisten Bierstile ist die Hauptgärung nach 7–14 Tagen abgeschlossen. Endvergärung und finalen Schwerkraftwert prüfen — ggf. abfüllen auf Conditioning umstellen.`,
          })
        }
      }
    }

    // ── 4. Ready to Package — low gravity stable for 3+ days ─────────────────
    if (session.phase === 'fermenting' && m.length >= 2) {
      const gravityReadings = m.filter(x => x.gravity !== null)
      if (gravityReadings.length >= 2) {
        const latest = gravityReadings[0]
        const previous = gravityReadings[1]
        const timeDiff = hoursBetween(latest.measured_at, previous.measured_at)
        const targetFG = (session.brews?.data as any)?.fg
        const currentGravity = latest.gravity ?? 1.1

        // Stable and near target FG (below 1.015 typical)
        if (
          timeDiff >= 72 &&
          Math.abs((latest.gravity ?? 0) - (previous.gravity ?? 0)) < 0.002 &&
          currentGravity <= (targetFG ?? 1.016)
        ) {
          const { data: existing } = await supabase
            .from('analytics_ai_insights')
            .select('id')
            .eq('session_id', session.id)
            .eq('insight_type', 'ready_to_package')
            .eq('is_dismissed', false)
            .maybeSingle()

          if (!existing) {
            insights.push({
              user_id: session.user_id,
              brewery_id: session.brewery_id,
              session_id: session.id,
              brew_id: brewId,
              insight_type: 'ready_to_package',
              severity: 'info',
              title: `Abfüllbereit? ${brewName}`,
              body: `Die Dichte ist seit ${Math.round(timeDiff)} Stunden stabil bei ${latest.gravity?.toFixed(3)} (${timeDiff >= 72 ? '3+ Tage' : Math.round(timeDiff / 24) + ' Tage'}). Das deutet auf eine abgeschlossene Gärung hin — Zeit für die Abfüllung oder Conditioning!`,
            })
          }
        }
      }
    }
  }

  return insights
}

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore Deno.env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore Deno.env
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // 1. Fetch all Premium users (brewery / enterprise) who haven't opted out
    const { data: premiumProfiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .in('subscription_tier', ['brewery', 'enterprise'])
      .eq('botlguide_insights_enabled', true)

    if (profileErr) throw profileErr

    const premiumUserIds = (premiumProfiles ?? []).map((p: { id: string }) => p.id)

    if (premiumUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No premium users found', insights_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch all active fermenting/conditioning sessions for these users
    const { data: sessions, error: sessErr } = await supabase
      .from('brewing_sessions')
      .select(`
        id,
        user_id,
        brewery_id,
        phase,
        started_at,
        brew_id,
        brews ( id, name, style, brew_type, data )
      `)
      .in('user_id', premiumUserIds)
      .in('phase', ['fermenting', 'conditioning'])
      .order('started_at', { ascending: false })

    if (sessErr) throw sessErr

    const activeSessions: ActiveSession[] = (sessions ?? []).filter(
      (s: ActiveSession) => s.brew_id !== null
    )

    console.log(`[botlguide-proactive-check] Checking ${activeSessions.length} active sessions for ${premiumUserIds.length} premium users`)

    // 3. Analyze and collect insights
    const newInsights = await analyzeSessions(supabase, activeSessions)

    // 4. Bulk insert
    let inserted = 0
    if (newInsights.length > 0) {
      const { error: insertErr } = await supabase
        .from('analytics_ai_insights')
        .insert(newInsights)

      if (insertErr) throw insertErr
      inserted = newInsights.length
    }

    console.log(`[botlguide-proactive-check] Created ${inserted} new insights`)

    return new Response(
      JSON.stringify({
        message: 'Proactive check complete',
        sessions_checked: activeSessions.length,
        insights_created: inserted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[botlguide-proactive-check] Error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
