import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Lightweight ping endpoint for client-side activity tracking.
 * - Accepts optional `Authorization: Bearer <token>` header to associate the ping with a user
 * - Respects `profiles.analytics_opt_out` when user is present
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Try to identify user from Authorization header if provided
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      // Use anon client to validate token -> getUser
      const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
      const { data, error } = await authClient.auth.getUser(token);
      if (!error && data?.user) {
        userId = data.user.id;
      }
    }

    // Respect opt-out if we have a user
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('analytics_opt_out')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.analytics_opt_out === true) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    const userAgent = req.headers.get('user-agent') || null;
    const referer = req.headers.get('referer') || req.headers.get('x-forwarded-for') || null;

    // Insert event directly using service role (server-side safe)
    const { error: insertError } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_type: 'heartbeat',
        category: 'engagement',
        payload: { source: 'client-ping' },
        path: referer || undefined,
        user_agent: userAgent || undefined
      });

    if (insertError) {
      console.error('analytics/ping insert error', insertError.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('analytics/ping failed', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
