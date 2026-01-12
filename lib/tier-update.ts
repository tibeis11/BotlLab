import { createClient } from '@supabase/supabase-js';
import { checkTierUpgrade, getDaysActive, getTierConfig } from './tier-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function updateUserTier(userId: string): Promise<void> {
  try {
    // Load profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier, total_bottle_fills, total_profile_views, joined_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to load profile for tier check:', profileError);
      return;
    }

    // Count brews created
    const { count: brewsCreated } = await supabase
      .from('brews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const daysActive = getDaysActive(profile.joined_at || new Date().toISOString());
    const totalFills = profile.total_bottle_fills || 0;
    const totalViews = profile.total_profile_views || 0;
    const brewCount = brewsCreated || 0;

    // Calculate new tier
    const newTier = checkTierUpgrade(
      profile.tier || 'lehrling',
      {
        daysActive,
        bottlesScanned: totalFills,
        globalCheers: totalViews
      }
    );

    // Update if changed
    if (newTier && newTier !== profile.tier) {
      const newConfig = getTierConfig(newTier);
      
      await supabase
        .from('profiles')
        .update({ 
            tier: newTier,
            logo_url: newConfig.avatarPath
        })
        .eq('id', userId);

      console.log(`🎉 User ${userId} upgraded to ${newTier}! New Avatar: ${newConfig.avatarPath}`);
    }
  } catch (e) {
    console.error('Tier update failed:', e);
  }
}
