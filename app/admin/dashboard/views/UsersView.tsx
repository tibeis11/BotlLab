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
  getAdminDashboardSummary
} from '@/lib/actions/analytics-admin-actions'
import { DateRange } from '@/lib/types/admin-analytics'

export default function UsersView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
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
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">📈 User-Wachstum</h3>
        <LineChart
          data={data.growthChart}
          xKey="date"
          yKeys={[{ key: 'newUsers', color: '#06b6d4', label: 'Neue User' }]}
        />
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">🎯 Tier-Verteilung</h3>
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
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">📊 Cohort Retention</h3>
          <div className="space-y-3">
            {data.cohorts.slice(0, 6).map((cohort: any) => (
              <div key={cohort.cohort_id} className="bg-zinc-950 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-mono text-cyan-400">{cohort.cohort_id}</span>
                  <span className="text-xs text-zinc-500">{cohort.user_count} Users</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-zinc-600">D1</p>
                    <p className="text-white font-bold">{cohort.retention_day1}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-600">D7</p>
                    <p className="text-white font-bold">{cohort.retention_day7}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-600">D30</p>
                    <p className="text-white font-bold">{cohort.retention_day30}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-600">D90</p>
                    <p className="text-white font-bold">{cohort.retention_day90}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Engagement Stats */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🔥 Engagement Metriken</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-950 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase mb-1">Ø Events/User</p>
            <p className="text-2xl font-bold text-white">
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
