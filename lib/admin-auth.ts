/**
 * lib/admin-auth.ts
 *
 * Admin authentication utility.
 * Replaces the ADMIN_EMAILS env-var check with a persistent admin_users table.
 *
 * Bootstrap: on first access, if admin_users is empty AND the user's email
 * appears in ADMIN_EMAILS, they are automatically inserted as the first admin.
 *
 * Usage (in server components / API routes):
 *   const access = await checkAdminAccess({ id: user.id, email: user.email! })
 *   if (!access.isAdmin) return 403
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'

// ============================================================================
// Service Role Client
// ============================================================================
function getSRClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('[admin-auth] Missing Supabase credentials')
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ============================================================================
// Public Types
// ============================================================================

export interface AdminUser {
  id: number
  profile_id: string
  email: string
  role: 'admin' | 'super_admin'
  is_active: boolean
  added_by: string | null
  added_at: string
  notes: string | null
}

export interface AdminAccessResult {
  isAdmin: boolean
  bootstrapped: boolean // true if auto-seeded on this call
  adminUser?: AdminUser
}

// ============================================================================
// checkAdminAccess — primary entrypoint
// ============================================================================

/**
 * Returns whether the given user has admin access.
 * Side-effect: bootstraps admin_users on first empty-table call if the
 * user's email is listed in the ADMIN_EMAILS env variable.
 */
export async function checkAdminAccess(user: {
  id: string
  email: string
}): Promise<AdminAccessResult> {
  const supabase = getSRClient()

  // 1. Direct lookup (fast path — active admin)
  const { data: existing } = await supabase
    .from('admin_users')
    .select('*')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return { isAdmin: true, bootstrapped: false, adminUser: existing as AdminUser }
  }

  // 2. Check if table is empty (bootstrap gate)
  const { count } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  if ((count ?? 0) > 0) {
    // Table has active admins — user is simply not one of them
    return { isAdmin: false, bootstrapped: false }
  }

  // 3. Table is empty → check ADMIN_EMAILS for bootstrap
  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return { isAdmin: false, bootstrapped: false }
  }

  // 4. Bootstrap: insert user as super_admin
  const { data: seeded, error } = await supabase
    .from('admin_users')
    .insert({
      profile_id: user.id,
      email: user.email,
      role: 'super_admin',
      is_active: true,
      notes: 'Auto-bootstrapped from ADMIN_EMAILS env variable',
    })
    .select()
    .single()

  if (error) {
    console.error('[admin-auth] Bootstrap failed:', error)
    // Fall back gracefully — still grant access if email is in env list
    return { isAdmin: true, bootstrapped: false }
  }

  console.log(`[admin-auth] Bootstrapped admin: ${user.email}`)
  return { isAdmin: true, bootstrapped: true, adminUser: seeded as AdminUser }
}
