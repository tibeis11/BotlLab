// ============================================================================
// Leaderboard — Consumer Page (Phase 11.4)
// Server Component: Fetches top users by tasting IQ
// ============================================================================

import { getLeaderboard, getTastingIQ } from '@/lib/actions/beat-the-brewer-actions';
import LeaderboardClient from './LeaderboardClient';

export default async function LeaderboardPage() {
  const [entries, myStats] = await Promise.all([
    getLeaderboard(50),
    getTastingIQ(),
  ]);

  return <LeaderboardClient entries={entries} myStats={myStats} />;
}
