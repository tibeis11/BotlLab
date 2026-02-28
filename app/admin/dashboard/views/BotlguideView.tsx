'use client'

import { useState, useEffect } from 'react'
import {
  getBotlguideFeedback,
  getBotlguideFeedbackStats,
  type BotlguideFeedbackItem,
  type BotlguideFeedbackStats,
} from '@/lib/actions/analytics-admin-actions'
import DateRangePicker from '../components/DateRangePicker'
import MetricCard from '../components/MetricCard'
import BarChart from '../components/charts/BarChart'
import { DateRange } from '@/lib/types/admin-analytics'
import { ThumbsUp, ThumbsDown, BookOpen } from 'lucide-react'

export default function BotlguideView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [stats, setStats] = useState<BotlguideFeedbackStats | null>(null)
  const [items, setItems] = useState<BotlguideFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerated, setShowGenerated] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, itemsData] = await Promise.all([
        getBotlguideFeedbackStats(dateRange),
        getBotlguideFeedback(dateRange, 100),
      ])
      setStats(statsData)
      setItems(itemsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const chartData = stats?.byContext.slice(0, 15).map(c => ({
    name: c.context_key.split('.').slice(-2).join('.'), // Show last 2 segments
    up: c.up,
    down: c.down,
    fullKey: c.context_key,
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-2xl font-black text-white">BotlGuide Feedback</h2>
          </div>
          <p className="text-zinc-500 text-sm">Nutzer-Feedback zu KI-generierten Brau-Erklärungen</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gesamt Feedbacks"
          value={(stats?.total || 0).toLocaleString()}
          icon="💬"
          loading={loading}
        />
        <MetricCard
          title="Positiv 👍"
          value={(stats?.thumbsUp || 0).toLocaleString()}
          icon="✅"
          loading={loading}
        />
        <MetricCard
          title="Negativ 👎"
          value={(stats?.thumbsDown || 0).toLocaleString()}
          icon="❌"
          loading={loading}
        />
        <MetricCard
          title="Positiv-Rate"
          value={`${stats?.positiveRate || 0}%`}
          icon={stats?.positiveRate && stats.positiveRate >= 75 ? '🟢' : stats?.positiveRate && stats.positiveRate >= 50 ? '🟡' : '🔴'}
          loading={loading}
        />
      </div>

      {/* Overall Health */}
      {stats && stats.total > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3">Gesamt-Zufriedenheit</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-zinc-800 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                style={{ width: `${stats.positiveRate}%` }}
              />
            </div>
            <span className="text-white font-bold text-sm w-12 text-right">{stats.positiveRate}%</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>0%</span>
            <span className={stats.positiveRate >= 75 ? 'text-green-500' : stats.positiveRate >= 50 ? 'text-yellow-500' : 'text-red-500'}>
              {stats.positiveRate >= 75 ? '👍 Gut' : stats.positiveRate >= 50 ? '⚠️ Verbesserungsbedarf' : '🔴 Kritisch'}
            </span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Context Breakdown Chart */}
      {chartData.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-400 mb-4">Top 15 Context-Schlüssel (Positiv/Negativ)</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <BarChart
                data={chartData}
                xKey="name"
                yKeys={[
                  { key: 'up', color: '#22c55e', label: '👍 Positiv' },
                  { key: 'down', color: '#ef4444', label: '👎 Negativ' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Context Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-bold text-white">Alle Context-Schlüssel</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Geordnet nach Gesamt-Feedback</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs">Context Key</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium text-xs">Positiv</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium text-xs">Negativ</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium text-xs">Gesamt</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium text-xs">Rate</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.byContext || []).map(c => {
                const rate = c.total > 0 ? Math.round((c.up / c.total) * 100) : 0
                return (
                  <tr key={c.context_key} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 font-mono text-xs text-zinc-300">{c.context_key}</td>
                    <td className="text-right py-3 px-4 text-green-400 font-medium">{c.up}</td>
                    <td className="text-right py-3 px-4 text-red-400 font-medium">{c.down}</td>
                    <td className="text-right py-3 px-4 text-white">{c.total}</td>
                    <td className="text-right py-3 px-4">
                      <span className={`text-xs font-bold ${rate >= 75 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Feedback with Generated Text */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-bold text-white">Letztes Feedback (100)</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Klicke auf einen Eintrag um den generierten Text zu sehen</p>
        </div>
        <div className="divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">Kein Feedback im gewählten Zeitraum</div>
          ) : items.map(item => (
            <div key={item.id} className="p-3">
              <div
                className="flex items-start gap-3 cursor-pointer hover:bg-zinc-800/30 rounded-lg p-2 -m-2 transition"
                onClick={() => setShowGenerated(showGenerated === item.id ? null : item.id)}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                  item.feedback === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {item.feedback === 'up' ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-zinc-400 truncate">{item.context_key}</p>
                  <p className="text-[10px] text-zinc-600">{new Date(item.created_at).toLocaleString('de')}</p>
                </div>
                {item.generated_text && (
                  <span className="text-[10px] text-zinc-600 flex-shrink-0">
                    {showGenerated === item.id ? '▲' : '▼'}
                  </span>
                )}
              </div>
              {showGenerated === item.id && item.generated_text && (
                <div className="mt-2 ml-10 bg-zinc-800 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                  {item.generated_text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
