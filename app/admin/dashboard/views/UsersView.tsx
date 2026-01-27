'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import PieChart from '../components/charts/PieChart'
import {
  getUserGrowthChart,
  getActiveUsersCount,
  getCohortAnalysis,
  getUserTierDistribution,
  triggerAggregation,
  getAdminDashboardSummary
} from '@/lib/actions/analytics-admin-actions'
import { DateRange } from '@/lib/types/admin-analytics'

export default function UsersView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [aggLoading, setAggLoading] = useState(false)
  const [aggMessage, setAggMessage] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [summary, growthChart, activeUsers, cohorts, tierDist] = await Promise.all([
        getAdminDashboardSummary(),
        getUserGrowthChart(dateRange),
        getActiveUsersCount(dateRange),
        getCohortAnalysis(),
        getUserTierDistribution()
      ])

      setData({
        summary,
        growthChart,
        activeUsers,
        cohorts,
        tierDist
      })
    } catch (error) {
      console.error('Failed to load users data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRunAggregation() {
    try {
      setAggLoading(true)
      setAggMessage(null)
      // Run daily and cohort aggregations to populate analytics tables
      await triggerAggregation('daily')
      await triggerAggregation('cohorts')
      setAggMessage('Aggregation abgeschlossen — lade Daten neu...')
      await loadData()
      setAggMessage('Daten aktualisiert')
    } catch (error) {
      console.error('Aggregation failed', error)
      setAggMessage('Aggregation fehlgeschlagen — siehe Konsole')
    } finally {
      setAggLoading(false)
      setTimeout(() => setAggMessage(null), 6000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Lade User-Daten...</p>
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
        {/* Aggregation button removed (already available under Einstellungen) */}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <MetricCard
          title="Gesamt User"
          value={(data.summary?.totalUsers || 0).toLocaleString()}
          icon="👥"
        />
        <MetricCard
          title="Aktive User"
          value={(data.activeUsers || 0).toLocaleString()}
          icon="⚡"
        />
        <MetricCard
          title="Premium User"
          value={((data.tierDist?.brewer || 0) + (data.tierDist?.brewery || 0) + (data.tierDist?.enterprise || 0)).toLocaleString()}
          icon="💎"
          subValue={((data.tierDist?.brewer || 0) + (data.tierDist?.brewery || 0) + (data.tierDist?.enterprise || 0)) > 0 && data.summary?.totalUsers > 0
            ? `${((((data.tierDist?.brewer || 0) + (data.tierDist?.brewery || 0) + (data.tierDist?.enterprise || 0)) / data.summary.totalUsers) * 100).toFixed(1)}% vom Gesamt`
            : '0% vom Gesamt'}
        />
        <MetricCard
          title="Retention (D30)"
          value={`${data.cohorts?.[0]?.retention_day30 || 0}%`}
          icon="🔁"
        />
      </div>

      {/* User Growth Chart */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">User Growth</h3>
        <LineChart
          data={data.growthChart}
          xKey="date"
          yKeys={[{ key: 'newUsers', color: '#0070f3', label: 'New Users' }]}
        />
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Tier Distribution</h3>
          <PieChart
            data={[
              { name: 'Free', value: data.tierDist.free },
              { name: 'Brewer', value: data.tierDist.brewer },
              { name: 'Brewery', value: data.tierDist.brewery },
              { name: 'Enterprise', value: data.tierDist.enterprise }
            ]}
            nameKey="name"
            valueKey="value"
          />
        </div>

        {/* Cohort Retention */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Cohort Retention</h3>
          <div className="space-y-3">
            {data.cohorts.slice(0, 6).map((cohort: any) => (
              <div key={cohort.cohort_id} className="bg-zinc-900/50 rounded-md p-3 border border-zinc-800/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-mono text-white">{cohort.cohort_id}</span>
                  <span className="text-xs text-zinc-500">{cohort.user_count} Users</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <p className="text-zinc-600 mb-0.5">D1</p>
                    <p className="text-white">{cohort.retention_day1}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-0.5">D7</p>
                    <p className="text-white">{cohort.retention_day7}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-0.5">D30</p>
                    <p className="text-white">{cohort.retention_day30}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-0.5">D90</p>
                    <p className="text-white">{cohort.retention_day90}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Engagement Stats */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">Engagement Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-zinc-800 rounded-md">
            <p className="text-xs text-zinc-500 uppercase mb-2">Avg Events/User</p>
            <p className="text-2xl font-mono text-white">
              {data.cohorts?.[0]?.avg_events_per_user || '0'}
            </p>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase mb-1">Ø Brews/User</p>
            <p className="text-2xl font-bold text-white">
              {data.cohorts?.[0]?.avg_brews_per_user || '0'}
            </p>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase mb-1">Registrierungen (gesamt)</p>
            <p className="text-2xl font-bold text-white">
              {(data.summary?.totalUsers || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
