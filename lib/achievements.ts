import { supabase } from '@/lib/supabase';

export type AchievementCategory = 'brewing' | 'social' | 'quality' | 'milestone';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  points: number;
  created_at?: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievements?: Achievement;
}

/**
 * Prüft und vergibt Achievements für einen User basierend auf seinen Stats
 */
export async function checkAndGrantAchievements(userId: string) {
  // Stats des Users laden
  const { data: brews } = await supabase
    .from('brews')
    .select('id, is_public, remix_parent_id, brewery_id')
    .eq('user_id', userId);

  const { data: bottles } = await supabase
    .from('bottles')
    .select('id')
    .eq('user_id', userId);

  const { data: ratings } = await supabase
    .from('ratings')
    .select('rating, brew_id, brews!inner(user_id)')
    .eq('brews.user_id', userId);

  const { data: squadMemberships } = await supabase
    .from('brewery_members')
    .select('brewery_id, role')
    .eq('user_id', userId);

  const { count: threadCount } = await supabase.from('forum_threads').select('*', { count: 'exact', head: true }).eq('author_id', userId);
  const { count: postCount } = await supabase.from('forum_posts').select('*', { count: 'exact', head: true }).eq('author_id', userId);

  const brewCount = brews?.length || 0;
  const publicBrewCount = brews?.filter(b => b.is_public).length || 0;
  const remixCount = brews?.filter(b => b.remix_parent_id).length || 0;
  const teamBrewCount = brews?.filter(b => !!b.brewery_id).length || 0;
  const bottleCount = bottles?.length || 0;
  const ratingCount = ratings?.length || 0;
  const squadCount = squadMemberships?.length || 0;

  let maxSquadSize = 0;
  if(squadMemberships && squadMemberships.length > 0) {
      const breweryIds = squadMemberships.map(m => m.brewery_id);
      // Helper to find max squad size
      for (const bId of breweryIds) {
          const { count } = await supabase.from('brewery_members').select('*', { count: 'exact', head: true }).eq('brewery_id', bId);
          if (count && count > maxSquadSize) maxSquadSize = count;
      }
  }

  // Höchste Bewertung berechnen
  const brewRatings: { [key: string]: number[] } = {};
  ratings?.forEach(r => {
    if (!brewRatings[r.brew_id]) brewRatings[r.brew_id] = [];
    brewRatings[r.brew_id].push(r.rating);
  });
  const highestAvg = Math.max(
    0,
    ...Object.values(brewRatings).map(arr => 
      arr.reduce((sum, r) => sum + r, 0) / arr.length
    )
  );

  // Achievement-IDs die vergeben werden sollen
  const toGrant: string[] = [];

  // Brewing Achievements
  if (brewCount >= 1) toGrant.push('first_brew');
  if (publicBrewCount >= 1) toGrant.push('public_creator');
  if (remixCount >= 1) toGrant.push('remix_master');
  if (bottleCount >= 1) toGrant.push('first_bottle');

  // Milestone Achievements
  if (brewCount >= 10) toGrant.push('collector_10');
  if (brewCount >= 25) toGrant.push('collector_25');
  if (brewCount >= 50) toGrant.push('collector_50');
  if (bottleCount >= 50) toGrant.push('bottler_50');
  if (bottleCount >= 100) toGrant.push('bottler_100');

  // Quality Achievements
  if (highestAvg >= 4.5) toGrant.push('top_rated');

  // Forum Achievements
  if ((threadCount || 0) >= 1) toGrant.push('forum_voice');
  if ((threadCount || 0) >= 10) toGrant.push('forum_starter');
  if ((postCount || 0) >= 50) toGrant.push('forum_pillar');

  // Social Achievements
  if (ratingCount >= 50) toGrant.push('popular_50');
  if (ratingCount >= 100) toGrant.push('popular_100');

  // New Squad Achievements
  if (squadMemberships) {
      if (squadMemberships.length > 0) toGrant.push('team_player');
      if (squadMemberships.some(m => m.role === 'owner')) toGrant.push('squad_founder');
  }
  if (teamBrewCount >= 1) toGrant.push('team_brewer');
  if (maxSquadSize >= 3) toGrant.push('squad_growth');

  // Bereits freigeschaltete Achievements laden
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const existingIds = new Set(existing?.map(e => e.achievement_id) || []);

  // Nur neue Achievements vergeben
  const newAchievements = toGrant.filter(id => !existingIds.has(id));

  if (newAchievements.length > 0) {
    const { error } = await supabase
      .from('user_achievements')
      .insert(
        newAchievements.map(achievement_id => ({
          user_id: userId,
          achievement_id,
        }))
      );

    if (error) {
      console.error('Error granting achievements:', error);
      return [];
    }

    // Lade die vollen Achievement-Details für die neuen Achievements
    const { data: achievementDetails } = await supabase
      .from('achievements')
      .select('*')
      .in('id', newAchievements);

    return achievementDetails || [];
  }

  return [];
}

/**
 * Lädt alle Achievements eines Users
 */
export async function getUserAchievements(userId: string) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievements(*)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('Error loading user achievements:', JSON.stringify(error, null, 2));
    return [];
  }

  return data as UserAchievement[];
}

/**
 * Lädt alle verfügbaren Achievements
 */
export async function getAllAchievements() {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('points', { ascending: true });

  if (error) {
    console.error('Error loading all achievements:', JSON.stringify(error, null, 2));
    return [];
  }

  return data as Achievement[];
}

/**
 * Tier-Farben für die UI
 */
export function getTierColor(tier: AchievementTier): string {
  switch (tier) {
    case 'bronze': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    case 'silver': return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    case 'gold': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'platinum': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
}
