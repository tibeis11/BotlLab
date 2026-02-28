'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAlgorithmSettings as _getAlgorithmSettings, AlgorithmSettings } from '@/lib/algorithm-settings'

// ============================================================================
// Service Role Client (bypasses RLS)
// ============================================================================
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase service role credentials')
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ============================================================================
// Types
// ============================================================================
export interface QualityBucket {
  bucket: string
  bucket_count: number
}

export interface LowQualityBrew {
  id: string
  name: string
  style: string | null
  quality_score: number
  trending_score: number
  is_featured: boolean
  image_url: string | null
  created_at: string
}

export interface AdminBrewListItem {
  id: string
  name: string
  style: string | null
  quality_score: number
  trending_score: number
  trending_score_override: number | null
  is_featured: boolean
  image_url: string | null
  created_at: string
}

// ============================================================================
// A) Quality Score Panel
// ============================================================================

/** Returns 5 score buckets (0–19, 20–39, 40–59, 60–79, 80–100) with counts */
export async function getQualityScoreDistribution(): Promise<QualityBucket[]> {
  const db = getServiceRoleClient()
  const { data, error } = await db.rpc('get_quality_score_distribution')
  if (error) throw new Error(`getQualityScoreDistribution: ${error.message}`)
  return (data ?? []) as QualityBucket[]
}

/** Returns public brews with quality_score < threshold (default 40) */
export async function getLowQualityBrews(threshold = 40): Promise<LowQualityBrew[]> {
  const db = getServiceRoleClient()
  const { data, error } = await db.rpc('get_low_quality_brews', { threshold })
  if (error) throw new Error(`getLowQualityBrews: ${error.message}`)
  return (data ?? []) as LowQualityBrew[]
}

// ============================================================================
// B) Trending Score Override
// ============================================================================

