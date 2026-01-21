'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import { getBreweryDailyStats, getBreweryGrowthChart, getAdminDashboardSummary } from '@/lib/actions/analytics-admin-actions'
import { DateRange } from '@/lib/types/admin-analytics'

export default function BusinessView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [summary, breweryStats, growthChart] = await Promise.all([
        getAdminDashboardSummary(),
        getBreweryDailyStats(dateRange),
        getBreweryGrowthChart(dateRange)
      ])

      // Calculate aggregated stats
      const totalSessions = breweryStats.reduce((sum, stat) => sum + (stat.sessions_count || 0), 0)
      const totalScans = breweryStats.reduce((sum, stat) => sum + (stat.bottles_scanned || 0), 0)
      const avgActiveMembers = breweryStats.length > 0 
        ? breweryStats.reduce((sum, stat) => sum + (stat.active_members || 0), 0) / breweryStats.length 
        : 0

      setData({
        summary,
        breweryStats,
        growthChart,
        totalSessions,
        totalScans,
        avgActiveMembers
      })
    } catch (error) {
      console.error('Failed to load business data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Lade Business-Daten...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-zinc-900/50 border border-red-800 rounded-xl p-8 text-center">
        <p className="text-red-400">Fehler beim Laden der Daten</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <DateRangePicker 
          value={dateRange} 
          onChange={setDateRange} 
          availableRanges={['7d', '30d', '90d']}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <MetricCard
          title="Gesamt Brauereien"
          value={(data.summary?.totalBreweries || 0).toLocaleString()}
          icon="🏭"
        />
        <MetricCard
          title="Sessions"
          value={(data.totalSessions || 0).toLocaleString()}
          icon="📝"
        />
        <MetricCard
          title="Bottle Scans"
          value={(data.totalScans || 0).toLocaleString()}
          icon="📱"
        />
        <MetricCard
          title="Ø Aktive Mitglieder"
          value={(data.avgActiveMembers || 0).toFixed(1)}
          icon="👥"
        />
      </div>

      {/* Brewery Growth Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">📈 Brewery-Wachstum</h3>
        <LineChart
          data={data.growthChart}
          xKey="date"
          yKeys={[{ key: 'newBreweries', color: '#06b6d4', label: 'Neue Brauereien' }]}
        />
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">🍺 Sessions pro Tag</h3>
          <BarChart
            data={data.breweryStats.slice(0, 14).reverse()}
            xKey="date"
            yKeys={[{ key: 'sessions_count', color: '#06b6d4', label: 'Sessions' }]}
          />
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">📱 Bottle Scans pro Tag</h3>
          <BarChart
            data={data.breweryStats.slice(0, 14).reverse()}
            xKey="date"
            yKeys={[{ key: 'bottles_scanned', color: '#10b981', label: 'Scans' }]}
          />
        </div>
      </div>

      {/* Top Performing Breweries */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🏆 Top Brauereien (nach Aktivität)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">#</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Brewery ID</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">Mitglieder</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">Brews</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">Sessions</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">Scans</th>
              </tr>
            </thead>
            <tbody>
              {data.breweryStats
                .sort((a: any, b: any) => (b.sessions_count || 0) - (a.sessions_count || 0))
                .slice(0, 10)
                .map((stat: any, index: number) => (
                  <tr key={stat.brewery_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 px-4 text-zinc-500">{index + 1}</td>
                    <td className="py-3 px-4 font-mono text-xs text-cyan-400">
                      {stat.brewery_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      {stat.members_count || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      {stat.brews_count || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-bold">
                      {stat.sessions_count || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-green-400 font-medium">
                      {stat.bottles_scanned || 0}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Insights */}
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💎</span>
          <h3 className="text-xl font-bold text-white">Premium Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase mb-1">Premium Conversion</p>
            <p className="text-2xl font-bold text-purple-400">Coming Soon</p>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase mb-1">Ø Revenue / Brewery</p>
            <p className="text-2xl font-bold text-green-400">Coming Soon</p>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase mb-1">Churn Rate</p>
            <p className="text-2xl font-bold text-red-400">Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
