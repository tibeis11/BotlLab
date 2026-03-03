import { NextResponse } from 'next/server'
import { updateUserAppMode } from '@/lib/actions/analytics-admin-actions'
import { createClient } from '@/lib/supabase-server'
import { checkAdminAccess } from '@/lib/admin-auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, mode } = body
    if (!email || !mode) return NextResponse.json({ error: 'Missing email or mode' }, { status: 400 })
    if (mode !== 'drinker' && mode !== 'brewer') {
      return NextResponse.json({ error: 'Invalid mode. Must be "drinker" or "brewer".' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { isAdmin } = await checkAdminAccess({ id: user.id, email: user.email! })
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await updateUserAppMode(email, mode)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('API update-mode error:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
