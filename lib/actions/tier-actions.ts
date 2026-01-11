'use server';

import { createClient } from '@supabase/supabase-js';
import { checkTierUpgrade, getDaysActive } from '../tier-system';

// Server-side Tier Update nach wichtigen Aktionen
export async function updateUserTier(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Profil laden
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier, total_bottle_fills, total_profile_views, joined_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Could not load profile for tier check:', profileError);
      return;
    }

    // Rezepte zählen
    const { count: brewsCount } = await supabase
      .from('brews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Tage seit Anmeldung
    const daysActive = getDaysActive(profile.joined_at);

    // Prüfen ob Upgrade möglich
    const newTier = checkTierUpgrade(
      profile.tier,
      {
        daysActive,
        bottlesScanned: profile.total_bottle_fills || 0,
        globalCheers: profile.total_profile_views || 0
      }
    );

    // Wenn Tier sich geändert hat, update
    if (newTier && newTier !== profile.tier) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ tier: newTier })
        .eq('id', userId);

      if (updateError) {
        console.error('Could not update tier:', updateError);
      } else {
        console.log(`🎉 User ${userId} upgraded from ${profile.tier} to ${newTier}!`);
      }
    }
  } catch (err) {
    console.error('Error in updateUserTier:', err);
  }
}
