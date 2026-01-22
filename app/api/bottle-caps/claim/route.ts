import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service key to bypass potential RLS on orphaned ratings
    );

    // Get Session using standard method (or pass token)
    // Here we rely on the client sending the auth header, but we use Service Key for DB ops
    // To verify user identity, we should verify the JWT.
    // However, simplest way in Next.js App Router context:
    const authSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // This doesn't strictly work server side to get session without headers handling.
    
    // Better: Helper function
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await authSupabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brew_id, rating_id } = body;

    if (!brew_id || !rating_id) {
      return NextResponse.json({ error: 'Missing brew_id or rating_id' }, { status: 400 });
    }

    // 1. Check if rating exists (and matches brew?)
    const { data: rating } = await supabase
        .from('ratings')
        .select('id, user_id')
        .eq('id', rating_id)
        .eq('brew_id', brew_id)
        .single();

    if (!rating) {
        return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    // 2. Adopt Rating (if orphaned)
    if (!rating.user_id) {
        await supabase
            .from('ratings')
            .update({ user_id: user.id })
            .eq('id', rating_id);
    } else if (rating.user_id !== user.id) {
        // Rating belongs to someone else?
        return NextResponse.json({ error: 'Rating belongs to another user' }, { status: 403 });
    }

    // 3. Insert Bottle Cap
    // Check if cap already exists for this brew (unique constraint will catch it, but checking is nicer)
    const { error: insertError } = await supabase
        .from('collected_caps')
        .insert({
            user_id: user.id,
            brew_id: brew_id,
            rating_id: rating_id,
            claimed_via: 'rating',
            collected_at: new Date().toISOString()
        });

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
             return NextResponse.json({ message: 'Bottle Cap already collected' }, { status: 200 });
        }
        throw insertError;
    }

    return NextResponse.json({ success: true, message: 'Bottle Cap collected!' });

  } catch (e: any) {
    console.error("Error claiming cap:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
