export type TierName = 'hobby' | 'craft' | 'meister' | 'braumeister';

export interface TierConfig {
  name: TierName;
  displayName: string;
  icon: string;
  color: string;
  limits: {
    maxBrews: number;
    maxBottles: number;
  };
  requirements: {
    daysActive: number;
    totalFills: number;
    totalViews: number;
    brewsCreated: number;
  };
  benefits: string[];
}

export const TIER_CONFIGS: Record<TierName, TierConfig> = {
  hobby: {
    name: 'hobby',
    displayName: 'Hobby Brauer',
    icon: '🍺',
    color: '#71717a', // zinc-500
    limits: {
      maxBrews: 5,
      maxBottles: 50,
    },
    requirements: {
      daysActive: 0,
      totalFills: 0,
      totalViews: 0,
      brewsCreated: 0,
    },
    benefits: [
      'Bis zu 5 Rezepte',
      'Bis zu 50 Flaschen',
      'QR-Code Generator',
      'Basis Profil',
    ],
  },
  craft: {
    name: 'craft',
    displayName: 'Craft Brauer',
    icon: '🎯',
    color: '#06b6d4', // cyan-500 / brand
    limits: {
      maxBrews: 20,
      maxBottles: 150,
    },
    requirements: {
      daysActive: 90, // 3 Monate
      totalFills: 30,
      totalViews: 50,
      brewsCreated: 3,
    },
    benefits: [
      'Bis zu 20 Rezepte',
      'Bis zu 150 Flaschen',
      'Erweiterte Statistiken',
      'Prioritäts-Support',
    ],
  },
  meister: {
    name: 'meister',
    displayName: 'Meister Brauer',
    icon: '⭐',
    color: '#eab308', // yellow-500
    limits: {
      maxBrews: 50,
      maxBottles: 500,
    },
    requirements: {
      daysActive: 180, // 6 Monate
      totalFills: 100,
      totalViews: 200,
      brewsCreated: 10,
    },
    benefits: [
      'Bis zu 50 Rezepte',
      'Bis zu 500 Flaschen',
      'Premium Badge',
      'Branding Optionen',
      'Analytics Dashboard',
    ],
  },
  braumeister: {
    name: 'braumeister',
    displayName: 'Braumeister',
    icon: '👑',
    color: '#8b5cf6', // violet-500
    limits: {
      maxBrews: 999999,
      maxBottles: 999999,
    },
    requirements: {
      daysActive: 365, // 12 Monate
      totalFills: 300,
      totalViews: 1000,
      brewsCreated: 25,
    },
    benefits: [
      'Unbegrenzte Rezepte',
      'Unbegrenzte Flaschen',
      'Exklusives Badge',
      'API Zugang',
      'White-Label Optionen',
      'Vorschau auf neue Features',
    ],
  },
};

export function getTierConfig(tierName: TierName): TierConfig {
  return TIER_CONFIGS[tierName];
}

export function getNextTier(currentTier: TierName): TierConfig | null {
  const tiers: TierName[] = ['hobby', 'craft', 'meister', 'braumeister'];
  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex >= tiers.length - 1) return null;
  return TIER_CONFIGS[tiers[currentIndex + 1]];
}

export function calculateTierProgress(
  currentTier: TierName,
  daysActive: number,
  totalFills: number,
  totalViews: number,
  brewsCreated: number
): { progress: number; unlockedRequirements: number; totalRequirements: number } {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) {
    return { progress: 100, unlockedRequirements: 4, totalRequirements: 4 };
  }

  const reqs = nextTier.requirements;
  const checks = [
    daysActive >= reqs.daysActive,
    totalFills >= reqs.totalFills,
    totalViews >= reqs.totalViews,
    brewsCreated >= reqs.brewsCreated,
  ];

  const unlockedRequirements = checks.filter(Boolean).length;
  const progress = (unlockedRequirements / checks.length) * 100;

  return { progress, unlockedRequirements, totalRequirements: checks.length };
}

export function checkTierUpgrade(
  currentTier: TierName,
  daysActive: number,
  totalFills: number,
  totalViews: number,
  brewsCreated: number
): TierName {
  const tiers: TierName[] = ['hobby', 'craft', 'meister', 'braumeister'];
  const currentIndex = tiers.indexOf(currentTier);

  // Check from current tier upwards
  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tier = tiers[i];
    const config = TIER_CONFIGS[tier];
    const reqs = config.requirements;

    if (
      daysActive >= reqs.daysActive &&
      totalFills >= reqs.totalFills &&
      totalViews >= reqs.totalViews &&
      brewsCreated >= reqs.brewsCreated
    ) {
      // Qualifies for this tier, continue checking higher
      continue;
    } else {
      // Does not qualify, return previous tier
      return tiers[i - 1];
    }
  }

  // Qualified for all tiers
  return 'braumeister';
}

export function getDaysActive(joinedAt: string): number {
  const joined = new Date(joinedAt);
  const now = new Date();
  const diffMs = now.getTime() - joined.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
