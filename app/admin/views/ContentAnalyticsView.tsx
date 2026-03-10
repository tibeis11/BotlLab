'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import PieChart from '../components/charts/PieChart'
import AdminCard from '../components/AdminCard'
import { getContentDailyStats, getTopBrews, getRatingDistribution } from '@/lib/actions/analytics-admin-actions'
import { DateRange } from '@/lib/types/admin-analytics'
import { Beer, FileText, Wine, Star } from 'lucide-react'

export default function ContentAnalyticsView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [contentStats, topBrews, ratingDist] = await Promise.all([
        getContentDailyStats(dateRange),
        getTopBrews(10),
        getRatingDistribution(),
      ])

      const stats = contentStats as Array<Record<string, number | string>>
      const latestStats = stats[0] || {}

      setData({ contentStats: stats, topBrews, ratingDist, latestStats })
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
          <div className="w-12 h-12 border-4 border-(--brand) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Lade Content-Daten...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-(--surface)/50 border border-red-800 rounded-xl p-8 text-center">
        <p className="text-(--error)">Fehler beim Laden der Daten</p>
      </div>
    )
  }

  const latest = data.latestStats as Record<string, number>
  const contentStats = data.contentStats as Array<Record<string, string | number>>
  const topBrews = data.topBrews as Array<Record<string, string | number>>
  const ratingDist = data.ratingDist as Array<Record<string, string | number>>

  return (
    <div className="space-y-6">
      {/* Header + Date Range */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-(--text-primary)">Content Analytics</h2>
        <DateRangePicker value={dateRange} onChange={setDateRange} availableRanges={['7d', '30d', '90d']} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Gesamt Brews" value={latest.total_brews?.toLocaleString() || '0'} icon={<Beer className="w-4 h-4" />} />
        <MetricCard title="Gesamt Sessions" value={latest.total_sessions?.toLocaleString() || '0'} icon={<FileText className="w-4 h-4" />} />
        <MetricCard title="Gesamt Bottles" value={latest.total_bottles?.toLocaleString() || '0'} icon={<Wine className="w-4 h-4" />} />
        <MetricCard title="Ø Rating" value={latest.avg_rating || '0.0'} icon={<Star className="w-4 h-4" />} />
      </div>

      {/* Content Growth */}
      <AdminCard title="Content Growth">
        <LineChart
          data={contentStats.slice(0, 30).reverse()}
          xKey="date"
          yKeys={[{ key: 'brews_created_today', color: '#0070f3', label: 'New Brews' }]}
        />
      </AdminCard>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard title="Visibility">
          <PieChart
            data={[
              { name: 'Public', value: latest.public_brews || 0 },
              { name: 'Private', value: latest.private_brews || 0 },
              { name: 'Team', value: latest.team_brews || 0 },
            ]}
            nameKey="name"
            valueKey="value"
          />
        </AdminCard>

        <AdminCard title="Ratings">
          <PieChart data={ratingDist} nameKey="label" valueKey="count" />
        </AdminCard>
      </div>

      {/* Top Brews */}
      <AdminCard title="Top Brews (by Bottles)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border) text-left">
                <th className="py-3 px-4 text-(--text-muted) font-medium">#</th>
                <th className="py-3 px-4 text-(--text-muted) font-medium">Name</th>
                <th className="py-3 px-4 text-(--text-muted) font-medium">Style</th>
                <th className="text-center py-3 px-4 text-(--text-muted) font-medium">Visibility</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Bottles</th>
              </tr>
            </thead>
            <tbody>
              {topBrews.map((brew, index) => (
                <tr key={brew.id as string} className="border-b border-(--border)/50 hover:bg-(--surface-hover)/30">
                  <td className="py-3 px-4 text-(--text-muted)">{index + 1}</td>
                  <td className="py-3 px-4 text-(--text-primary) font-medium">{brew.name as string}</td>
                  <td className="py-3 px-4 text-(--text-secondary)">{(brew.style as string) || 'N/A'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      brew.visibility === 'public' ? 'bg-green-900/50 text-green-400'
                        : brew.visibility === 'team' ? 'bg-blue-900/50 text-blue-400'
                        : 'bg-(--surface-hover) text-(--text-secondary)'
                    }`}>
                      {brew.visibility as string}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-(--brand) font-bold">{brew.bottle_count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  )
}
