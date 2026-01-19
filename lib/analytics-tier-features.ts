import { supabase } from '@/lib/supabase';

export type UserTier = 'free' | 'brewer' | 'brewery' | 'enterprise';

export interface AnalyticsFeatures {
  hasAccess: boolean;
  maxDays: number;
  maxTopBrews: number;
  maxTopCountries: number;
  canExport: boolean;
  hasAdvancedFilters: boolean;
  hasHeatmaps: boolean;
  hasTimeToGlass: boolean;
}

export const ANALYTICS_TIER_FEATURES: Record<UserTier, AnalyticsFeatures> = {
  free: {
    hasAccess: false,
    maxDays: 0,
    maxTopBrews: 0,
    maxTopCountries: 0,
    canExport: false,
    hasAdvancedFilters: false,
    hasHeatmaps: false,
    hasTimeToGlass: false,
  },
  brewer: {
    hasAccess: true,
    maxDays: 30,
    maxTopBrews: 3,
    maxTopCountries: 5,
    canExport: false,
    hasAdvancedFilters: false,
    hasHeatmaps: false,
    hasTimeToGlass: false,
  },
  brewery: {
    hasAccess: true,
    maxDays: 90,
    maxTopBrews: 10,
    maxTopCountries: 999,
    canExport: true,
    hasAdvancedFilters: true,
    hasHeatmaps: false, // Phase 3
    hasTimeToGlass: false, // Phase 3
  },
  enterprise: {
    hasAccess: true,
    maxDays: 365,
    maxTopBrews: 999,
    maxTopCountries: 999,
    canExport: true,
    hasAdvancedFilters: true,
    hasHeatmaps: true, // Phase 3
    hasTimeToGlass: true, // Phase 3
  },
};

/**
 * Get analytics features for a specific brewery owner
 */
export async function getBreweryAnalyticsAccess(breweryId: string): Promise<{
  tier: UserTier;
  features: AnalyticsFeatures;
  error?: string;
}> {
  try {
    // Get brewery owner
    const { data: brewery, error: breweryError } = await supabase
      .from('breweries')
      .select('id')
      .eq('id', breweryId)
      .single();

    if (breweryError || !brewery) {
      return {
        tier: 'free',
        features: ANALYTICS_TIER_FEATURES.free,
        error: 'Brewery not found',
      };
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        tier: 'free',
        features: ANALYTICS_TIER_FEATURES.free,
        error: 'Not authenticated',
      };
    }

    // Check if user is brewery owner
    const { data: membership, error: memberError } = await supabase
      .from('brewery_members')
      .select('role')
      .eq('brewery_id', breweryId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return {
        tier: 'free',
        features: ANALYTICS_TIER_FEATURES.free,
        error: 'Access denied - Owner only',
      };
    }

    // Get user tier from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = (profile?.subscription_tier || 'free') as UserTier;
    
    return {
      tier,
      features: ANALYTICS_TIER_FEATURES[tier],
    };
  } catch (e) {
    console.error('[Analytics] Access check error:', e);
    return {
      tier: 'free',
      features: ANALYTICS_TIER_FEATURES.free,
      error: 'Error checking access',
    };
  }
}

/**
 * Get available time ranges for a tier
 */
export function getAvailableTimeRanges(tier: UserTier): Array<{ value: '7d' | '30d' | '90d' | 'all'; label: string; locked?: boolean }> {
  const features = ANALYTICS_TIER_FEATURES[tier];
  const maxDays = features.maxDays;

  return [
    { value: '7d', label: '7 Tage', locked: maxDays < 7 },
    { value: '30d', label: '30 Tage', locked: maxDays < 30 },
    { value: '90d', label: '90 Tage', locked: maxDays < 90 },
    { value: 'all', label: 'Alle', locked: maxDays < 365 },
  ];
}
