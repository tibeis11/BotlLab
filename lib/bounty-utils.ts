// ============================================================================
// Bounty display helpers — pure sync utils (NOT server actions)
// Kept separate from bounty-actions.ts because Next.js requires all exports
// from a 'use server' file to be async functions.
// ============================================================================

import type { ConditionType, RewardType } from './actions/bounty-actions';

export function formatCondition(type: ConditionType, value: number): string {
  switch (type) {
    case 'match_score':
      return `>${value}% Match in Beat the Brewer`;
    case 'vibe_check':
      return `Vibe Check abgeben`;
    case 'rating_count':
      return `${value} Bewertungen abgeben`;
    default:
      return `Bedingung: ${value}`;
  }
}

export function formatRewardType(type: RewardType): string {
  switch (type) {
    case 'discount': return '💰 Rabatt';
    case 'free_beer': return '🍺 Freibier';
    case 'merchandise': return '👕 Merchandise';
    case 'other': return '🎁 Reward';
  }
}
