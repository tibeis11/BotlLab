import { NextRequest, NextResponse } from 'next/server';
import { incrementViewCount } from '@/lib/forum-service';
import { checkRateLimit, FORUM_VIEW_LIMIT } from '@/lib/api-rate-limit';

export async function POST(req: NextRequest) {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
    const { success } = checkRateLimit(`forum-view:${ip}`, FORUM_VIEW_LIMIT);
    if (!success) {
        return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
    }

    try {
        const { threadId } = await req.json();
        if (!threadId || typeof threadId !== 'string') {
            return NextResponse.json({ ok: false, error: 'Missing threadId' }, { status: 400 });
        }
        await incrementViewCount(threadId);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
