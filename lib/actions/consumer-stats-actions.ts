// ZWEI WELTEN Phase 4.3 — Server Action: getConsumerStats
// Optimised single-round-trip fetch for the consumer stats card
'use server';

import { createClient } from '@/lib/supabase-server';

export interface ConsumerStatsResult {
  totalCaps: number;
  uniqueBreweries: number;
  totalRatings: number;
  averageRating: number | null;
  tastingIq: number;
  forumPosts: number;
  memberSince: string;
}

export async function getConsumerStats(userId: string): Promise<ConsumerStatsResult> {
  const supabase = await createClient();

  const [capsRes, ratingsRes, forumRes, profileRes] = await Promise.all([
    // Collected caps with brewery FK for distinct brewery count
    supabase
      .from('collected_caps')
      .select('id, brews(brewery_id)')
      .eq('user_id', userId),

    // Ratings given by user
    supabase
      .from('ratings')
      .select('rating')
      .eq('user_id', userId)
      .eq('moderation_status', 'auto_approved'),

    // Forum activity (threads + posts)
    Promise.all([
      supabase
        .from('forum_threads')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId),
      supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .is('deleted_at', null),
    ]),

    // Profile for tasting_iq + joined_at
    supabase
      .from('profiles')
      .select('tasting_iq, joined_at')
      .eq('id', userId)
      .single(),
  ]);

  // Total caps
  const totalCaps = capsRes.data?.length ?? 0;

  // Unique breweries from caps
  const uniqueBreweries = new Set(
    (capsRes.data ?? [])
      .map((c) => {
        const b = c.brews as { brewery_id: string | null } | null;
        return b?.brewery_id;
      })
      .filter(Boolean)
  ).size;

  // Rating stats
  const ratings = ratingsRes.data ?? [];
  const totalRatings = ratings.length;
  const averageRating =
    totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : null;

  // Forum
  const [threadsCount, postsCount] = forumRes;
  const forumPosts = (threadsCount.count ?? 0) + (postsCount.count ?? 0);

  return {
    totalCaps,
    uniqueBreweries,
    totalRatings,
    averageRating,
    tastingIq: profileRes.data?.tasting_iq ?? 0,
    forumPosts,
    memberSince: profileRes.data?.joined_at ?? new Date().toISOString(),
  };
}
