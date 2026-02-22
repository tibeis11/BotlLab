import { NextRequest, NextResponse } from 'next/server';
import { getThreadsByCategory } from '@/lib/forum-service';
import { checkRateLimit, FORUM_THREADS_LIMIT } from '@/lib/api-rate-limit';

const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
    const { success } = checkRateLimit(`forum-threads:${ip}`, FORUM_THREADS_LIMIT);
    if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = req.nextUrl;
    const categoryId = searchParams.get('categoryId');
    const sort = (searchParams.get('sort') ?? 'new') as 'new' | 'top' | 'replies' | 'unanswered' | 'solved';
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
    const limit  = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
    const tag    = searchParams.get('tag') ?? undefined;

    if (!categoryId) {
        return NextResponse.json({ error: 'categoryId required' }, { status: 400 });
    }

    try {
        const threads = await getThreadsByCategory(categoryId, sort, limit, offset, tag);
        return NextResponse.json({ threads });
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
