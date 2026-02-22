import { NextRequest, NextResponse } from 'next/server';
import { searchForumThreads } from '@/lib/forum-service';
import { checkRateLimit, FORUM_SEARCH_LIMIT } from '@/lib/api-rate-limit';

export async function GET(request: NextRequest) {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
    const { success } = checkRateLimit(`forum-search:${ip}`, FORUM_SEARCH_LIMIT);
    if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const q = request.nextUrl.searchParams.get('q') ?? '';

    if (!q || q.trim().length < 2) {
        return NextResponse.json({ threads: [], posts: [] });
    }

    try {
        const results = await searchForumThreads(q);
        return NextResponse.json(results);
    } catch {
        return NextResponse.json({ threads: [], posts: [] });
    }
}
