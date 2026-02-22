import { NextRequest, NextResponse } from 'next/server';
import { getPosts, getVotesForThread } from '@/lib/forum-service';
import { checkRateLimit, FORUM_THREADS_LIMIT } from '@/lib/api-rate-limit';

const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
    const { success } = checkRateLimit(`forum-posts:${ip}`, FORUM_THREADS_LIMIT);
    if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = req.nextUrl;
    const threadId = searchParams.get('threadId');
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10) || 30));
    const userId = searchParams.get('userId') ?? undefined;

    if (!threadId) {
        return NextResponse.json({ error: 'threadId required' }, { status: 400 });
    }

    try {
        const posts = await getPosts(threadId, limit, offset);
        const postIds = posts.map((p: any) => p.id);

        // Also fetch vote counts for these posts
        const { voteCounts, userVotes } = await getVotesForThread(threadId, postIds, userId);

        return NextResponse.json({
            posts,
            voteCounts,
            userVotes: Array.from(userVotes),
        });
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
