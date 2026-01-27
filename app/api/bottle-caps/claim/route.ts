import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { trackEvent } from '@/lib/actions/analytics-actions';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
      console.error("Claim Error: Missing fields", { brew_id, rating_id });
      return NextResponse.json({ error: 'Missing brew_id or rating_id' }, { status: 400 });
    }

    console.log(`Attempting to claim cap: Brew ${brew_id}, Rating ${rating_id}, User ${user.id}`);

    // 1. Check if rating exists (first by ID to debug mismatches)
    const { data: rating, error: fetchError } = await supabase
        .from('ratings')
        .select('id, user_id, brew_id')
        .eq('id', rating_id)
        .single();

    if (fetchError || !rating) {
        console.error("Claim Error: Rating lookup failed", { rating_id, fetchError });
        return NextResponse.json({ 
            error: `Rating not found (ID: ${rating_id})`,
            details: fetchError ? fetchError.message : 'No data returned',
            searched_id: rating_id
        }, { status: 404 });
    }

    // Validate connection to brew
    if (rating.brew_id !== brew_id) {
         console.error(`Rating ${rating_id} is for brew ${rating.brew_id}, but requested claim for brew ${brew_id}`);
         return NextResponse.json({ error: 'Rating mismatch: Wrong Brew ID' }, { status: 400 });
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

        // Track cap claim event
        try {
            await trackEvent({
                event_type: 'cap_claimed',
                category: 'engagement',
                payload: {
                    brew_id: brew_id,
                    rating_id: rating_id,
                    user_id: user.id
                }
            });
        } catch (e) {
            console.error('Failed to track cap_claimed event:', e);
        }

        return NextResponse.json({ success: true, message: 'Bottle Cap collected!' });

  } catch (e: any) {
    console.error("Error claiming cap:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
