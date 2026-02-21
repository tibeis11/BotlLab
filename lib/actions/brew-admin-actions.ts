'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'

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
