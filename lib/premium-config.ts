export type SubscriptionTier = "free" | "brewer" | "brewery" | "enterprise";

export interface TierFeatures {
  ai_generations_per_month: number; // -1 = unlimited
  custom_brewery_slogan: boolean;
  brewery_logo_on_labels: boolean;
  bypass_brew_limits: boolean;
  bypass_bottle_limits: boolean;
  priority_support: boolean;
  analytics_access: boolean;
}

export interface TierConfig {
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year" | "lifetime";
  features: TierFeatures;
  badge_color: string;
  badge_icon: string;
}

export interface PremiumStatus {
  tier: SubscriptionTier;
  status: "active" | "cancelled" | "expired" | "trial" | "paused";
  features: {
    aiGenerationsRemaining: number;
    canUseCustomSlogan: boolean;
    canUseBreweryLogo: boolean;
    bypassBrewLimits: boolean;
    bypassBottleLimits: boolean;
  };
  expiresAt: Date | null;
}

export function getTierBorderColor(tier?: string | null): string {
  if (!tier) return 'border-zinc-500'; // Default/Free (Lehrling) => Gray
  if (tier === 'free') return 'border-zinc-500';
  if (tier === 'brewer') return 'border-blue-500'; // Geselle => Blue
  if (tier === 'brewery') return 'border-amber-500'; // Meister => Gold/Amber
  if (tier === 'enterprise') return 'border-purple-500'; // Legende => Purple
  return 'border-zinc-500';
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: "Free",
    price: 0,
    currency: "EUR",
    interval: "lifetime",
    badge_color: "bg-zinc-500",
    badge_icon: "🆓",
    features: {
      ai_generations_per_month: 0,
      custom_brewery_slogan: false,
      brewery_logo_on_labels: false,
      bypass_brew_limits: false,
      bypass_bottle_limits: false,
      priority_support: false,
      analytics_access: false,
    },
  },
  brewer: {
    name: "Brewer",
    price: 4.99,
    currency: "EUR",
    interval: "month",
    badge_color: "bg-blue-500",
    badge_icon: "🍺",
    features: {
      ai_generations_per_month: 50,
      custom_brewery_slogan: true,
      brewery_logo_on_labels: false,
      bypass_brew_limits: false,
      bypass_bottle_limits: false,
      priority_support: false,
      analytics_access: true,
    },
  },
  brewery: {
    name: "Brewery",
    price: 14.99,
    currency: "EUR",
    interval: "month",
    badge_color: "bg-amber-500",
    badge_icon: "🏭",
    features: {
      ai_generations_per_month: 200,
      custom_brewery_slogan: true,
      brewery_logo_on_labels: true,
      bypass_brew_limits: true,
      bypass_bottle_limits: true,
      priority_support: true,
      analytics_access: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: 0, // Beta: Kostenlos, später: 49.99
    currency: "EUR",
    interval: "lifetime", // Lifetime für Beta-Tester
    badge_color: "bg-purple-500",
    badge_icon: "🚀",
    features: {
      ai_generations_per_month: -1,
      custom_brewery_slogan: true,
      brewery_logo_on_labels: true,
      bypass_brew_limits: true,
      bypass_bottle_limits: true,
      priority_support: true,
      analytics_access: true,
    },
  },
};
