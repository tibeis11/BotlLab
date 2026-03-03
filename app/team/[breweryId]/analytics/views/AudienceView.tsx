// ============================================================================
// Phase 13 — Audience View
// Loyalty breakdown + Seasonality index per brew.
// ============================================================================

import LoyaltySegmentChart from '../components/LoyaltySegmentChart';
import SeasonalitySparkline from '../components/SeasonalitySparkline';
import ScanIntentChart from '../components/ScanIntentChart';
import type { UserTier } from '@/lib/analytics-tier-features';

interface AudienceViewProps {
  brews: Array<{ id: string; name: string; style: string }>;
  breweryId: string;
  userTier: UserTier;
}

export default function AudienceView({ brews, breweryId, userTier }: AudienceViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Phase 13.4 — Loyalty Segment Chart */}
      <LoyaltySegmentChart brews={brews} breweryId={breweryId} userTier={userTier} />

      {/* Two-column grid for secondary charts on wider screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Phase 13.5 — Seasonality Sparkline */}
        <SeasonalitySparkline brews={brews} userTier={userTier} />

        {/* Phase 9.7 — Scan Intent Breakdown */}
        <ScanIntentChart breweryId={breweryId} userTier={userTier} />
      </div>
    </div>
  );
}
