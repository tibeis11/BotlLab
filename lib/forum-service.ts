import { createClient } from '@/lib/supabase-server';

export async function getForumCategories() {
    const supabase = await createClient();
    const { data } = await supabase.from('forum_categories').select('*').order('sort_order');
    return data || [];
}

export async function getRecentThreads(limit = 5) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('forum_threads')
        .select(`
            *,
            category:forum_categories(title, slug),
            author:profiles(id, display_name, avatar_url:logo_url, tier, subscription_tier),
            posts:forum_posts(count)
        `)
        .order('last_reply_at', { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error("Error fetching recent threads:", JSON.stringify(error, null, 2));
        // Fallback: try fetching without relations if relations are causing issues (e.g. RLS on profiles)
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('forum_threads')
            .select('*')
            .order('last_reply_at', { ascending: false })
            .limit(limit);
            
        if (!fallbackError) {
             return fallbackData || [];
        }
    }

    // Map posts count to reply_count (replies + 1 for OP)
    return (data || []).map((thread: any) => ({
        ...thread,
        reply_count: (thread.posts?.[0]?.count || 0) + 1
    }));
}


export async function getCategory(slug: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('forum_categories').select('*').eq('slug', slug).single();
    return data;
}

export async function getThreadsByCategory(categoryId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_threads')
        .select(`
            *,
            author:profiles(id, display_name, avatar_url:logo_url, tier, subscription_tier),
            category:forum_categories(title, slug),
            posts:forum_posts(count)
        `)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('last_reply_at', { ascending: false });

    // Map posts count to reply_count (replies + 1 for OP)
    return (data || []).map((thread: any) => ({
        ...thread,
        reply_count: (thread.posts?.[0]?.count || 0) + 1
    }));
}

export async function getThread(id: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_threads')
        .select(`
            *,
            author:profiles(id, display_name, avatar_url:logo_url, tier, subscription_tier),
            category:forum_categories(*),
            brew:brews(id, name, image_url, moderation_status, brewery_id, brewery:breweries(name))
        `)
        .eq('id', id)
        .single();
    return data;
}

export async function getPosts(threadId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_posts')
        .select(`
            *,
            author:profiles(id, display_name, avatar_url:logo_url, tier, joined_at, subscription_tier)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
    return data || [];
}

export async function getUserForumActivity(userId: string) {
    const supabase = await createClient();
    
    // 1. Threads created by user
    const { data: ownThreads } = await supabase
        .from('forum_threads')
        .select(`
            *,
            category:forum_categories(title, slug)
        `)
        .eq('author_id', userId)
        .order('last_reply_at', { ascending: false })
        .limit(5);

    return ownThreads || [];
}

export async function getThreadByBrewId(brewId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('forum_threads')
        .select(`
            *,
            posts:forum_posts(count)
        `)
        .eq('brew_id', brewId)
        .maybeSingle();

    if (data) {
        return {
            ...data,
            reply_count: (data.posts?.[0]?.count || 0) + 1
        };
    }
    return null;
}
