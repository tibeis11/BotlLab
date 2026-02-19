'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBreweryAnalytics, getBreweryAnalyticsSummary, exportAnalyticsCSV, getConversionRate } from '@/lib/actions/analytics-actions';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { safeRemove } from '@/lib/safe-dom';
import { getBreweryAnalyticsAccess, getAvailableTimeRanges, type UserTier, type AnalyticsFeatures } from '@/lib/analytics-tier-features';
import ReportSettingsPanel from './components/ReportSettingsPanel';
import BreweryHeatmap from './components/BreweryHeatmap';
import CustomSelect from '@/app/components/CustomSelect';
import AnalyticsMetricCard from './components/AnalyticsMetricCard';
import Link from 'next/link';
import { Sparkles, Calendar as CalendarIcon, Download, BarChart2, Smartphone, Monitor, Tablet, HelpCircle, Lock, LayoutDashboard, Mail, ChevronRight } from 'lucide-react';
import ResponsiveTabs from '@/app/components/ResponsiveTabs';
import ScansOverTimeChart from './components/ScansOverTimeChart';
import PeakHoursChart from './components/PeakHoursChart';

interface AnalyticsPageData {
  totalScans: number;
  uniqueVisitors: number;
  scansByDate: Record<string, { scans: number; unique: number }>;
  scansByCountry: Record<string, number>;
  scansByDevice: Record<string, number>;
  topBrews: Record<string, number>;
  scansByHour?: Record<string, number>; // Phase 3: Time-to-Glass data
  geoPoints?: Array<{ lat: number; lng: number }>; // Phase 4: Geo-Coords
}

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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  
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
        endDate
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

        // Load brew names for the top brews
        const brewIds = Object.keys(result.data.topBrews);
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
        const conversionResult = await getConversionRate(breweryId, { startDate, endDate });
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
        <div className="text-zinc-500">Lade Analytics...</div>
      </div>
    );
  }
  // Access Denied - Free Tier
  if (!features?.hasAccess) {
    return (
      <div className="min-h-screen bg-black text-white p-4 sm:p-6 md:p-8 font-sans antialiased">
        <div className="max-w-[1600px] mx-auto w-full space-y-8">
            <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6">
                <div>
                   <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
                   <p className="text-sm text-zinc-500">Premium Feature - Upgrade benötigt</p>
                </div>
            </header>

            {/* Upgrade Card */}
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-900/20 rounded-2xl p-8 border border-zinc-800 overflow-hidden">
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
              <div className="text-4xl">🔒</div>
              <h2 className="text-2xl font-black text-white">Analytics freischalten</h2>
            </div>
            
            <p className="text-zinc-400 text-lg mb-6">
              Erhalte wertvolle Einblicke in die Popularität deiner Biere. Sieh wo und wann deine QR-Codes gescannt werden.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-white font-bold mb-1">Scan-Statistiken</div>
                <div className="text-sm text-zinc-500">Verfolge jeden QR-Scan deiner Flaschen</div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="text-2xl mb-2">🌍</div>
                <div className="text-white font-bold mb-1">Geografische Daten</div>
                <div className="text-sm text-zinc-500">Wo werden deine Biere getrunken?</div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="text-2xl mb-2">📈</div>
                <div className="text-white font-bold mb-1">Trend-Analyse</div>
                <div className="text-sm text-zinc-500">Welche Rezepte sind beliebt?</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href="/dashboard/account"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all"
              >
                Jetzt upgraden
              </Link>
              <Link
                href={`/team/${breweryId}`}
                className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 transition-all"
              >
                Zurück zum Team
              </Link>
            </div>

            <div className="mt-6 text-xs text-zinc-600">
              Ab Brewer+ Tier verfügbar • Datenschutz-konform • Keine Cookies benötigt
            </div>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4">Feature-Vergleich</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 text-zinc-400 font-bold">Feature</th>
                  <th className="text-center py-3 text-zinc-400 font-bold">Free</th>
                  <th className="text-center py-3 text-blue-400 font-bold">Brewer</th>
                  <th className="text-center py-3 text-amber-400 font-bold">Brewery</th>
                  <th className="text-center py-3 text-purple-400 font-bold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                <tr className="border-b border-zinc-800">
                  <td className="py-3">Analytics Dashboard</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3">Geschmacks-Details (1-10)</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3">Trend-Analyse & Timeline</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3">Daten-Historie</td>
                  <td className="text-center">-</td>
                  <td className="text-center">30 Tage</td>
                  <td className="text-center">90 Tage</td>
                  <td className="text-center">365 Tage</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3">Top Brews</td>
                  <td className="text-center">-</td>
                  <td className="text-center">Top 3</td>
                  <td className="text-center">Top 10</td>
                  <td className="text-center">Unlimited</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3">CSV Export</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr>
                  <td className="py-3">Advanced Filters</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
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
        <div className="text-zinc-500">Keine Daten verfügbar</div>
      </div>
    );
  }

  // Sort data for charts (with tier limits)
  const dateLabels = Object.keys(data.scansByDate).sort();
  const countryData = Object.entries(data.scansByCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, features?.maxTopCountries || 5);
  const deviceData = Object.entries(data.scansByDevice);
  const topBrewsData = Object.entries(data.topBrews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, features?.maxTopBrews || 3);

  const availableTimeRanges = getAvailableTimeRanges(userTier);

  return (
    <div className="text-white font-sans antialiased">
      <div className="w-full space-y-8">
        
       {/* Header */}
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${
                  userTier === 'enterprise' ? 'bg-blue-950/30 text-blue-400 border-blue-900' :
                  userTier === 'brewery' ? 'bg-purple-950/30 text-purple-400 border-purple-900' :
                  userTier === 'brewer' ? 'bg-cyan-950/30 text-cyan-400 border-cyan-900' :
                  'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {userTier} Tier
              </span>
            </div>
            <p className="text-sm text-zinc-500">Scan-Statistiken & Performance Insights</p>
          </div>
          
          <div className="flex items-center gap-4">
            {features?.canExport && (
               <button
                  onClick={handleExportCSV}
                  disabled={exporting}
                  className="bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2 rounded-md text-sm font-medium border border-zinc-800 transition-colors flex items-center gap-2"
                >
                  {exporting ? <span className="animate-spin">⏳</span> : <Download size={16} />}
                  <span>CSV Export</span>
               </button>
            )}
            <div className="h-8 w-px bg-zinc-800 hidden md:block"></div>
            <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">History Limit</p>
              <p className="text-zinc-300 font-mono text-xs text-right">{features?.maxDays} Tage</p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-8">
            <ResponsiveTabs
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as any)}
                items={[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'reports', label: 'E-Mail Reports', icon: Mail }
                ]}
                variant='bubble'
            />
        </div>

        {activeTab === 'reports' ? (
          <ReportSettingsPanel breweryId={breweryId} />
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-wrap bg-black rounded-lg border border-zinc-800 p-1 w-full md:w-auto gap-1">
                    {availableTimeRanges.map(range => (
                      <button
                        key={range.value}
                        onClick={() => !range.locked && setTimeRange(range.value)}
                        disabled={range.locked}
                        className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-grow sm:flex-grow-0 flex items-center justify-center gap-1.5 ${
                          timeRange === range.value
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : range.locked
                            ? 'text-zinc-700 cursor-not-allowed'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                        }`}
                        title={range.locked ? `Upgrade nötig` : ''}
                      >
                        {range.label} {range.locked && <Lock size={10} />}
                      </button>
                    ))}
                    <button
                        onClick={() => setTimeRange('custom')}
                        className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-grow sm:flex-grow-0 flex items-center justify-center ${
                          timeRange === 'custom' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                        }`}
                    >
                        Custom
                    </button>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {breweryBrews.length > 0 && (
                      <CustomSelect
                        value={selectedBrewId || ''}
                        onChange={(val) => setSelectedBrewId(val || null)}
                        options={[
                          { value: '', label: 'Alle Rezepte' },
                          ...breweryBrews.map(b => ({
                            value: b.id,
                            label: `${b.name} (${b.style})`
                          }))
                        ]}
                        placeholder="Rezept Filter"
                        className="bg-black border-zinc-800 text-sm w-full md:min-w-[200px]"
                      />
                    )}
                </div>
            </div>

             {/* Custom Date Range Picker */}
             {timeRange === 'custom' && (
                <div className="flex items-center gap-4 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 max-w-fit animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className="text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-400">Zeitraum:</span>
                  </div>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 rounded bg-black text-white border border-zinc-800 focus:border-cyan-500 outline-none text-xs"
                  />
                  <span className="text-zinc-600">-</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 rounded bg-black text-white border border-zinc-800 focus:border-cyan-500 outline-none text-xs"
                  />
                </div>
              )}

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsMetricCard 
                    title="Gesamt Scans"
                    value={data.totalScans.toLocaleString()}
                    icon={<BarChart2 size={16} />}
                />
                <AnalyticsMetricCard 
                    title="Unique Visitors"
                    value={data.uniqueVisitors.toLocaleString()}
                    subValue="Geschätzte eindeutige Geräte"
                />
                 <AnalyticsMetricCard 
                    title="Scans / Visitor"
                    value={data.uniqueVisitors > 0 ? (data.totalScans / data.uniqueVisitors).toFixed(1) : '0'}
                />
                 {conversionData && (
                     <AnalyticsMetricCard 
                        title="Conversion Rate"
                        value={`${conversionData.rate.toFixed(1)}%`}
                        change={conversionData.rate > 5 ? 2.5 : undefined} 
                        subValue={`${conversionData.conversions} Ratings abgegeben`}
                     />
                 )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Chart (Spans 2 cols) */}
                <div className="lg:col-span-2">
                   <ScansOverTimeChart data={data.scansByDate} />
                </div>

                {/* Top Brews (Right Col) */}
                <div className="bg-black rounded-lg border border-zinc-800 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Top Rezepte</h3>
                        {features && features.maxTopBrews < 999 && (
                            <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">Top {features.maxTopBrews}</span>
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
                        {topBrewsData.length === 0 ? (
                            <div className="text-zinc-600 text-sm text-center py-8">Keine Daten verfügbar</div>
                        ) : (
                        topBrewsData.map(([brewId, count], index) => {
                            const brew = brews[brewId];
                            const maxCount = topBrewsData[0][1];
                            const percentage = (count / maxCount) * 100;
                            
                            return (
                                <Link 
                                    href={`/team/${breweryId}/analytics/brew/${brewId}`}
                                    key={brewId} 
                                    className="block group hover:bg-zinc-900/50 -mx-2 px-2 py-2 rounded transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-zinc-300 font-medium truncate pr-2 group-hover:text-cyan-400 transition-colors" title={brew?.name}>
                                                {brew ? brew.name : brewId.slice(0, 8)}
                                            </span>
                                            <span className="text-zinc-500 font-mono">{count}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-zinc-700 group-hover:bg-cyan-500 transition-colors duration-300"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        {brew && (
                                            <div className="text-[10px] text-zinc-600 mt-0.5 group-hover:text-zinc-500">{brew.style}</div>
                                        )}
                                    </div>
                                    <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-500 flex-shrink-0" />
                                  </div>
                                </Link>
                            );
                        })
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Geo Map */}
                 <div className="bg-black rounded-lg border border-zinc-800 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Geografie</h3>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500" title="Standorte basieren auf Internet-Knotenpunkten, nicht GPS.">
                             <span className="w-2 h-2 rounded-full bg-amber-500/50"></span>
                             <span>Standort geschätzt (IP)</span>
                        </div>
                    </div>
                    <div className="min-h-[300px]">
                        <BreweryHeatmap 
                            data={data.scansByCountry} 
                            geoPoints={data.geoPoints}
                        />
                    </div>
                 </div>

                 {/* Device Stats & Time */}
                 <div className="space-y-6">
                     {/* Devices */}
                     <div className="bg-black rounded-lg border border-zinc-800 p-6">
                        <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-6">Geräte</h3>
                        <div className="space-y-4">
                            {deviceData.map(([device, count]) => {
                                const total = deviceData.reduce((acc, curr) => acc + curr[1], 0);
                                const percentage = count > 0 ? (count / total) * 100 : 0;
                                
                                const getIcon = (type: string) => {
                                    switch(type.toLowerCase()) {
                                        case 'mobile': return <Smartphone size={18} />;
                                        case 'desktop': return <Monitor size={18} />;
                                        case 'tablet': return <Tablet size={18} />;
                                        default: return <HelpCircle size={18} />;
                                    }
                                };
                                
                                return (
                                    <div key={device} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
                                            {getIcon(device)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-zinc-300 capitalize font-medium">{device}</span>
                                                <span className="text-zinc-500">{percentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                                <div className="h-full bg-zinc-700" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                     
                     {/* Peak Hours Hint (Improved) */}
                     {data.scansByHour && (
                         <PeakHoursChart data={data.scansByHour} />
                     )}
                 </div>
            </div>

            {/* Privacy Footer */}
            <div className="flex items-center justify-center gap-2 py-8 text-zinc-600">
                <Shield size={12} />
                <span className="text-[10px] uppercase tracking-wider font-medium">Privacy First Analytics • No Cookies • Anonymized</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Shield({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    );
}

// End of file
