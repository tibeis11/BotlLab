import BatchComparisonCard from '../components/BatchComparisonCard';
import OffFlavorAlertBanner from '../components/OffFlavorAlertBanner';
import ShelfLifeChart from '../components/ShelfLifeChart';
import TasteProfileTrendChart from '../components/TasteProfileTrendChart';
import type { UserTier } from '@/lib/analytics-tier-features';

interface QualityViewProps {
  brews: Array<{ id: string; name: string; style: string }>;
  breweryId: string;
  userTier: UserTier;
}

export default function QualityView({ brews, breweryId, userTier }: QualityViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Phase 5.3 — Off-Flavor Frühwarnsystem */}
      <OffFlavorAlertBanner breweryId={breweryId} userTier={userTier} />

      {/* Two-column grid for chart cards on wider screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Phase 4.5 — Batch A/B Testing */}
        <BatchComparisonCard brews={brews} userTier={userTier} />

        {/* Phase 5.4 — Shelf-Life / Degradationskurve */}
        <ShelfLifeChart brews={brews} userTier={userTier} />
      </div>

      {/* Phase 5.2 — Geschmackstrend (full width — timeline chart) */}
      <TasteProfileTrendChart brewOptions={brews} userTier={userTier} />
    </div>
  );
}
