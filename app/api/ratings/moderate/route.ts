import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
	throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!serviceRoleKey) {
	throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: NextRequest) {
	try {
		const { ratingId, brewId, status } = await req.json();

		if (!ratingId || !brewId) {
			return NextResponse.json({ error: 'ratingId und brewId sind erforderlich' }, { status: 400 });
		}

		if (!['auto_approved', 'rejected'].includes(status)) {
			return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
		}

		const authHeader = req.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
		if (!token) {
			return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
		}

		const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
		if (userError || !userData?.user) {
			return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
		}

		const userId = userData.user.id;

		// Sicherstellen, dass der aktuelle User der Besitzer des Brews ist
		const { data: brew, error: brewError } = await supabaseAdmin
			.from('brews')
			.select('id, user_id')
			.eq('id', brewId)
			.single();

		if (brewError || !brew) {
			return NextResponse.json({ error: 'Brew nicht gefunden' }, { status: 404 });
		}

		if (brew.user_id !== userId) {
			return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
		}

		const { error: updateError } = await supabaseAdmin
			.from('ratings')
			.update({ moderation_status: status })
			.eq('id', ratingId)
			.eq('brew_id', brewId);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true, status });
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Unbekannter Fehler' }, { status: 500 });
	}
}
