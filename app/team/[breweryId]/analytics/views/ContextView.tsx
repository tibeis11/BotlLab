import { MapPin } from 'lucide-react';
import WeatherCorrelationChart from '../components/WeatherCorrelationChart';
import BottleJourneyCard from '../components/BottleJourneyCard';
import type { UserTier } from '@/lib/analytics-tier-features';

interface ContextViewProps {
  breweryId: string;
  userTier?: UserTier;
  startDate?: string;
  endDate?: string;
}

export default function ContextView({ breweryId, userTier = 'free', startDate, endDate }: ContextViewProps) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <MapPin size={18} className="text-purple-400 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Kontext & Umgebung</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Wie Wetter, Ort und Zeitpunkt das Scan-Verhalten beeinflussen.
          </p>
        </div>
      </div>

      {/* Two-column grid on wider screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Phase 8: Weather Correlation */}
        <WeatherCorrelationChart
          breweryId={breweryId}
          userTier={userTier}
          startDate={startDate}
          endDate={endDate}
        />

        {/* Phase 13: Bottle Journey (merged from Journey tab) */}
        <BottleJourneyCard breweryId={breweryId} userTier={userTier} />
      </div>
    </div>
  );
}
