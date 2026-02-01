export type BreweryTierName = 'garage' | 'micro' | 'craft' | 'industrial';

export interface BreweryTierConfig {
  name: BreweryTierName;
  displayName: string;
  icon: string;
  color: string;
  limits: {
    maxBrews: number;
    maxBottles: number;
    maxMembers: number;
    maxLabels: number;
  };
  requirements: {
    totalFills: number;
    teamPosts: number;
    activeMembers: number;
  };
  benefits: string[];
}

export const BREWERY_TIERS: Record<BreweryTierName, BreweryTierConfig> = {
  garage: {
    name: 'garage',
    displayName: 'Garage Brewery',
    icon: '🏚️',
    color: '#a1a1aa', // zinc-400
    limits: {
      maxBrews: 5,
      maxBottles: 50,
      maxMembers: 2,
      maxLabels: 1
    },
    requirements: {
      totalFills: 0,
      teamPosts: 0,
      activeMembers: 1
    },
    benefits: [
      '5 Rezepte',
      '50 Flaschen',
      'Bis zu 2 Mitglieder'
    ]
  },
  micro: {
    name: 'micro',
    displayName: 'Micro Brewery',
    icon: '🏠',
    color: '#34d399', // emerald-400
    limits: {
      maxBrews: 20,
      maxBottles: 200,
      maxMembers: 5,
      maxLabels: 3
    },
    requirements: {
      totalFills: 50,
      teamPosts: 10,
      activeMembers: 2
    },
    benefits: [
      '20 Rezepte',
      '200 Flaschen',
      'Bis zu 5 Mitglieder',
      'Erweiterte Statistiken'
    ]
  },
  craft: {
    name: 'craft',
    displayName: 'Craft Brewery',
    icon: '🏭',
    color: '#f472b6', // pink-400
    limits: {
      maxBrews: 999999, // Unlimited
      maxBottles: 1000,
      maxMembers: 10,
      maxLabels: 5
    },
    requirements: {
      totalFills: 500,
      teamPosts: 50,
      activeMembers: 3
    },
    benefits: [
      'Unlimitierte Rezepte',
      '1000 Flaschen',
      'Bis zu 10 Mitglieder',
      'Branding Optionen (Logo auf PDF)'
    ]
  },
  industrial: {
    name: 'industrial',
    displayName: 'Industrial Brewery',
    icon: '🏙️',
    color: '#60a5fa', // blue-400
    limits: {
      maxBrews: 999999,
      maxBottles: 999999,
      maxMembers: 50,
      maxLabels: 10
    },
    requirements: {
      totalFills: 2000,
      teamPosts: 200,
      activeMembers: 5
    },
    benefits: [
      'Alles Unlimitiert',
      'API Zugang (Bald)',
      'Verified Badge'
    ]
  }
};

// --- Individual Reputation System ---

export type ReputationLevelName = 'lehrling' | 'geselle' | 'meister' | 'legende';

export interface ReputationLevelConfig {
  name: ReputationLevelName;
  displayName: string;
  icon: string;
  color: string;
  avatarPath: string; // New: Tier-based Avatar
  requirements: {
    daysActive: number;
    bottlesScanned: number;
    globalCheers: number;
  };
  benefits: string[]; // Renamed from rewards to match old interface logic easier
}

export const REPUTATION_LEVELS: Record<ReputationLevelName, ReputationLevelConfig> = {
  lehrling: {
    name: 'lehrling',
    displayName: 'Lehrling',
    icon: '🧹',
    color: '#71717a',
    avatarPath: '/tiers/lehrling.png',
    requirements: {
      daysActive: 0,
      bottlesScanned: 0,
      globalCheers: 0
    },
    benefits: [
      'Titel: "Lehrling"',
      'Start-Avatar'
    ]
  },
  geselle: {
    name: 'geselle',
    displayName: 'Geselle',
    icon: '🍺',
    color: '#fbbf24', // amber-400
    avatarPath: '/tiers/geselle.png',
    requirements: {
      daysActive: 30,
      bottlesScanned: 50,
      globalCheers: 10
    },
    benefits: [
      'Titel: "Geselle"',
      'Neuer Avatar: "Braukessel"'
    ]
  },
  meister: {
    name: 'meister',
    displayName: 'Meister',
    icon: '🎓',
    color: '#22d3ee', // cyan-400
    avatarPath: '/tiers/meister.png',
    requirements: {
      daysActive: 180,
      bottlesScanned: 200,
      globalCheers: 50
    },
    benefits: [
      'Titel: "Meister"',
      'Neuer Avatar: "Goldenes Glas"',
      'Doppelte Vote-Power (Bald)'
    ]
  },
  legende: {
    name: 'legende',
    displayName: 'Legende',
    icon: '👑',
    color: '#a78bfa', // violet-400
    avatarPath: '/tiers/legende.png',
    requirements: {
      daysActive: 365,
      bottlesScanned: 1000,
      globalCheers: 500
    },
    benefits: [
      'Titel: "Legende"',
      'Neuer Avatar: "Krone"',
      'Hall of Fame Eintrag'
    ]
  }
};

