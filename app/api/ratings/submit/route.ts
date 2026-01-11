import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brew_id, rating, comment, author_name, ip_address } = body;

    if (!brew_id || !rating || !author_name || !ip_address) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get Brew Info (to find brewery_id)
    const { data: brew, error: brewError } = await supabaseAdmin
        .from('brews')
        .select('id, brewery_id, name')
        .eq('id', brew_id)
        .single();

    if (brewError || !brew) {
        return NextResponse.json({ error: 'Brew not found' }, { status: 404 });
    }

    // 2. Insert Rating
    const { data: ratingData, error: ratingError } = await supabaseAdmin
        .from('ratings')
        .insert([{
            brew_id,
            rating,
            comment,
            author_name,
            ip_address,
            moderation_status: 'auto_approved' // or 'pending' depending on settings, keeping 'auto_approved' as per original code
        }])
        .select()
        .single();

    if (ratingError) {
        // Handle duplicate check
        if (ratingError.message.includes('unique') || ratingError.message.includes('duplicate')) {
             return NextResponse.json({ error: 'Already rated' }, { status: 409 });
        }
        throw ratingError;
    }

    // 3. Add to Brewery Feed
    if (brew.brewery_id) {
        await supabaseAdmin
            .from('brewery_feed')
            .insert({
                brewery_id: brew.brewery_id,
                user_id: null, // System event / Anonymous
                type: 'BREW_RATED',
                content: {
                    brew_id: brew.id,
                    brew_name: brew.name,
                    rating: rating,
                    author: author_name,
                    comment: comment,
                    message: `${author_name} hat das Rezept "${brew.name}" mit ${rating} Sternen bewertet.`
                }
            });
    }

    return NextResponse.json({ success: true, rating: ratingData });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