/** Returns all public brews ordered by quality_score for admin management */
export async function getAdminBrewList(limit = 50): Promise<AdminBrewListItem[]> {
  const db = getServiceRoleClient()
  const { data, error } = await db
    .from('brews')
    .select('id,name,style,quality_score,trending_score,trending_score_override,is_featured,image_url,created_at')
    .eq('is_public', true)
    .order('quality_score', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getAdminBrewList: ${error.message}`)
  return (data ?? []) as AdminBrewListItem[]
}

/**
 * Search brews by name or style (case-insensitive).
 * Returns up to `limit` results ordered by quality_score DESC.
 */
export async function searchAdminBrews(
  query: string,
  limit = 50
): Promise<AdminBrewListItem[]> {
  const db = getServiceRoleClient()
  const q = query.trim()
  const builder = db
    .from('brews')
    .select('id,name,style,quality_score,trending_score,trending_score_override,is_featured,image_url,created_at')
    .eq('is_public', true)
    .order('quality_score', { ascending: false })
    .limit(limit)

  if (q) {
    builder.or(`name.ilike.%${q}%,style.ilike.%${q}%`)
  }

  const { data, error } = await builder
  if (error) throw new Error(`searchAdminBrews: ${error.message}`)
  return (data ?? []) as AdminBrewListItem[]
}

/** Manually override trending_score for a brew (pin — survives cron) */
export async function setTrendingScoreOverride(brewId: string, score: number): Promise<void> {
  const db = getServiceRoleClient()
  const { error } = await db.rpc('admin_set_trending_score', {
    brew_id: brewId,
    new_score: score,
  })
  if (error) throw new Error(`setTrendingScoreOverride: ${error.message}`)
}

/** Remove the pin — brew returns to auto cron calculation */
export async function clearTrendingOverride(brewId: string): Promise<void> {
  const db = getServiceRoleClient()
  const { error } = await db.rpc('admin_clear_trending_override', { brew_id: brewId })
  if (error) throw new Error(`clearTrendingOverride: ${error.message}`)
}

// ============================================================================
// C) Featured Brews Manager
// ============================================================================

/** Toggle is_featured for a brew */
export async function setBrewFeatured(brewId: string, featured: boolean): Promise<void> {
  const db = getServiceRoleClient()
  const { error } = await db.rpc('admin_set_featured', {
    brew_id: brewId,
    featured,
  })
  if (error) throw new Error(`setBrewFeatured: ${error.message}`)
}

/** Get all currently featured brews (admin view) */
export async function getFeaturedBrewsAdmin(): Promise<AdminBrewListItem[]> {
  const db = getServiceRoleClient()
  const { data, error } = await db
    .from('brews')
    .select('id,name,style,quality_score,trending_score,is_featured,image_url,created_at')
    .eq('is_public', true)
    .eq('is_featured', true)
    .order('quality_score', { ascending: false })
  if (error) throw new Error(`getFeaturedBrewsAdmin: ${error.message}`)
  return (data ?? []) as AdminBrewListItem[]
}

// ============================================================================
// B) Discover Quality Threshold (platform_settings)
// ============================================================================

export interface PlatformSettings {
  discover_min_quality_score: number
  discover_featured_section_label: string
  /** Diversity-Cap: max. Brews pro Stil in Kollab-Empfehlungen.
   *  Empfohlene Formel: max(2, round(total_public_brews / 30))  */
  collab_diversity_cap: number
}

export async function getDiscoverSettings(): Promise<PlatformSettings> {
  const db = getServiceRoleClient()
  const { data, error } = await db
    .from('platform_settings')
    .select('key,value')
  if (error) throw new Error(`getDiscoverSettings: ${error.message}`)
  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value
  return {
    discover_min_quality_score: parseInt(map['discover_min_quality_score'] ?? '0', 10),
    discover_featured_section_label: map['discover_featured_section_label'] ?? 'Empfohlen',
    collab_diversity_cap: parseInt(map['collab_diversity_cap'] ?? '3', 10),
  }
}

/** Gesamtanzahl öffentlicher Brews – für die Auto-Cap-Formel im Admin-UI */
export async function getTotalPublicBrewCount(): Promise<number> {
  const db = getServiceRoleClient()
  const { count, error } = await db
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', true)
  if (error) throw new Error(`getTotalPublicBrewCount: ${error.message}`)
  return count ?? 0
}

export async function saveDiscoverSettings(settings: Partial<PlatformSettings>): Promise<void> {
  const db = getServiceRoleClient()
  const upserts = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }))
  const { error } = await db
    .from('platform_settings')
    .upsert(upserts, { onConflict: 'key' })
  if (error) throw new Error(`saveDiscoverSettings: ${error.message}`)
}

// ============================================================================
// D) Algorithm Settings (Forum Hot Score + Discover Trending Score)
// ============================================================================

/** Read algorithm settings — delegates to shared utility (bypasses RLS) */
export async function getAlgorithmSettings(): Promise<AlgorithmSettings> {
  return _getAlgorithmSettings()
}

/** Persist algorithm parameter changes to platform_settings */
export async function saveAlgorithmSettings(settings: Partial<AlgorithmSettings>): Promise<void> {
  const db = getServiceRoleClient()
  const upserts = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }))
  const { error } = await db
    .from('platform_settings')
    .upsert(upserts, { onConflict: 'key' })
  if (error) throw new Error(`saveAlgorithmSettings: ${error.message}`)
}

/**
 * Recalculate ALL public brew trending scores using given weights.
 * Runs a direct UPDATE (service role) — does NOT call the existing PG function
 * so we can apply custom weights from the admin UI without a DB migration.
 *
 * Formula: (likes × likes_weight + times_brewed × brewed_weight) / (ageDays + 2)^age_exponent
 *
 * Respects `trending_score_override` — Admin-Pins werden nicht überschrieben.
 */
export async function recalcTrendingWithCustomWeights(
  likes_weight: number,
  brewed_weight: number,
  age_exponent: number,
): Promise<{ updated: number }> {
  const db = getServiceRoleClient()

  // Use a raw SQL-compatible approach via RPC or a parameterized update.
  // Since we can't safely call parameterized SQL via JS without an RPC, we call
  // the existing stored proc and pass weights via a wrapper we know works.
  // Fallback: run update using JS math, fetching all relevant rows first.

  const { data: brews, error: fetchErr } = await db
    .from('brews')
    .select('id,likes_count,times_brewed,created_at,trending_score_override')
    .eq('is_public', true)

  if (fetchErr) throw new Error(`recalcTrending fetch: ${fetchErr.message}`)

  const now = Date.now()
  const updates = (brews ?? [])
    .filter(b => b.trending_score_override == null) // respect admin pins
    .map(b => {
      const ageDays = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24)
      const score = (
        (Number(b.likes_count ?? 0) * likes_weight + Number(b.times_brewed ?? 0) * brewed_weight)
        / Math.pow(ageDays + 2, age_exponent)
      )
      return { id: b.id, trending_score: Math.max(0, score) }
    })

  if (updates.length === 0) return { updated: 0 }

  // Batch upsert
  const { error: updErr } = await db.from('brews').upsert(updates, { onConflict: 'id' })
  if (updErr) throw new Error(`recalcTrending update: ${updErr.message}`)

  return { updated: updates.length }
}
