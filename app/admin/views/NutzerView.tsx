'use client'

import { useState, useEffect } from 'react'
import { Users, Zap, Gem, RefreshCw, Factory, FileText, Smartphone, Star } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import PieChart from '../components/charts/PieChart'
import AdminCard from '../components/AdminCard'
import {
  getUserGrowthChart,
  getActiveUsersCount,
  getCohortAnalysis,
  getUserTierDistribution,
  getAdminDashboardSummary,
  getBreweryDailyStats,
  getBreweryGrowthChart,
} from '@/lib/actions/analytics-admin-actions'
import { DateRange } from '@/lib/types/admin-analytics'

export default function NutzerView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [summary, growthChart, activeUsers, cohorts, tierDist, breweryStats, breweryGrowth] = await Promise.all([
        getAdminDashboardSummary(),
        getUserGrowthChart(dateRange),
        getActiveUsersCount(dateRange),
        getCohortAnalysis(),
        getUserTierDistribution(),
        getBreweryDailyStats(dateRange),
        getBreweryGrowthChart(dateRange),
      ])

      // Aggregate brewery stats
      const totalSessions = (breweryStats as unknown as Array<Record<string, number>>).reduce((sum, s) => sum + (s.sessions_count || 0), 0)
      const totalScans = (breweryStats as unknown as Array<Record<string, number>>).reduce((sum, s) => sum + (s.bottles_scanned || 0), 0)

      const breweryAggregation: Record<string, Record<string, number | string>> = {}
      ;(breweryStats as unknown as Array<Record<string, number | string>>).forEach((stat) => {
        const id = stat.brewery_id as string
        if (!breweryAggregation[id]) {
          breweryAggregation[id] = { brewery_id: id, members_count: 0, brews_count: 0, sessions_count: 0, bottles_scanned: 0 }
        }
        breweryAggregation[id].members_count = Math.max(breweryAggregation[id].members_count as number, (stat.members_count as number) || 0)
        breweryAggregation[id].brews_count = (breweryAggregation[id].brews_count as number) + ((stat.brews_count as number) || 0)
        breweryAggregation[id].sessions_count = (breweryAggregation[id].sessions_count as number) + ((stat.sessions_count as number) || 0)
        breweryAggregation[id].bottles_scanned = (breweryAggregation[id].bottles_scanned as number) + ((stat.bottles_scanned as number) || 0)
      })

      const topBreweries = Object.values(breweryAggregation)
        .sort((a, b) => (b.sessions_count as number) - (a.sessions_count as number))
        .slice(0, 10)

      setData({
        summary,
        growthChart,
        activeUsers,
        cohorts,
        tierDist,
        breweryStats,
        breweryGrowth,
        totalSessions,
        totalScans,
        topBreweries,
      })
    } catch (error) {
      console.error('Failed to load nutzer data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-(--brand) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Lade Nutzer-Daten...</p>
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

  const summary = data.summary as Record<string, number> | undefined
  const tierDist = data.tierDist as Record<string, number> | undefined
  const cohorts = data.cohorts as Array<Record<string, number | string>> | undefined
  const growthChart = data.growthChart as Array<Record<string, string | number>>
  const breweryGrowth = data.breweryGrowth as Array<Record<string, string | number>>
  const breweryStats = data.breweryStats as Array<Record<string, string | number>>
  const topBreweries = data.topBreweries as Array<Record<string, string | number>>

  const premiumCount = (tierDist?.brewer || 0) + (tierDist?.brewery || 0) + (tierDist?.enterprise || 0)
  const premiumPct = premiumCount > 0 && (summary?.totalUsers ?? 0) > 0
    ? `${((premiumCount / summary!.totalUsers) * 100).toFixed(1)}% vom Gesamt`
    : '0% vom Gesamt'

  return (
    <div className="space-y-6">
      {/* Header + Date Range */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-(--text-primary)">Nutzer & Wachstum</h2>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          availableRanges={['7d', '30d', '90d']}
        />
      </div>

      {/* KPI Strip — Users + Brewery combined */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Gesamt User" value={(summary?.totalUsers || 0).toLocaleString()} icon={<Users className="w-4 h-4" />} />
        <MetricCard title="Aktive User" value={((data.activeUsers as number) || 0).toLocaleString()} icon={<Zap className="w-4 h-4" />} />
        <MetricCard title="Premium User" value={premiumCount.toLocaleString()} icon={<Gem className="w-4 h-4" />} subValue={premiumPct} />
        <MetricCard title="Retention (D30)" value={`${cohorts?.[0]?.retention_day30 || 0}%`} icon={<RefreshCw className="w-4 h-4" />} />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard title="Brauereien" value={(summary?.totalBreweries || 0).toLocaleString()} icon={<Factory className="w-4 h-4" />} />
        <MetricCard title="Sessions (Zeitraum)" value={((data.totalSessions as number) || 0).toLocaleString()} icon={<FileText className="w-4 h-4" />} />
        <MetricCard title="Bottle Scans" value={((data.totalScans as number) || 0).toLocaleString()} icon={<Smartphone className="w-4 h-4" />} />
      </div>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard title="User Growth">
          <LineChart data={growthChart} xKey="date" yKeys={[{ key: 'newUsers', color: '#0070f3', label: 'New Users' }]} />
        </AdminCard>
        <AdminCard title="Brewery Growth">
          <LineChart data={breweryGrowth} xKey="date" yKeys={[{ key: 'newBreweries', color: '#0070f3', label: 'New Breweries' }]} />
        </AdminCard>
      </div>

      {/* Tier Distribution + Cohort Retention */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard title="Tier Distribution">
          <PieChart
            data={[
              { name: 'Free', value: tierDist?.free || 0 },
              { name: 'Brewer', value: tierDist?.brewer || 0 },
              { name: 'Brewery', value: tierDist?.brewery || 0 },
              { name: 'Enterprise', value: tierDist?.enterprise || 0 },
            ]}
            nameKey="name"
            valueKey="value"
          />
        </AdminCard>

        <AdminCard title="Cohort Retention">
          <div className="space-y-3">
            {cohorts?.slice(0, 6).map((cohort) => (
              <div key={cohort.cohort_id as string} className="bg-(--surface-sunken) rounded-md p-3 border border-(--border-subtle)">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-mono text-(--text-primary)">{cohort.cohort_id as string}</span>
                  <span className="text-xs text-(--text-muted)">{cohort.user_count as number} Users</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  {(['D1', 'D7', 'D30', 'D90'] as const).map((label) => {
                    const key = `retention_day${label.slice(1)}` as string
                    return (
                      <div key={label}>
                        <p className="text-(--text-disabled) mb-0.5">{label}</p>
                        <p className="text-(--text-primary)">{cohort[key] as number}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {/* Brewery Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard title="Sessions / Tag">
          <BarChart
            data={breweryStats.slice(0, 14).reverse()}
            xKey="date"
            yKeys={[{ key: 'sessions_count', color: 'var(--text-primary)', label: 'Sessions' }]}
          />
        </AdminCard>
        <AdminCard title="Bottle Scans / Tag">
          <BarChart
            data={breweryStats.slice(0, 14).reverse()}
            xKey="date"
            yKeys={[{ key: 'bottles_scanned', color: 'var(--text-muted)', label: 'Scans' }]}
          />
        </AdminCard>
      </div>

      {/* Top Breweries */}
      <AdminCard title="Top Breweries">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border) text-left">
                <th className="py-3 px-4 text-(--text-muted) font-medium">#</th>
                <th className="py-3 px-4 text-(--text-muted) font-medium">Brewery ID</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Members</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Brews</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Sessions</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Scans</th>
              </tr>
            </thead>
            <tbody>
              {topBreweries.map((stat, index) => (
                <tr key={stat.brewery_id as string} className="border-b border-(--border) last:border-0 hover:bg-(--surface-hover)/50">
                  <td className="py-3 px-4 text-(--text-muted)">{index + 1}</td>
                  <td className="py-3 px-4 font-mono text-xs text-(--text-primary)">
                    {(stat.brewery_id as string).slice(0, 8)}...
                  </td>
                  <td className="py-3 px-4 text-right text-(--text-primary) font-mono">{stat.members_count || 0}</td>
                  <td className="py-3 px-4 text-right text-(--text-primary) font-mono">{stat.brews_count || 0}</td>
                  <td className="py-3 px-4 text-right text-(--text-primary) font-mono">{stat.sessions_count || 0}</td>
                  <td className="py-3 px-4 text-right text-(--text-primary) font-mono">{stat.bottles_scanned || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Engagement Metrics */}
      <AdminCard title="Engagement Metrics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-(--border) rounded-md">
            <p className="text-xs text-(--text-muted) uppercase mb-2">Avg Events/User</p>
            <p className="text-2xl font-mono text-(--text-primary)">{cohorts?.[0]?.avg_events_per_user || '0'}</p>
          </div>
          <div className="p-4 border border-(--border) rounded-md">
            <p className="text-xs text-(--text-muted) uppercase mb-2">Ø Brews/User</p>
            <p className="text-2xl font-mono text-(--text-primary)">{cohorts?.[0]?.avg_brews_per_user || '0'}</p>
          </div>
          <div className="p-4 border border-(--border) rounded-md">
            <p className="text-xs text-(--text-muted) uppercase mb-2">Registrierungen (gesamt)</p>
            <p className="text-2xl font-mono text-(--text-primary)">{(summary?.totalUsers || 0).toLocaleString()}</p>
          </div>
        </div>
      </AdminCard>
    </div>
  )
}
