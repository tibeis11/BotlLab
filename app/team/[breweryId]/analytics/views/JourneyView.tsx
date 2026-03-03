// ============================================================================
// Phase 13 — Journey View
// Analytics section: Flaschen-Reise-Tracking (enterprise only)
// ============================================================================

import BottleJourneyCard from '../components/BottleJourneyCard';
import type { UserTier } from '@/lib/analytics-tier-features';

interface JourneyViewProps {
  breweryId: string;
  userTier: UserTier;
}

export default function JourneyView({ breweryId, userTier }: JourneyViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <BottleJourneyCard breweryId={breweryId} userTier={userTier} />
    </div>
  );
}
