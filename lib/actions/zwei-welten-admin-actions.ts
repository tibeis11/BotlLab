// ZWEI WELTEN Phase 5 — Admin Server Actions
// Ruft die Phase-5 RPCs auf und protokolliert alle Aktionen im Audit-Log.
'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role credentials')
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.1 — User-Klassifikation
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassificationPreview {
  totalUsers: number
  alreadyBrewer: number
  wouldBecomeBrewer: number
  stayDrinker: number
}

export async function previewUserClassification(): Promise<ClassificationPreview> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase.rpc('admin_preview_user_classification')
  if (error) throw new Error(`Preview fehlgeschlagen: ${error.message}`)

  const row = (data as any[])[0] ?? {}
  return {
    totalUsers: Number(row.total_users ?? 0),
    alreadyBrewer: Number(row.already_brewer ?? 0),
    wouldBecomeBrewer: Number(row.would_become_brewer ?? 0),
    stayDrinker: Number(row.stay_drinker ?? 0),
  }
}

export async function runUserClassification(): Promise<{ updatedCount: number }> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase.rpc('admin_run_user_classification')
  if (error) throw new Error(`Klassifikation fehlgeschlagen: ${error.message}`)

  return { updatedCount: Number(data ?? 0) }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.2 — Leere Brauereien
// ─────────────────────────────────────────────────────────────────────────────

export interface EmptyBrewery {
  id: string
  name: string
  created_at: string
  brew_count: number
  bottle_count: number
  member_names: string[]
}

export async function getEmptyBreweries(): Promise<EmptyBrewery[]> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase.rpc('admin_get_empty_breweries')
  if (error) throw new Error(`Abfrage fehlgeschlagen: ${error.message}`)

  return ((data as any[]) ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    brew_count: Number(row.brew_count ?? 0),
    bottle_count: Number(row.bottle_count ?? 0),
    member_names: row.member_names ?? [],
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.3 — Ratings Backfill
// ─────────────────────────────────────────────────────────────────────────────

export interface BackfillPreview {
  totalUnlinked: number
  wouldLink: number
}

export async function previewRatingsBackfill(): Promise<BackfillPreview> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase.rpc('admin_preview_ratings_backfill')
  if (error) throw new Error(`Preview fehlgeschlagen: ${error.message}`)

  const row = (data as any[])[0] ?? {}
  return {
    totalUnlinked: Number(row.total_unlinked ?? 0),
    wouldLink: Number(row.would_link ?? 0),
  }
}

export async function runRatingsBackfill(): Promise<{ updatedCount: number }> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase.rpc('admin_run_ratings_backfill')
  if (error) throw new Error(`Backfill fehlgeschlagen: ${error.message}`)

  return { updatedCount: Number(data ?? 0) }
}
