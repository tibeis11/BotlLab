'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import PieChart from '../components/charts/PieChart'
import { getContentDailyStats, getTopBrews, getRatingDistribution } from '@/lib/actions/analytics-admin-actions'
import { DateRange } from '@/lib/types/admin-analytics'

export default function ContentView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [contentStats, topBrews, ratingDist] = await Promise.all([
        getContentDailyStats(dateRange),
        getTopBrews(10),
        getRatingDistribution()
      ])

      const latestStats = contentStats[0] || {}
      const totalRatingsInRange = contentStats.reduce((sum, stat) => sum + (stat.total_ratings || 0), 0)

      setData({
        contentStats,
        topBrews,
        ratingDist,
        latestStats,
        totalRatingsInRange
      })
    } catch (error) {
      console.error('Failed to load content data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Lade Content-Daten...</p>
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
          title="Gesamt Brews"
          value={data.latestStats.total_brews?.toLocaleString() || '0'}
          icon="🍺"
        />
        <MetricCard
          title="Gesamt Sessions"
          value={data.latestStats.total_sessions?.toLocaleString() || '0'}
          icon="📝"
        />
        <MetricCard
          title="Gesamt Bottles"
          value={data.latestStats.total_bottles?.toLocaleString() || '0'}
          icon="🍾"
        />
        <MetricCard
          title="Ø Rating"
          value={data.latestStats.avg_rating || '0.0'}
          icon="⭐"
        />
      </div>

      {/* Content Growth */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">Content Growth</h3>
        <LineChart
          data={data.contentStats.slice(0, 30).reverse()}
          xKey="date"
          yKeys={[{ key: 'brews_created_today', color: '#0070f3', label: 'New Brews' }]}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visibility Distribution */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Visibility</h3>
          <PieChart
            data={[
              { name: 'Public', value: data.latestStats.public_brews || 0 },
              { name: 'Private', value: data.latestStats.private_brews || 0 },
              { name: 'Team', value: data.latestStats.team_brews || 0 }
            ]}
            nameKey="name"
            valueKey="value"
          />
        </div>

        {/* Rating Distribution */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Ratings</h3>
          <PieChart
            data={data.ratingDist}
            nameKey="label"
            valueKey="count"
          />
        </div>
      </div>

      {/* Top Brews */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">Top Brews (by Bottles)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="py-3 px-4 text-zinc-500 font-medium">#</th>
                <th className="py-3 px-4 text-zinc-500 font-medium">Name</th>
                <th className="py-3 px-4 text-zinc-500 font-medium">Style</th>
                <th className="text-center py-3 px-4 text-zinc-500 font-medium">Visibility</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium">Bottles</th>
              </tr>
            </thead>
            <tbody>
              {data.topBrews.map((brew: any, index: number) => (
                <tr key={brew.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-4 text-zinc-500">{index + 1}</td>
                  <td className="py-3 px-4 text-white font-medium">{brew.name}</td>
                  <td className="py-3 px-4 text-zinc-400">{brew.style || 'N/A'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      brew.visibility === 'public' ? 'bg-green-900/50 text-green-400' :
                      brew.visibility === 'team' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {brew.visibility}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-bold">
                    {brew.bottle_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
