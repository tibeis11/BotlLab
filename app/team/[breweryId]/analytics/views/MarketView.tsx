// ============================================================================
// Phase 14 — Market Intelligence View
// Aggregates 14.1 Local Trend Radar, 14.2 Cross-Consumption, 14.3 Style Seasonality
// ============================================================================

import LocalTrendRadarCard from '../components/LocalTrendRadarCard';
import CrossConsumptionCard from '../components/CrossConsumptionCard';
import StyleSeasonalityCard from '../components/StyleSeasonalityCard';
import type { UserTier } from '@/lib/analytics-tier-features';

interface MarketViewProps {
  breweryId: string;
  userTier: UserTier;
}

export default function MarketView({ breweryId, userTier }: MarketViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 14.1 — Local Trend Radar (full width — radar chart) */}
      <LocalTrendRadarCard breweryId={breweryId} userTier={userTier} />

      {/* Two-column grid for secondary cards on wider screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 14.3 — Style Seasonality */}
        <StyleSeasonalityCard userTier={userTier} />

        {/* 14.2 — Cross-Consumption (Enterprise-only) */}
        <CrossConsumptionCard breweryId={breweryId} userTier={userTier} />
      </div>
    </div>
  );
}