// --- Backward Compatibility & Helpers ---

// Legacy mapping removed. Using ReputationLevelName directly.
export type TierName = ReputationLevelName;

export function getTierConfig(tierName: string): ReputationLevelConfig {
  // Check if the tier exists in the known levels
  const lowerName = tierName.toLowerCase() as ReputationLevelName;
  return REPUTATION_LEVELS[lowerName] || REPUTATION_LEVELS['lehrling'];
}

export function getBreweryTierConfig(tier: BreweryTierName) {
    return BREWERY_TIERS[tier] || BREWERY_TIERS['garage'];
}
export function getDaysActive(joinedAt: string) {
    const start = new Date(joinedAt).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }
  
  export function getNextTier(currentTier: string): ReputationLevelConfig | null {
    const normalizedCurrent = currentTier.toLowerCase() as ReputationLevelName;
    const tiers: ReputationLevelName[] = ['lehrling', 'geselle', 'meister', 'legende'];
    const currentIndex = tiers.indexOf(normalizedCurrent);
    if (currentIndex === -1 || currentIndex >= tiers.length - 1) return null;
    return getTierConfig(tiers[currentIndex + 1]);
  }
  
  // Updated for Reputation System logic
  export function calculateTierProgress(
    currentTier: string,
    daysActive: number,
    totalFills: number, // Using bottlesScanned logic for individual
    totalViews: number,  // Using globalCheers logic (mapped)
    brewsCreated?: number // Deprecated for individual
  ) {
    const normalizedCurrent = currentTier.toLowerCase() as ReputationLevelName;
    const next = getNextTier(normalizedCurrent);
    
    if (!next) return { progress: 100, unlockedRequirements: 3, totalRequirements: 3 };
  
    const reqs = next.requirements;
    const checks = [
        daysActive >= reqs.daysActive,
        totalFills >= reqs.bottlesScanned,
        totalViews >= reqs.globalCheers
    ];

    const unlockedRequirements = checks.filter(Boolean).length;
    
    return {
      progress: (unlockedRequirements / 3) * 100,
      unlockedRequirements: unlockedRequirements,
      totalRequirements: 3
    };
  }

  export function getNextBreweryTier(currentTier: BreweryTierName): BreweryTierConfig | null {
    const tiers: BreweryTierName[] = ['garage', 'micro', 'craft', 'industrial'];
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex >= tiers.length - 1) return null;
    return getBreweryTierConfig(tiers[currentIndex + 1]);
  }

  export function calculateBreweryTierProgress(
    currentTier: BreweryTierName,
    stats: {
        totalFills: number;
        teamPosts: number;
        activeMembers: number;
    }
  ) {
    const next = getNextBreweryTier(currentTier);
    if (!next) return { progress: 100, unlockedRequirements: 3, totalRequirements: 3 };

    const reqs = next.requirements;
    const checks = [
        stats.totalFills >= reqs.totalFills,
        stats.teamPosts >= reqs.teamPosts,
        stats.activeMembers >= reqs.activeMembers
    ];

    const unlockedRequirements = checks.filter(Boolean).length;

    return {
        progress: (unlockedRequirements / 3) * 100,
        unlockedRequirements: unlockedRequirements,
        totalRequirements: 3
    };
  }

  export function checkTierUpgrade(
    currentTier: string,
    stats: {
      daysActive: number;
      bottlesScanned: number;
      globalCheers: number;
    }
  ): ReputationLevelName | null {
    const next = getNextTier(currentTier);
    if (!next) return null;
  
    const reqs = next.requirements;
    const isReady = 
      stats.daysActive >= reqs.daysActive &&
      stats.bottlesScanned >= reqs.bottlesScanned &&
      stats.globalCheers >= reqs.globalCheers;
  
    return isReady ? next.name : null;
  }
  
  // Re-export interface for compat
  export interface TierConfig extends ReputationLevelConfig {
      // Add missing props from old interface if needed for strict compat, 
      // but UI should adapt to new interface mostly.
      limits?: any; 
  }
