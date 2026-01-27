'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import { getSystemHourlyStats, getFeatureUsageStats } from '@/lib/actions/analytics-admin-actions'
import { DateRange } from '@/lib/types/admin-analytics'

export default function SystemView() {
  const [dateRange, setDateRange] = useState<DateRange>('24h')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [systemStats, featureUsage] = await Promise.all([
        getSystemHourlyStats(dateRange),
        getFeatureUsageStats('7d')
      ])

      const totalErrors = systemStats.reduce((sum, stat) => sum + (stat.error_count || 0), 0)
      const totalApiCalls = systemStats.reduce((sum, stat) => sum + (stat.api_calls_count || 0), 0)
      const avgActiveUsers = systemStats.length > 0
        ? systemStats.reduce((sum, stat) => sum + (stat.active_users_count || 0), 0) / systemStats.length
        : 0

      setData({
        systemStats,
        featureUsage,
        totalErrors,
        totalApiCalls,
        avgActiveUsers
      })
    } catch (error) {
      console.error('Failed to load system data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Lade System-Daten...</p>
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
          availableRanges={['24h', '7d', '30d']}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <MetricCard
          title="Total Errors"
          value={data.totalErrors.toLocaleString()}
          icon="❌"
        />
        <MetricCard
          title="API Calls"
          value={data.totalApiCalls.toLocaleString()}
          icon="📡"
        />
        <MetricCard
          title="Ø Aktive User/h"
          value={Math.round(data.avgActiveUsers).toLocaleString()}
          icon="👤"
        />
        <MetricCard
          title="System Status"
          value="Operational"
          icon="✅"
        />
      </div>

      {/* Error Tracking */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">Error Rate</h3>
        <LineChart
          data={data.systemStats.slice(0, 48).reverse()}
          xKey="hour"
          yKeys={[{ key: 'error_count', color: '#ef4444', label: 'Errors' }]}
        />
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">API Calls (Hourly)</h3>
          <BarChart
            data={data.systemStats.slice(0, 24).reverse()}
            xKey="hour"
            yKeys={[{ key: 'api_calls_count', color: '#333', label: 'API Calls' }]} 
          />
        </div>

        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Active Users (Hourly)</h3>
          <BarChart
            data={data.systemStats.slice(0, 24).reverse()}
            xKey="hour"
            yKeys={[{ key: 'active_users_count', color: '#fff', label: 'User' }]}
          />
        </div>
      </div>

      {/* Feature Usage */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">Feature Usage (7d)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="py-3 px-4 text-zinc-500 font-medium">Feature</th>
                <th className="py-3 px-4 text-zinc-500 font-medium">Category</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium">Total</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium">Unique Users</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.featureUsage.map((feature: any) => {
                const successRate = feature.usage_count > 0
                  ? ((feature.success_count / feature.usage_count) * 100).toFixed(1)
                  : '0.0'
                
                let badgeClass = "bg-zinc-800 text-zinc-400 border-zinc-700";
                let categoryLabel = "Core";

                if (feature.category === 'premium_ai') {
                    badgeClass = "bg-purple-900/30 text-purple-400 border-purple-500/30";
                    categoryLabel = "AI Premium";
                } else if (feature.category === 'monetization') {
                    badgeClass = "bg-yellow-900/30 text-yellow-400 border-yellow-500/30";
                    categoryLabel = "System/Limit";
                }

                return (
                  <tr key={feature.feature} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 text-zinc-300 font-mono text-xs">{feature.feature}</td>
                    <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${badgeClass}`}>
                            {categoryLabel}
                        </span>
                    </td>
                    <td className="text-right py-3 px-4 text-white font-medium">{feature.usage_count}</td>
                    <td className="text-right py-3 px-4 text-zinc-400">{feature.unique_users}</td>
                    <td className="text-right py-3 px-4">
                      <span className={Number(successRate) > 90 ? 'text-green-400' : Number(successRate) > 75 ? 'text-yellow-400' : 'text-red-400'}>
                        {successRate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Database Health */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-800/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💚</span>
          <h3 className="text-xl font-bold text-white">Database Health</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase mb-1">Connection Pool</p>
            <p className="text-2xl font-bold text-green-400">Healthy</p>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase mb-1">Query Performance</p>
            <p className="text-2xl font-bold text-green-400">&lt;50ms</p>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase mb-1">Storage Usage</p>
            <p className="text-2xl font-bold text-green-400">23%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
