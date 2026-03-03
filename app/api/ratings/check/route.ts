import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brew_id, user_id } = body;

    if (!brew_id) {
      return NextResponse.json({ error: 'Missing brew_id' }, { status: 400 });
    }

    // Anonymous users: client checks localStorage — no server round-trip needed
    if (!user_id) {
      return NextResponse.json({ hasRated: false, ratingId: null });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingRating } = await supabaseAdmin
      .from('ratings')
      .select('id')
      .eq('brew_id', brew_id)
      .eq('user_id', user_id)
      .maybeSingle();

    return NextResponse.json({
      hasRated: !!existingRating,
      ratingId: existingRating?.id || null,
    });

  } catch (e: any) {
    console.error('[ratings/check] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
