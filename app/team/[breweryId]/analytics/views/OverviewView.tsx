import Link from 'next/link';
import {
  BarChart2, Smartphone, Monitor, Tablet, HelpCircle, ChevronRight, Shield,
} from 'lucide-react';
import type { AnalyticsFeatures, UserTier } from '@/lib/analytics-tier-features';
import DrinkerFunnelCard from '../components/DrinkerFunnelCard';
import AnalyticsMetricCard from '../components/AnalyticsMetricCard';
import BreweryHeatmap from '../components/BreweryHeatmap';
import ScansOverTimeChart from '../components/ScansOverTimeChart';
import PeakHoursChart from '../components/PeakHoursChart';
import ScanSourceBreakdownCard from '../components/ScanSourceBreakdownCard';
import BotlGuideInsightCards from '../components/BotlGuideInsightCards';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsPageData {
  totalScans: number;
  uniqueVisitors: number;
  /** Phase 2: logged-in scans from analytics_daily_stats */
  loggedInScans?: number;
  /** Phase 2: total Kronkorken claimed in period */
  capsClaimed?: number;
  /** Phase 2: unique users who claimed a Kronkorken */
  capCollectors?: number;
  scansByDate: Record<string, { scans: number; unique: number }>;
  scansByCountry: Record<string, number>;
  scansByDevice: Record<string, number>;
  topBrews: Record<string, number>;
  scansByHour?: Record<string, number>;
  geoPoints?: Array<{ lat: number; lng: number }>;
}

interface OverviewViewProps {
  data: AnalyticsPageData;
  brews: Record<string, { name: string; style: string }>;
  features: AnalyticsFeatures;
  userTier: UserTier;
  breweryId: string;
  conversionData: { totalScans: number; conversions: number; rate: number } | null;
  topBrewsData: [string, number][];
  countryData: [string, number][];
  deviceData: [string, number][];
}

// ============================================================================
// Component
// ============================================================================

export default function OverviewView({
  data,
  brews,
  features,
  userTier,
  breweryId,
  conversionData,
  topBrewsData,
  deviceData,
}: OverviewViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Phase 15: BotlGuide Analyst — proactive AI insights ABOVE metrics */}
      <BotlGuideInsightCards breweryId={breweryId} userTier={userTier} />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsMetricCard
          title="Aufrufe gesamt"
          value={data.totalScans.toLocaleString('de-DE')}
          icon={<BarChart2 size={16} />}
        />
        <AnalyticsMetricCard
          title="Einzigartige Besucher"
          value={data.uniqueVisitors.toLocaleString('de-DE')}
          subValue="Geschätzte eindeutige Geräte"
        />
        <AnalyticsMetricCard
          title="Scans / Besucher"
          value={data.uniqueVisitors > 0 ? (data.totalScans / data.uniqueVisitors).toFixed(1) : '0'}
        />
        {conversionData && (
          <AnalyticsMetricCard
            title="Drinker Rate"
            value={`${conversionData.rate.toFixed(1)}%`}
            change={conversionData.rate > 5 ? 2.5 : undefined}
            subValue={`${conversionData.conversions} Verified Drinkers`}
          />
        )}
      </div>

      {/* Phase 2: Verified Drinker Funnel */}
      {/* verifiedDrinkers = max(conversions, capCollectors) because both actions prove drinking */}
      <DrinkerFunnelCard
        totalScans={data.totalScans}
        loggedInScans={data.loggedInScans ?? 0}
        verifiedDrinkers={Math.max(conversionData?.conversions ?? 0, data.capCollectors ?? 0)}
        capCollectors={data.capCollectors ?? 0}
        userTier={userTier}
      />

      {/* Main Content: Chart + Top Brews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ScansOverTimeChart data={data.scansByDate} />
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">Top Rezepte</h3>
            {features.maxTopBrews < 999 && (
              <span className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded-full border border-border">
                Top {features.maxTopBrews}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
            {topBrewsData.length === 0 ? (
              <div className="text-text-disabled text-sm text-center py-8">Keine Daten verfügbar</div>
            ) : (
              topBrewsData.map(([brewId, count]) => {
                const isUnassigned = brewId === '__no_brew__';
                const brew = !isUnassigned ? brews[brewId] : null;
                const displayName = isUnassigned
                  ? 'Ohne Brew-Zuordnung'
                  : brew?.name || 'Gelöschtes Bier';
                const maxCount = topBrewsData[0][1];
                const percentage = (count / maxCount) * 100;

                const innerContent = (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span
                          className={`font-bold truncate pr-2 group-hover:text-cyan-400 transition-colors ${
                            isUnassigned ? 'text-text-muted italic' : 'text-text-secondary'
                          }`}
                          title={displayName}
                        >
                          {displayName}
                        </span>
                        <span className="text-text-muted font-mono">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-surface-hover group-hover:bg-cyan-500 transition-colors duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {brew?.style && (
                        <div className="text-[10px] text-text-disabled mt-0.5 group-hover:text-text-muted">
                          {brew.style}
                        </div>
                      )}
                    </div>
                    {!isUnassigned && (
                      <ChevronRight
                        size={16}
                        className="text-text-disabled group-hover:text-text-muted flex-shrink-0"
                      />
                    )}
                  </div>
                );

                return isUnassigned ? (
                  <div key={brewId} className="block group -mx-2 px-2 py-2 rounded">
                    {innerContent}
                  </div>
                ) : (
                  <Link
                    href={`/team/${breweryId}/analytics/brew/${brewId}`}
                    key={brewId}
                    className="block group hover:bg-surface/50 -mx-2 px-2 py-2 rounded transition-colors"
                  >
                    {innerContent}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Geo + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geo Map */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">Geografie</h3>
            <div
              className="flex items-center gap-2 text-[10px] text-text-muted"
              title="Standorte basieren auf Internet-Knotenpunkten, nicht GPS."
            >
              <span className="w-2 h-2 rounded-full bg-amber-500/50"></span>
              <span>Standort geschätzt (IP)</span>
            </div>
          </div>
          <div className="min-h-[300px]">
            <BreweryHeatmap data={data.scansByCountry} geoPoints={data.geoPoints} />
          </div>
        </div>

        {/* Devices + Peak Hours */}
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-6">
            <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-6">Geräte</h3>
            <div className="space-y-4">
              {deviceData.map(([device, count]) => {
                const total = deviceData.reduce((acc, curr) => acc + curr[1], 0);
                const percentage = count > 0 ? (count / total) * 100 : 0;

                const getIcon = (type: string) => {
                  switch (type.toLowerCase()) {
                    case 'mobile':  return <Smartphone size={18} />;
                    case 'desktop': return <Monitor size={18} />;
                    case 'tablet':  return <Tablet size={18} />;
                    default:        return <HelpCircle size={18} />;
                  }
                };

                return (
                  <div key={device} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-secondary">
                      {getIcon(device)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-secondary capitalize font-bold">{device}</span>
                        <span className="text-text-muted">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-surface-hover" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.scansByHour && <PeakHoursChart data={data.scansByHour} />}
        </div>
      </div>

      {/* Phase 7.6 — Herkunftsquellen-Breakdown */}
      <ScanSourceBreakdownCard
        breweryId={breweryId}
        userTier={userTier}
      />

      {/* Privacy Footer */}
      <div className="flex items-center justify-center gap-2 py-8 text-text-disabled">
        <Shield size={12} />
        <span className="text-[10px] uppercase tracking-wider font-bold">
          Privacy First Analytics • No Cookies • Anonymized
        </span>
      </div>
    </div>
  );
}
