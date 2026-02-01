
'use client'


import { useEffect, useState } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import PieChart from '../components/charts/PieChart'
import { DateRange } from '@/lib/types/admin-analytics'
import {
  getAdminDashboardSummary,
  getUserGrowthChart,
  getContentDailyStats,
  getFeatureUsageSummary,
  getRatingDistribution
} from '@/lib/actions/analytics-admin-actions'

export default function OverviewView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [userGrowth, setUserGrowth] = useState<any[]>([])
  const [contentStats, setContentStats] = useState<any[]>([])
  const [featureUsage, setFeatureUsage] = useState<any[]>([])
  const [ratingDist, setRatingDist] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [summaryData, growthData, contentData, featureData, ratingData] = await Promise.all([
        getAdminDashboardSummary(),
        getUserGrowthChart(dateRange),
        getContentDailyStats(dateRange),
        getFeatureUsageSummary(dateRange),
        getRatingDistribution()
      ])

      setSummary(summaryData)
      setUserGrowth(growthData)
      setContentStats(contentData)
      setFeatureUsage(featureData.map(f => ({ name: f.feature, value: f.usageCount })))
      setRatingDist(ratingData.map(r => ({ name: r.label, value: r.count })))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">

        <div>
          <h2 className="text-2xl font-black text-white">Dashboard Übersicht</h2>
          <p className="text-zinc-500 text-sm">Zentrale Metriken und Trends</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <MetricCard
          title="Total Users"
          value={summary?.totalUsers.toLocaleString() || '0'}
          icon="👥"
          loading={loading}
        />
        <MetricCard
          title="Active Users (30d)"
          value={summary?.activeUsers.toLocaleString() || '0'}
          icon="🔥"
          loading={loading}
        />
        <MetricCard
          title="Total Brews"
          value={summary?.totalBrews.toLocaleString() || '0'}
          icon="🍺"
          loading={loading}
        />
        <MetricCard
          title="QR Scans"
          value={summary?.totalScans.toLocaleString() || '0'}
          icon="📱"
          loading={loading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">User Growth</h3>
          <LineChart
            data={userGrowth}
            xKey="date"
            yKeys={[
              { key: 'newUsers', color: '#0070f3', label: 'New Users' }, // Vercel Blue
              { key: 'totalUsers', color: '#666', label: 'Total' }
            ]}
          />
        </div>

        {/* Content Growth */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Content Creation</h3>
          <BarChart
            data={contentStats.slice(-14)}
            xKey="date"
            yKeys={[
              { key: 'brews_created_today', color: '#fff', label: 'Brews' },
              { key: 'sessions_created_today', color: '#333', label: 'Sessions' }
            ]}
          />
        </div>

        {/* Feature Usage */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Feature Usage</h3>
          <PieChart
            data={featureUsage}
            nameKey="name"
            valueKey="value"
          />
        </div>

        {/* Rating Distribution */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Ratings</h3>
          <BarChart
            data={ratingDist}
            xKey="name"
            yKeys={[
              { key: 'value', color: '#0070f3', label: 'Count' }
            ]}
          />
        </div>
      </div>

      {/* System Health Quick Stats */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-zinc-500 uppercase mb-1">Errors (24h)</p>
            <p className="text-2xl font-mono text-white">{summary?.errorCount || 0}</p>

          </div>
          <div>
            <p className="text-zinc-500 text-sm mb-1">Avg Rating</p>
            <p className="text-2xl font-black text-white">{summary?.avgRating || '0.0'} ⭐</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm mb-1">Total Sessions</p>
            <p className="text-2xl font-black text-white">{summary?.totalSessions.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm mb-1">Uptime</p>
            <p className="text-2xl font-black text-green-400">99.9%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
