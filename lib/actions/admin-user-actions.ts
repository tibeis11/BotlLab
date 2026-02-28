'use server'

import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkAdminAccess } from '@/lib/admin-auth'
import type { AdminUser } from '@/lib/admin-auth'

// ============================================================================
// Service Role Client
// ============================================================================
function getSRClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ============================================================================
// Auth Guard — caller must be an active admin
// ============================================================================
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { isAdmin } = await checkAdminAccess({ id: user.id, email: user.email! })
  if (!isAdmin) throw new Error('Keine Admin-Berechtigung')
  return user
}

// ============================================================================
// Queries
// ============================================================================

export interface AdminUserWithAddedBy extends AdminUser {
  added_by_email: string | null
}

export async function getAdminUserList(): Promise<AdminUserWithAddedBy[]> {
  const supabase = getSRClient()

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('added_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Enrich with the "added_by" user's email
  const addedByIds = [...new Set((data ?? []).map((u: AdminUser) => u.added_by).filter(Boolean))]
  let addedByMap: Record<string, string> = {}

  if (addedByIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', addedByIds)
    ;(profiles ?? []).forEach((p: { id: string; email: string }) => {
      addedByMap[p.id] = p.email
    })
  }

  return (data ?? []).map((u: AdminUser) => ({
    ...u,
    added_by_email: u.added_by ? (addedByMap[u.added_by] ?? u.added_by.slice(0, 8) + '…') : null,
  }))
}

// ============================================================================
// Mutations
// ============================================================================

export async function addAdminUserByEmail(
  targetEmail: string,
  role: 'admin' | 'super_admin' = 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requireAdmin()
    const supabase = getSRClient()

    // Find profile by email
    const { data: profile, error: findErr } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', targetEmail.trim())
      .maybeSingle()

    if (findErr || !profile) {
      return { success: false, error: 'E-Mail-Adresse nicht gefunden. Nutzer muss sich zuerst registrieren.' }
    }

    // Check if already exists (reactivate if inactive)
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (existing) {
      if (existing.is_active) {
        return { success: false, error: 'Dieser Nutzer ist bereits Admin.' }
      }
      // Reactivate
      await supabase
        .from('admin_users')
        .update({ is_active: true, role, added_by: caller.id })
        .eq('id', existing.id)
    } else {
      // New entry
      const { error: insertErr } = await supabase.from('admin_users').insert({
        profile_id: profile.id,
        email: profile.email,
        role,
        is_active: true,
        added_by: caller.id,
      })
      if (insertErr) return { success: false, error: insertErr.message }
    }

    revalidatePath('/admin/dashboard')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function setAdminUserActive(
  profileId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = getSRClient()

    // Prevent deactivating last active admin
    if (!isActive) {
      const { count } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      if ((count ?? 0) <= 1) {
        return { success: false, error: 'Kann nicht de-aktiviert werden: letzter aktiver Admin.' }
      }
    }

    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: isActive })
      .eq('profile_id', profileId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/dashboard')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateAdminUserRole(
  profileId: string,
  role: 'admin' | 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = getSRClient()
    const { error } = await supabase
      .from('admin_users')
      .update({ role })
      .eq('profile_id', profileId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/dashboard')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
