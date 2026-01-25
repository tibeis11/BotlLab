import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brew_id, ip_address } = body;

    if (!brew_id || !ip_address) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Hash the IP same way as on submit
    const ipHash = crypto.createHash('sha256').update(ip_address).digest('hex');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check for existing rating with this IP Hash
    // We check against 'ip_address' column which now holds the hash
    const { data: existingRating } = await supabaseAdmin
        .from('ratings')
        .select('id')
        .eq('brew_id', brew_id)
        .eq('ip_address', ipHash)
        .maybeSingle();

    return NextResponse.json({ 
        hasRated: !!existingRating,
        ratingId: existingRating?.id || null 
    });

  } catch (e: any) {
    console.error("Error checking rating status:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
