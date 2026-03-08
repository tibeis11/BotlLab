'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBreweryAnalyticsSummary, exportAnalyticsCSV, getConversionRate } from '@/lib/actions/analytics-actions';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { safeRemove } from '@/lib/safe-dom';
import { getBreweryAnalyticsAccess, getAvailableTimeRanges, type UserTier, type AnalyticsFeatures } from '@/lib/analytics-tier-features';
import Link from 'next/link';
import { Calendar as CalendarIcon, Download, Lock } from 'lucide-react';
import CustomSelect from '@/app/components/CustomSelect';
import ReportSettingsPanel from './components/ReportSettingsPanel';
import AnalyticsSidebarNav, { type AnalyticsSection } from './components/AnalyticsSidebarNav';
import AnalyticsMobileNav from './components/AnalyticsMobileNav';
import OverviewView, { type AnalyticsPageData } from './views/OverviewView';
import AudienceView from './views/AudienceView';
import QualityView from './views/QualityView';
import ContextView from './views/ContextView';
import MarketView from './views/MarketView';

export default function BreweryAnalyticsPage() {
  const supabase = useSupabase();
  const params = useParams();
  const router = useRouter();
  const breweryId = params?.breweryId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsPageData | null>(null);
  const [brews, setBrews] = useState<Record<string, { name: string; style: string }>>({});
  
  // Tier & Access
  const [userTier, setUserTier] = useState<UserTier>('free');
  const [features, setFeatures] = useState<AnalyticsFeatures | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  
  // Filter states
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
  const [selectedBrewId, setSelectedBrewId] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Export state
  const [exporting, setExporting] = useState(false);
  
  // Active section
  const [section, setSection] = useState<AnalyticsSection>('overview');
  
  // Brewery brews for filter dropdown
  const [breweryBrews, setBreweryBrews] = useState<Array<{ id: string; name: string; style: string }>>([]);
  
  // Conversion rate data
  const [conversionData, setConversionData] = useState<{ totalScans: number; conversions: number; rate: number } | null>(null);

  // Check access on mount
  useEffect(() => {
    if (breweryId) {
      checkAccess();
    }
  }, [breweryId]);

  async function checkAccess() {
    const access = await getBreweryAnalyticsAccess(breweryId);
    
    if (!access || !access.features) {
      setAccessError('Error loading access information');
      setLoading(false);
      return;
    }
    
    setUserTier(access.tier);
    setFeatures(access.features);
    
    if (access.error) {
      setAccessError(access.error);
    }

    if (!access.features.hasAccess) {
      setLoading(false);
      return;
    }

    // If access granted, load data
    loadAnalytics();
  }

  useEffect(() => {
    if (features?.hasAccess && breweryId) {
      loadAnalytics();
    }
  }, [breweryId, timeRange, selectedBrewId, customStartDate, customEndDate]);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range
      let startDate: string | undefined;
      let endDate: string | undefined;
      const today = new Date();
      
      if (timeRange === 'custom') {
        startDate = customStartDate || undefined;
        endDate = customEndDate || undefined;
      } else if (timeRange === '7d') {
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      } else if (timeRange === '30d') {
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      } else if (timeRange === '90d') {
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      }

      const result = await getBreweryAnalyticsSummary(breweryId, {
        startDate,
        endDate,
        brewId: selectedBrewId || undefined
      });

      if ('error' in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.data) {
        // Fix: Fill date gaps for continuous chart
        const finalEndDate = endDate || new Date().toISOString().split('T')[0];
        let finalStartDate = startDate;

        if (!finalStartDate) {
            // Logic for 'all' or missing start: take earliest data point or fallback to 30d
            const keys = Object.keys(result.data.scansByDate).sort();
            finalStartDate = keys.length > 0 ? keys[0] : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        const filledScansByDate: Record<string, { scans: number; unique: number }> = {};
        const dates = [];
        let cur = new Date(finalStartDate);
        const end = new Date(finalEndDate);
        
        // Safety Break: Max 366 days loop to prevent infinite loop on invalid dates
        let safety = 0;
        while (cur <= end && safety < 400) {
            const dateStr = cur.toISOString().split('T')[0];
            dates.push(dateStr);
            filledScansByDate[dateStr] = result.data.scansByDate[dateStr] || { scans: 0, unique: 0 };
            cur.setDate(cur.getDate() + 1);
            safety++;
        }

        // Apply filled data
        const enrichedData = {
             ...result.data,
             scansByDate: filledScansByDate
        };

        setData(enrichedData);

        // Load brew names for the top brews (exclude sentinel key for unassigned scans)
        const brewIds = Object.keys(result.data.topBrews).filter(id => id !== '__no_brew__');
        if (brewIds.length > 0) {
          const { data: brewsData } = await supabase
            .from('brews')
            .select('id, name, style')
            .in('id', brewIds);

          if (brewsData) {
            const brewMap: Record<string, { name: string; style: string }> = {};
            brewsData.forEach(b => {
              brewMap[b.id] = { name: b.name || "Unbekannt", style: b.style || "" };
            });
            setBrews(brewMap);
          }
        }
        
        // Load conversion rate data
        const conversionResult = await getConversionRate(breweryId, { startDate, endDate, brewId: selectedBrewId || undefined });
        if (conversionResult.data) {
          setConversionData(conversionResult.data);
        }
      }
    } catch (e) {
      console.error('[Analytics] Load error:', e);
      setError('Fehler beim Laden der Analytics');
    } finally {
      setLoading(false);
    }
  }

  // Load brewery brews for filter dropdown
  useEffect(() => {
    if (breweryId) {
      supabase
        .from('brews')
        .select('id, name, style')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) {
             setBreweryBrews(data.map(b => ({
                 id: b.id,
                 name: b.name || "Unbekannt",
                 style: b.style || ""
             })));
          }
        });
    }
  }, [breweryId]);

  // CSV Export Handler
  async function handleExportCSV() {
    setExporting(true);
    try {
      // Calculate date range for export
      let startDate: string | undefined;
      let endDate: string | undefined;
      const today = new Date();
      
      if (timeRange === 'custom') {
        startDate = customStartDate || undefined;
        endDate = customEndDate || today.toISOString().split('T')[0];
      } else if (timeRange === '7d') {
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else if (timeRange === '30d') {
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else if (timeRange === '90d') {
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      const result = await exportAnalyticsCSV(breweryId, {
        startDate,
        endDate: endDate || today.toISOString().split('T')[0],
        brewId: selectedBrewId || undefined
      });

      if (result.error) {
        alert('Fehler: ' + result.error);
        return;
      }

      if (result.data) {
        // Create download link
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics-${breweryId}-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        // Use safeRemove helper to avoid NotFoundError when node was already detached
        safeRemove(link);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      alert('Export fehlgeschlagen: ' + error.message);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Lade Analytics...</div>
      </div>
    );
  }
  // Access Denied - Free Tier
  if (!features?.hasAccess) {
    return (
      <div className="min-h-screen bg-background text-text-primary p-4 sm:p-6 md:p-8 font-sans antialiased">
        <div className="max-w-[1600px] mx-auto w-full space-y-8">
            <header className="flex flex-col gap-4 border-b border-border pb-6">
                <div>
                   <h1 className="text-2xl font-bold text-text-primary tracking-tight">Analytics</h1>
                   <p className="text-sm text-text-muted">Premium Feature - Upgrade benÃ¶tigt</p>
                </div>
            </header>

            {/* Upgrade Card */}
            <div className="relative bg-gradient-to-br from-surface via-surface to-purple-900/20 rounded-2xl p-8 border border-border overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full"
                 style={{
                   backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                   backgroundSize: '40px 40px'
                 }}
            ></div>
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">ðŸ”’</div>
              <h2 className="text-2xl font-black text-text-primary">Analytics freischalten</h2>
            </div>
            
            <p className="text-text-secondary text-lg mb-6">
              Erhalte wertvolle Einblicke in die PopularitÃ¤t deiner Biere. Sieh wo und wann deine QR-Codes gescannt werden.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-surface/50 rounded-2xl p-4 border border-border">
                <div className="text-2xl mb-2">ðŸ“Š</div>
                <div className="text-text-primary font-bold mb-1">Scan-Statistiken</div>
                <div className="text-sm text-text-muted">Verfolge jeden QR-Scan deiner Flaschen</div>
              </div>
              <div className="bg-surface/50 rounded-2xl p-4 border border-border">
                <div className="text-2xl mb-2">ðŸŒ</div>
                <div className="text-text-primary font-bold mb-1">Geografische Daten</div>
                <div className="text-sm text-text-muted">Wo werden deine Biere getrunken?</div>
              </div>
              <div className="bg-surface/50 rounded-2xl p-4 border border-border">
                <div className="text-2xl mb-2">ðŸ“ˆ</div>
                <div className="text-text-primary font-bold mb-1">Trend-Analyse</div>
                <div className="text-sm text-text-muted">Welche Rezepte sind beliebt?</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href="/account"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all"
              >
                Jetzt upgraden
              </Link>
              <Link
                href={`/team/${breweryId}`}
                className="px-6 py-3 bg-surface-hover text-text-primary font-bold rounded-lg hover:bg-surface-hover transition-all"
              >
                ZurÃ¼ck zum Team
              </Link>
            </div>

            <div className="mt-6 text-xs text-text-disabled">
              Ab Brewer+ Tier verfÃ¼gbar â€¢ Datenschutz-konform â€¢ Keine Cookies benÃ¶tigt
            </div>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="bg-surface rounded-xl p-6 border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-4">Feature-Vergleich</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-text-secondary font-bold">Feature</th>
                  <th className="text-center py-3 text-text-secondary font-bold">Free</th>
                  <th className="text-center py-3 text-blue-400 font-bold">Brewer</th>
                  <th className="text-center py-3 text-amber-400 font-bold">Brewery</th>
                  <th className="text-center py-3 text-purple-400 font-bold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border">
                  <td className="py-3">Analytics Dashboard</td>
                  <td className="text-center">âŒ</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3">Geschmacks-Details (1-10)</td>
                  <td className="text-center">âŒ</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3">Trend-Analyse & Timeline</td>
                  <td className="text-center">âŒ</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3">Daten-Historie</td>
                  <td className="text-center">-</td>
                  <td className="text-center">30 Tage</td>
                  <td className="text-center">90 Tage</td>
                  <td className="text-center">365 Tage</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3">Top Brews</td>
                  <td className="text-center">-</td>
                  <td className="text-center">Top 3</td>
                  <td className="text-center">Top 10</td>
                  <td className="text-center">Unlimited</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3">CSV Export</td>
                  <td className="text-center">âŒ</td>
                  <td className="text-center">âŒ</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                </tr>
                <tr>
                  <td className="py-3">Advanced Filters</td>
                  <td className="text-center">âŒ</td>
                  <td className="text-center">âŒ</td>
                  <td className="text-center">âœ…</td>
                  <td className="text-center">âœ…</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
     </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Keine Daten verfÃ¼gbar</div>
      </div>
    );
  }

  // Sort data for charts (with tier limits)
  const countryData = Object.entries(data.scansByCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, features?.maxTopCountries || 5);
  const deviceData = Object.entries(data.scansByDevice);
  const topBrewsData = Object.entries(data.topBrews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, features?.maxTopBrews || 3);

  const availableTimeRanges = getAvailableTimeRanges(userTier);

  return (
    <div className="text-text-primary font-sans antialiased">
      <div className="w-full space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">Analytics</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                userTier === 'enterprise' ? 'bg-blue-950/30 text-blue-400 border-blue-900' :
                userTier === 'brewery'    ? 'bg-purple-950/30 text-purple-400 border-purple-900' :
                userTier === 'brewer'     ? 'bg-cyan-950/30 text-cyan-400 border-cyan-900' :
                'bg-surface-hover text-text-secondary border-border-hover'
              }`}>
                {userTier} Tier
              </span>
            </div>
            <p className="text-sm text-text-muted">Scan-Statistiken & Performance Insights</p>
          </div>

          <div className="flex items-center gap-4">
            {features?.canExport && (
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary px-4 py-2 rounded-xl text-sm font-bold border border-border transition-colors flex items-center gap-2"
              >
                {exporting ? <span className="animate-spin">â³</span> : <Download size={16} />}
                <span>CSV Export</span>
              </button>
            )}
            <div className="h-8 w-px bg-surface-hover hidden md:block"></div>
            <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase font-bold text-text-disabled tracking-wider mb-0.5">History Limit</p>
              <p className="text-text-secondary font-mono text-xs text-right">{features?.maxDays} Tage</p>
            </div>
          </div>
        </header>

        {/* Main layout: sidebar (desktop left) + content */}
        <div className="flex gap-6 pb-16 lg:pb-0">

          {/* Sidebar â€” desktop only */}
          <aside className="w-52 hidden lg:block shrink-0">
            <div className="sticky top-6">
              <AnalyticsSidebarNav activeSection={section} onNavigate={setSection} />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6 max-w-[1400px]">

            {/* Mobile Nav */}
            <AnalyticsMobileNav activeSection={section} onNavigate={setSection} />

            {/* Filter Toolbar â€” only visible for the overview section */}
            {section === 'overview' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  {/* Time range pills */}
                  <div className="flex flex-wrap bg-surface rounded-xl border border-border p-1 w-full md:w-auto gap-1">
                    {availableTimeRanges.map(range => (
                      <button
                        key={range.value}
                        onClick={() => !range.locked && setTimeRange(range.value)}
                        disabled={range.locked}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-grow sm:flex-grow-0 flex items-center justify-center gap-1.5 ${
                          timeRange === range.value
                            ? 'bg-surface-hover text-text-primary shadow-sm'
                            : range.locked
                            ? 'text-text-disabled cursor-not-allowed'
                            : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover/50'
                        }`}
                        title={range.locked ? 'Upgrade nÃ¶tig' : ''}
                      >
                        {range.label} {range.locked && <Lock size={10} />}
                      </button>
                    ))}
                    <button
                      onClick={() => setTimeRange('custom')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-grow sm:flex-grow-0 flex items-center justify-center ${
                        timeRange === 'custom'
                          ? 'bg-surface-hover text-text-primary shadow-sm'
                          : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover/50'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Brew filter */}
                  <div className="flex gap-2 w-full md:w-auto">
                    {breweryBrews.length > 0 && (
                      <CustomSelect
                        value={selectedBrewId || ''}
                        onChange={(val) => setSelectedBrewId(val || null)}
                        options={[
                          { value: '', label: 'Alle Rezepte' },
                          ...breweryBrews.map(b => ({
                            value: b.id,
                            label: `${b.name} (${b.style})`,
                          }))
                        ]}
                        placeholder="Rezept Filter"
                        className="bg-background border-border text-sm w-full md:min-w-[200px]"
                      />
                    )}
                  </div>
                </div>

                {/* Custom date range picker */}
                {timeRange === 'custom' && (
                  <div className="flex items-center gap-4 bg-surface/50 rounded-2xl p-3 border border-border max-w-fit animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className="text-text-muted" />
                      <span className="text-xs font-bold text-text-secondary">Zeitraum:</span>
                    </div>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2 py-1 rounded bg-background text-text-primary border border-border focus:border-cyan-500 outline-none text-xs"
                    />
                    <span className="text-text-disabled">-</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2 py-1 rounded bg-background text-text-primary border border-border focus:border-cyan-500 outline-none text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Active View â€” key triggers fade-in animation on section change */}
            <div key={section}>
              {section === 'overview' && (
                <OverviewView
                  data={data}
                  brews={brews}
                  features={features!}
                  userTier={userTier}
                  breweryId={breweryId}
                  conversionData={conversionData}
                  topBrewsData={topBrewsData}
                  countryData={countryData}
                  deviceData={deviceData}
                  startDate={timeRange === 'custom' ? (customStartDate || undefined) : timeRange === '7d' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : timeRange === '30d' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : timeRange === '90d' ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : undefined}
                  endDate={timeRange === 'custom' ? (customEndDate || undefined) : undefined}
                  brewId={selectedBrewId || undefined}
                />
              )}
              {section === 'audience' && <AudienceView brews={breweryBrews} breweryId={breweryId} userTier={userTier} startDate={timeRange === 'custom' ? (customStartDate || undefined) : timeRange === '7d' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : timeRange === '30d' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : timeRange === '90d' ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : undefined} endDate={timeRange === 'custom' ? (customEndDate || undefined) : undefined} />}
              {section === 'quality'  && <QualityView brews={breweryBrews} breweryId={breweryId} userTier={userTier} />}
              {section === 'context'  && <ContextView breweryId={breweryId} userTier={userTier} />}
              {section === 'market'   && <MarketView  breweryId={breweryId} userTier={userTier} />}
              {section === 'reports'  && <ReportSettingsPanel breweryId={breweryId} />}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
