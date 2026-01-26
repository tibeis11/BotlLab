'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBreweryAnalytics, getBreweryAnalyticsSummary, exportAnalyticsCSV, getConversionRate } from '@/lib/actions/analytics-actions';
import { supabase } from '@/lib/supabase';
import { safeRemove } from '@/lib/safe-dom';
import { getBreweryAnalyticsAccess, getAvailableTimeRanges, type UserTier, type AnalyticsFeatures } from '@/lib/analytics-tier-features';
import ReportSettingsPanel from './components/ReportSettingsPanel';
import BreweryHeatmap from './components/BreweryHeatmap';
import CustomSelect from '@/app/components/CustomSelect';
import Link from 'next/link';

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
        setData(result.data);

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
              brewMap[b.id] = { name: b.name, style: b.style };
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
          if (data) setBreweryBrews(data);
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
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-black text-white">📈 Analytics</h1>
          <p className="text-zinc-500">Premium Feature - Upgrade benötigt</p>
        </div>

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-black text-white">📈 Analytics</h1>
        <p className="text-zinc-500">QR-Scan Statistiken für deine Brauerei</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === 'dashboard'
              ? 'text-cyan-500 border-b-2 border-cyan-500'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === 'reports'
              ? 'text-cyan-500 border-b-2 border-cyan-500'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          E-Mail Reports
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' ? (
        <ReportSettingsPanel breweryId={breweryId} />
      ) : (
        <>
          {/* Tier Badge */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              userTier === 'enterprise' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              userTier === 'brewery' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              userTier === 'brewer' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
              'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
            }`}>
              {userTier.toUpperCase()} TIER
            </div>
            <span className="text-xs text-zinc-600">
              Historie: bis zu {features?.maxDays} Tage • Top Brews: {features?.maxTopBrews === 999 ? 'Unlimited' : features?.maxTopBrews}
            </span>
          </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {availableTimeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => !range.locked && setTimeRange(range.value)}
              disabled={range.locked}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all relative ${
                timeRange === range.value
                  ? 'bg-cyan-500 text-black'
                  : range.locked
                  ? 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
              title={range.locked ? `Upgrade auf ${userTier === 'brewer' ? 'Brewery' : 'Enterprise'} Tier benötigt` : ''}
            >
              {range.label}
              {range.locked && <span className="ml-1">🔒</span>}
            </button>
          ))}
          <button
            onClick={() => setTimeRange('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              timeRange === 'custom'
                ? 'bg-cyan-500 text-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            📅 Custom
          </button>
        </div>
        
        {/* Custom Date Range Inputs */}
        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-2 border border-zinc-800">
            <label className="text-xs text-zinc-500 font-bold">Von:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1 rounded bg-zinc-800 text-white border border-zinc-700 focus:border-cyan-500 outline-none text-sm"
            />
            <label className="text-xs text-zinc-500 font-bold">Bis:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1 rounded bg-zinc-800 text-white border border-zinc-700 focus:border-cyan-500 outline-none text-sm"
            />
          </div>
        )}

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
            placeholder="Rezept wählen"
            className="min-w-[200px]"
          />
        )}
        
        {/* CSV Export Button (Brewery+ Feature) */}
        {features?.canExport && (
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <span className="animate-spin">⏳</span>
                Exportiere...
              </>
            ) : (
              <>
                📥 CSV Export
              </>
            )}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <div className="text-zinc-500 text-sm font-bold mb-2">Gesamt Scans</div>
          <div className="text-4xl font-black text-white">{data.totalScans.toLocaleString()}</div>
        </div>
        
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <div className="text-zinc-500 text-sm font-bold mb-2">Unique Visitors</div>
          <div className="text-4xl font-black text-cyan-400">{data.uniqueVisitors.toLocaleString()}</div>
        </div>
        
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <div className="text-zinc-500 text-sm font-bold mb-2">Durchschn. Scans/Visitor</div>
          <div className="text-4xl font-black text-purple-400">
            {data.uniqueVisitors > 0 ? (data.totalScans / data.uniqueVisitors).toFixed(1) : '0'}
          </div>
        </div>
        
        {/* Conversion Rate Card */}
        {conversionData && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="text-zinc-500 text-sm font-bold mb-2">Conversion Rate</div>
            <div className="text-4xl font-black text-green-400">
              {conversionData.rate.toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              {conversionData.conversions} von {conversionData.totalScans} geben Rating
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Geographic Heatmap */}
        {(countryData.length > 0 || (data.geoPoints && data.geoPoints.length > 0)) && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4">🌍 Geografische Verteilung</h3>
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-500 flex items-start gap-2">
                <span>⚠️</span>
                <span>
                  <strong>Hinweis zu Standorten:</strong> Die angezeigten Standorte basieren auf Internet-Knotenpunkten (IP-Adresse). 
                  Insbesondere bei Mobilfunk-Nutzern wird oft der Hauptsitz des Anbieters (z.B. Frankfurt, München) angezeigt, 
                  statt des tatsächlichen Standorts. Dies ist technisch bedingt und kein Fehler.
                </span>
              </p>
            </div>
            
            <p className="text-xs text-zinc-500 mb-4">Wo werden deine Biere gescannt? (Interaktive Karte)</p>
            <BreweryHeatmap 
              data={data.scansByCountry} 
              geoPoints={data.geoPoints}
            />
          </div>
        )}
        
        {/* Scans Over Time */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4">Scans über Zeit</h3>
          <div className="h-64 flex items-end gap-2">
            {dateLabels.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-600">
                Keine Daten verfügbar
              </div>
            ) : (
              dateLabels.map((date) => {
                const scans = data.scansByDate[date].scans;
                const maxScans = Math.max(...Object.values(data.scansByDate).map(d => d.scans));
                const height = maxScans > 0 ? (scans / maxScans) * 100 : 0;
                
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    {/* Value label above bar */}
                    {scans > 0 && (
                      <div className="text-xs font-bold text-cyan-400 mb-1">
                        {scans}
                      </div>
                    )}
                    {/* Bar */}
                    <div
                      className="w-full bg-cyan-500 rounded-t-lg transition-all hover:bg-cyan-400"
                      style={{ height: `${height}%`, minHeight: scans > 0 ? '4px' : '0' }}
                      title={`${date}: ${scans} Scans`}
                    ></div>
                    {/* Date label */}
                    <div className="text-[10px] text-zinc-600 rotate-45 origin-left whitespace-nowrap mt-1">
                      {new Date(date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries List */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4">Top Länder</h3>
          <div className="space-y-3">
            {countryData.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">Keine Daten verfügbar</div>
            ) : (
              countryData.map(([country, count]) => {
                const maxCount = countryData[0][1];
                const percentage = (count / maxCount) * 100;
                
                return (
                  <div key={country}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">{country || 'Unbekannt'}</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Device Types */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4">Geräte-Typen</h3>
          <div className="space-y-3">
            {deviceData.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">Keine Daten verfügbar</div>
            ) : (
              deviceData.map(([device, count]) => {
                const total = Object.values(data.scansByDevice).reduce((sum, c) => sum + c, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                const deviceEmoji = device === 'mobile' ? '📱' : device === 'tablet' ? '📱' : '💻';
                const deviceLabel = device === 'mobile' ? 'Mobile' : device === 'tablet' ? 'Tablet' : 'Desktop';
                
                return (
                  <div key={device}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400 flex items-center gap-2">
                        <span>{deviceEmoji}</span>
                        <span>{deviceLabel}</span>
                      </span>
                      <span className="text-white font-bold">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Time-to-Glass (Phase 3) */}
        {data.scansByHour && Object.keys(data.scansByHour).length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4">⏰ Time-to-Glass</h3>
            <p className="text-xs text-zinc-500 mb-4">Zu welcher Tageszeit werden deine Biere getrunken?</p>
            <div className="h-48 flex items-end gap-1">
              {Array.from({ length: 24 }, (_, i) => {
                const hour = i;
                const count = data.scansByHour![hour.toString()] || 0;
                const maxCount = Math.max(...Object.values(data.scansByHour!));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                // Highlight peak hours (18-23)
                const isPeakHour = hour >= 18 && hour <= 23;
                
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    {/* Value label for non-zero hours */}
                    {count > 0 && height > 30 && (
                      <div className="text-[10px] font-bold text-amber-400">
                        {count}
                      </div>
                    )}
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all ${
                        isPeakHour 
                          ? 'bg-gradient-to-t from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300' 
                          : 'bg-gradient-to-t from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300'
                      }`}
                      style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0' }}
                      title={`${hour}:00 Uhr - ${count} Scans`}
                    ></div>
                    {/* Hour label (show every 3 hours) */}
                    {hour % 3 === 0 && (
                      <div className="text-[9px] text-zinc-600 mt-1">
                        {hour}h
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-600 to-amber-400"></div>
                <span>Peak Hours (18-23 Uhr)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-cyan-600 to-cyan-400"></div>
                <span>Rest</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Brews */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Top Rezepte</h3>
            {features && features.maxTopBrews < 999 && (
              <span className="text-xs text-zinc-600">
                Zeige Top {features.maxTopBrews}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {topBrewsData.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">Keine Daten verfügbar</div>
            ) : (
              <>
                {topBrewsData.map(([brewId, count], index) => {
                  const brew = brews[brewId];
                  const maxCount = topBrewsData[0][1];
                  const percentage = (count / maxCount) * 100;
                  
                  return (
                    <div key={brewId}>
                      <div className="flex justify-between text-sm mb-1">
                        <Link 
                            href={`/team/${breweryId}/analytics/brew/${brewId}`}
                            className="text-zinc-400 truncate hover:text-cyan-400 transition flex items-center gap-1 group"
                        >
                          {brew ? `${brew.name} (${brew.style})` : brewId.slice(0, 8)} 
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                        </Link>
                        <span className="text-white font-bold">{count}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Upgrade hint if limited */}
                {features && features.maxTopBrews < 10 && Object.keys(data.topBrews).length > features.maxTopBrews && (
                  <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>🔒</span>
                      <span>
                        {Object.keys(data.topBrews).length - features.maxTopBrews} weitere Rezepte verfügbar. 
                        <Link href="/dashboard/account" className="text-cyan-400 hover:underline ml-1">
                          Upgrade auf {userTier === 'brewer' ? 'Brewery' : 'Enterprise'}
                        </Link>
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Privacy Notice */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔒</div>
          <div>
            <h4 className="text-white font-bold mb-1">Datenschutz-freundliche Analytics</h4>
            <p className="text-sm text-zinc-500">
              Wir speichern keine IP-Adressen und verwenden tägliche Session-Hashes für anonyme Besucherzählung. 
              Rohdaten werden gemäß Datenschutzrichtlinie nach 12 Monaten automatisch gelöscht. Aggregierte Statistiken bleiben langfristig verfügbar.
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
