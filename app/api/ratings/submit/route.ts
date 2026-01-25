import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cleanText, isProfane } from '@/lib/profanity';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { 
        brew_id, rating, comment, author_name, ip_address,
        taste_bitterness, taste_sweetness, taste_body, taste_carbonation, taste_acidity,
        flavor_tags, appearance_color, appearance_clarity, aroma_intensity
    } = body;

    if (!brew_id || !rating || !author_name || !ip_address) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- Privacy: Anonymize IP ---
    // Store only the hash to prevent PII storage while maintaining duplicate check
    const ipHash = crypto.createHash('sha256').update(ip_address).digest('hex');

    // --- Profanity Filter ---
    // Wir bereinigen den Namen und den Kommentar bevor wir speichern.
    if (isProfane(author_name)) {
        // Option A: Reject
        // return NextResponse.json({ error: 'Bitte wähle einen höflichen Namen.' }, { status: 400 });
        
        // Option B: Clean (Tim Arsch -> Tim *****)
        author_name = cleanText(author_name);
    }

    if (comment && isProfane(comment)) {
        comment = cleanText(comment);
    }
    // ------------------------

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
            comment, // Cleaned comment
            author_name, // Cleaned name
            ip_address: ipHash, // Store Hash instead of Plain IP
            taste_bitterness,
            taste_sweetness,
            taste_body,
            taste_carbonation,
            taste_acidity,
            flavor_tags,
            appearance_color,
            appearance_clarity,
            aroma_intensity,
            moderation_status: 'auto_approved' 
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
