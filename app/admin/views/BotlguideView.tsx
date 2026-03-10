'use client'

import { useState, useEffect } from 'react'
import {
  getBotlguideFeedback,
  getBotlguideFeedbackStats,
  getBotlguideUsageStats,
  type BotlguideFeedbackItem,
  type BotlguideFeedbackStats,
  type BotlguideUsageStats,
} from '@/lib/actions/analytics-admin-actions'
import DateRangePicker from '../components/DateRangePicker'
import MetricCard from '../components/MetricCard'
import BarChart from '../components/charts/BarChart'
import { DateRange } from '@/lib/types/admin-analytics'
import { ThumbsUp, ThumbsDown, BookOpen, Zap, Clock, AlertTriangle as AlertTriangleIcon, Users, TrendingUp, Coins, User, MessageCircle, CheckCircle2, XCircle } from 'lucide-react'

export default function BotlguideView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [stats, setStats] = useState<BotlguideFeedbackStats | null>(null)
  const [usageStats, setUsageStats] = useState<BotlguideUsageStats | null>(null)
  const [items, setItems] = useState<BotlguideFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerated, setShowGenerated] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'usage' | 'feedback'>('usage')

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, itemsData, usageData] = await Promise.all([
        getBotlguideFeedbackStats(dateRange),
        getBotlguideFeedback(dateRange, 100),
        getBotlguideUsageStats(dateRange),
      ])
      setStats(statsData)
      setItems(itemsData)
      setUsageStats(usageData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-(--brand) border-t-transparent rounded-full animate-spin" />
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
            <h2 className="text-2xl font-black text-(--text-primary)">BotlGuide Analytics</h2>
          </div>
          <p className="text-(--text-muted) text-sm">Usage, Performance & Feedback-Monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-(--surface-hover) rounded-lg p-0.5">
            <button
              onClick={() => setActiveSection('usage')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                activeSection === 'usage' ? 'bg-purple-600 text-white' : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              <Zap className="w-3 h-3 inline mr-1" />Usage
            </button>
            <button
              onClick={() => setActiveSection('feedback')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                activeSection === 'feedback' ? 'bg-purple-600 text-white' : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              <ThumbsUp className="w-3 h-3 inline mr-1" />Feedback
            </button>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* ══ USAGE SECTION ═════════════════════════════════════════════════════ */}
      {activeSection === 'usage' && (
        <>
          {/* Usage KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="API Calls"
              value={(usageStats?.totalCalls || 0).toLocaleString()}
              icon={<Zap className="w-4 h-4" />}
              loading={loading}
            />
            <MetricCard
              title="Credits verbraucht"
              value={(usageStats?.totalCredits || 0).toLocaleString()}
              icon={<Coins className="w-4 h-4" />}
              loading={loading}
            />
            <MetricCard
              title="Unique Users"
              value={(usageStats?.uniqueUsers || 0).toLocaleString()}
              icon={<User className="w-4 h-4" />}
              loading={loading}
            />
            <MetricCard
              title="P95 Response"
              value={usageStats?.p95ResponseMs ? `${(usageStats.p95ResponseMs / 1000).toFixed(1)}s` : '–'}
              icon={usageStats?.p95ResponseMs && usageStats.p95ResponseMs > 10000 ? <AlertTriangleIcon className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
              loading={loading}
            />
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-(--surface) rounded-xl border border-(--border) p-5">
              <h3 className="text-sm font-semibold text-(--text-secondary) mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Response Times
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-(--text-muted)">Durchschnitt</span>
                  <span className="text-sm font-bold text-(--text-primary)">
                    {usageStats?.avgResponseMs ? `${(usageStats.avgResponseMs / 1000).toFixed(1)}s` : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-(--text-muted)">Median (P50)</span>
                  <span className="text-sm font-bold text-(--text-primary)">
                    {usageStats?.p50ResponseMs ? `${(usageStats.p50ResponseMs / 1000).toFixed(1)}s` : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-(--text-muted)">P95</span>
                  <span className={`text-sm font-bold ${
                    usageStats?.p95ResponseMs && usageStats.p95ResponseMs > 10000 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {usageStats?.p95ResponseMs ? `${(usageStats.p95ResponseMs / 1000).toFixed(1)}s` : '–'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-(--surface) rounded-xl border border-(--border) p-5">
              <h3 className="text-sm font-semibold text-(--text-secondary) mb-3 flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3.5 h-3.5" /> Error Rate
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-(--surface-hover) rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (usageStats?.errorRate || 0) > 5 ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usageStats?.errorRate || 0, 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${
                  (usageStats?.errorRate || 0) > 5 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {usageStats?.errorRate ?? 0}%
                </span>
              </div>
              {/* Top Errors */}
              {usageStats?.topErrors && usageStats.topErrors.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] text-(--text-muted) uppercase tracking-wider">Top Errors</p>
                  {usageStats.topErrors.slice(0, 3).map((e, i) => (
                    <div key={i} className="text-xs text-red-300/70 truncate">
                      {e.capability}: {e.errorMessage} ({e.count}x)
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-(--surface) rounded-xl border border-(--border) p-5">
              <h3 className="text-sm font-semibold text-(--text-secondary) mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Team RAG Usage
              </h3>
              {usageStats?.teamRagUsage && usageStats.teamRagUsage.length > 0 ? (
                <div className="space-y-2">
                  {usageStats.teamRagUsage.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-(--text-secondary) font-mono truncate max-w-[120px]">{t.breweryId.slice(0, 8)}…</span>
                      <span className="text-(--text-primary)">{t.calls} calls / {t.ragCalls} RAG</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-(--text-disabled)">Noch keine Team-RAG-Nutzung</p>
              )}
            </div>
          </div>

          {/* Capability Breakdown */}
          {usageStats?.byCapability && usageStats.byCapability.length > 0 && (
            <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
              <div className="p-4 border-b border-(--border)">
                <h3 className="font-bold text-(--text-primary) flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" /> Usage pro Capability
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-(--border)">
                      <th className="text-left py-3 px-4 text-(--text-muted) font-medium text-xs">Capability</th>
                      <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Calls</th>
                      <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Credits</th>
                      <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Avg Response</th>
                      <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Error Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageStats.byCapability.map((c) => (
                      <tr key={c.capability} className="border-b border-(--border)/50 hover:bg-(--surface-hover)/20">
                        <td className="py-3 px-4 font-mono text-xs text-purple-300">{c.capability}</td>
                        <td className="text-right py-3 px-4 text-(--text-primary) font-medium">{c.calls}</td>
                        <td className="text-right py-3 px-4 text-(--text-secondary)">{c.credits}</td>
                        <td className="text-right py-3 px-4 text-(--text-secondary)">
                          {c.avgMs ? `${(c.avgMs / 1000).toFixed(1)}s` : '–'}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`text-xs font-bold ${
                            c.errorRate > 5 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {c.errorRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily Trend Chart */}
          {usageStats?.dailyTrend && usageStats.dailyTrend.length > 0 && (
            <div className="bg-(--surface) rounded-xl border border-(--border) p-5">
              <h3 className="text-sm font-semibold text-(--text-secondary) mb-4">Tagestrend</h3>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <BarChart
                    data={usageStats.dailyTrend.map(d => ({
                      name: new Date(d.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
                      calls: d.calls,
                      credits: d.credits,
                    }))}
                    xKey="name"
                    yKeys={[
                      { key: 'calls', color: '#a855f7', label: 'API Calls' },
                      { key: 'credits', color: '#eab308', label: 'Credits' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ FEEDBACK SECTION ══════════════════════════════════════════════════ */}
      {activeSection === 'feedback' && (
        <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gesamt Feedbacks"
          value={(stats?.total || 0).toLocaleString()}
          icon={<MessageCircle className="w-4 h-4" />}
          loading={loading}
        />
        <MetricCard
          title="Positiv"
          value={(stats?.thumbsUp || 0).toLocaleString()}
          icon={<CheckCircle2 className="w-4 h-4" />}
          loading={loading}
        />
        <MetricCard
          title="Negativ"
          value={(stats?.thumbsDown || 0).toLocaleString()}
          icon={<XCircle className="w-4 h-4" />}
          loading={loading}
        />
        <MetricCard
          title="Positiv-Rate"
          value={`${stats?.positiveRate || 0}%`}
          icon={stats?.positiveRate && stats.positiveRate >= 75 ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : stats?.positiveRate && stats.positiveRate >= 50 ? <AlertTriangleIcon className="w-4 h-4 text-yellow-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
          loading={loading}
        />
      </div>

      {/* Overall Health */}
      {stats && stats.total > 0 && (
        <div className="bg-(--surface) rounded-xl border border-(--border) p-5">
          <h3 className="text-sm font-semibold text-(--text-secondary) mb-3">Gesamt-Zufriedenheit</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-(--surface-hover) rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                style={{ width: `${stats.positiveRate}%` }}
              />
            </div>
            <span className="text-(--text-primary) font-bold text-sm w-12 text-right">{stats.positiveRate}%</span>
          </div>
          <div className="flex justify-between text-xs text-(--text-disabled) mt-1">
            <span>0%</span>
            <span className={stats.positiveRate >= 75 ? 'text-green-500' : stats.positiveRate >= 50 ? 'text-yellow-500' : 'text-red-500'}>
              {stats.positiveRate >= 75 ? 'Gut' : stats.positiveRate >= 50 ? 'Verbesserungsbedarf' : 'Kritisch'}
            </span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Context Breakdown Chart */}
      {chartData.length > 0 && (
        <div className="bg-(--surface) rounded-xl border border-(--border) p-5">
          <h3 className="text-sm font-semibold text-(--text-secondary) mb-4">Top 15 Context-Schlüssel (Positiv/Negativ)</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <BarChart
                data={chartData}
                xKey="name"
                yKeys={[
                  { key: 'up', color: '#22c55e', label: 'Positiv' },
                  { key: 'down', color: '#ef4444', label: 'Negativ' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Context Table */}
      <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
        <div className="p-4 border-b border-(--border)">
          <h3 className="font-bold text-(--text-primary)">Alle Context-Schlüssel</h3>
          <p className="text-xs text-(--text-muted) mt-0.5">Geordnet nach Gesamt-Feedback</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                <th className="text-left py-3 px-4 text-(--text-muted) font-medium text-xs">Context Key</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Positiv</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Negativ</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Gesamt</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Rate</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.byContext || []).map(c => {
                const rate = c.total > 0 ? Math.round((c.up / c.total) * 100) : 0
                return (
                  <tr key={c.context_key} className="border-b border-(--border)/50 hover:bg-(--surface-hover)/20">
                    <td className="py-3 px-4 font-mono text-xs text-(--text-secondary)">{c.context_key}</td>
                    <td className="text-right py-3 px-4 text-green-400 font-medium">{c.up}</td>
                    <td className="text-right py-3 px-4 text-red-400 font-medium">{c.down}</td>
                    <td className="text-right py-3 px-4 text-(--text-primary)">{c.total}</td>
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
      <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
        <div className="p-4 border-b border-(--border)">
          <h3 className="font-bold text-(--text-primary)">Letztes Feedback (100)</h3>
          <p className="text-xs text-(--text-muted) mt-0.5">Klicke auf einen Eintrag um den generierten Text zu sehen</p>
        </div>
        <div className="divide-y divide-(--border)/50 max-h-[500px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-(--text-muted)">Kein Feedback im gewählten Zeitraum</div>
          ) : items.map(item => (
            <div key={item.id} className="p-3">
              <div
                className="flex items-start gap-3 cursor-pointer hover:bg-(--surface-hover)/30 rounded-lg p-2 -m-2 transition"
                onClick={() => setShowGenerated(showGenerated === item.id ? null : item.id)}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                  item.feedback === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {item.feedback === 'up' ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-(--text-secondary) truncate">{item.context_key}</p>
                  <p className="text-[10px] text-(--text-disabled)">{new Date(item.created_at).toLocaleString('de')}</p>
                </div>
                {item.generated_text && (
                  <span className="text-[10px] text-(--text-disabled) flex-shrink-0">
                    {showGenerated === item.id ? '▲' : '▼'}
                  </span>
                )}
              </div>
              {showGenerated === item.id && item.generated_text && (
                <div className="mt-2 ml-10 bg-(--surface-hover) rounded-lg p-3 text-xs text-(--text-secondary) leading-relaxed">
                  {item.generated_text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  )
}
