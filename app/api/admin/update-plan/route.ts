import { NextResponse } from 'next/server'
import { updateUserSubscriptionPlan } from '@/lib/actions/analytics-admin-actions'
import { createClient } from '@/lib/supabase-server'
import { checkAdminAccess } from '@/lib/admin-auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, plan } = body
    if (!email || !plan) return NextResponse.json({ error: 'Missing email or plan' }, { status: 400 })

    // Check admin rights
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { isAdmin } = await checkAdminAccess({ id: user.id, email: user.email! })
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await updateUserSubscriptionPlan(email, plan)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('API update-plan error:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
