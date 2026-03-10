'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import AdminCard from '../components/AdminCard'
import {
  getSystemHourlyStats,
  getFeatureUsageStats,
  getAiUsageStats,
  getNonceStats,
  getDbHealthStats,
  getAlertRules,
  getAlertHistory,
  toggleAlertRule,
  acknowledgeAlert,
  type AiUsageStats,
} from '@/lib/actions/analytics-admin-actions'
import type { AlertRule, AlertHistory, NonceStats, DbHealthStats } from '@/lib/types/admin-analytics'
import { DateRange } from '@/lib/types/admin-analytics'
import {
  AlertTriangle, Bell, BellOff, CheckCircle, Clock,
  XCircle, Radio, User, CheckCircle2, Lock,
} from 'lucide-react'

const METRIC_LABELS: Record<string, string> = {
  error_rate: 'Fehlerrate',
  response_time: 'Antwortzeit',
  active_users: 'Aktive User',
  new_signups: 'Neue Anmeldungen',
  failed_payments: 'Fehlgeschl. Zahlungen',
}

const CONDITION_LABELS: Record<string, string> = {
  greater_than: 'größer als',
  less_than: 'kleiner als',
  drops_by_percent: 'fällt um %',
}

export default function SystemHealthView() {
  const [dateRange, setDateRange] = useState<DateRange>('24h')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [aiStats, setAiStats] = useState<AiUsageStats | null>(null)
  const [nonceStats, setNonceStats] = useState<NonceStats | null>(null)
  const [dbHealth, setDbHealth] = useState<DbHealthStats | null>(null)
  // Alerts state
  const [rules, setRules] = useState<AlertRule[]>([])
  const [history, setHistory] = useState<AlertHistory[]>([])
  const [toggling, setToggling] = useState<number | null>(null)
  const [acknowledging, setAcknowledging] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [systemStats, featureUsage, aiUsage, nonces, dbStats, rulesData, historyData] = await Promise.all([
        getSystemHourlyStats(dateRange),
        getFeatureUsageStats('7d'),
        getAiUsageStats(dateRange),
        getNonceStats(),
        getDbHealthStats(),
        getAlertRules(),
        getAlertHistory(100),
      ])

      const stats = systemStats as Array<Record<string, number | string>>
      const totalErrors = stats.reduce((sum, s) => sum + ((s.error_count as number) || 0), 0)
      const totalApiCalls = stats.reduce((sum, s) => sum + ((s.api_calls_count as number) || 0), 0)
      const avgActiveUsers = stats.length > 0
        ? stats.reduce((sum, s) => sum + ((s.active_users_count as number) || 0), 0) / stats.length
        : 0

      setData({ systemStats: stats, featureUsage, totalErrors, totalApiCalls, avgActiveUsers })
      setAiStats(aiUsage)
      setNonceStats(nonces)
      setDbHealth(dbStats)
      setRules(rulesData)
      setHistory(historyData)
    } catch (error) {
      console.error('Failed to load system data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(ruleId: number, currentEnabled: boolean) {
    setToggling(ruleId)
    try {
      await toggleAlertRule(ruleId, !currentEnabled)
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r))
    } catch (e) { console.error(e) }
    finally { setToggling(null) }
  }

  async function handleAcknowledge(historyId: number) {
    setAcknowledging(historyId)
    try {
      await acknowledgeAlert(historyId)
      setHistory(prev => prev.map(h =>
        h.id === historyId ? { ...h, acknowledged_at: new Date().toISOString() } : h
      ))
    } catch (e) { console.error(e) }
    finally { setAcknowledging(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-(--brand) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Lade System-Daten...</p>
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

  const systemStats = data.systemStats as Array<Record<string, string | number>>
  const featureUsage = data.featureUsage as Array<Record<string, string | number>>
  const unacknowledged = history.filter(h => !h.acknowledged_at)
  const acknowledged = history.filter(h => !!h.acknowledged_at)

  return (
    <div className="space-y-6">
      {/* Header + Date Range */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-(--text-primary)">System Health</h2>
          {unacknowledged.length > 0 && (
            <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {unacknowledged.length} offen
            </span>
          )}
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} availableRanges={['24h', '7d', '30d']} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Total Errors" value={(data.totalErrors as number).toLocaleString()} icon={<XCircle className="w-4 h-4" />} />
        <MetricCard title="API Calls" value={(data.totalApiCalls as number).toLocaleString()} icon={<Radio className="w-4 h-4" />} />
        <MetricCard title="Ø Aktive User/h" value={Math.round(data.avgActiveUsers as number).toLocaleString()} icon={<User className="w-4 h-4" />} />
        <MetricCard title="System Status" value="Operational" icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      {/* Error Rate + System Metrics */}
      <AdminCard title="Error Rate">
        <LineChart data={systemStats.slice(0, 48).reverse()} xKey="hour" yKeys={[{ key: 'error_count', color: '#ef4444', label: 'Errors' }]} />
      </AdminCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard title="API Calls (Hourly)">
          <BarChart data={systemStats.slice(0, 24).reverse()} xKey="hour" yKeys={[{ key: 'api_calls_count', color: 'var(--text-muted)', label: 'API Calls' }]} />
        </AdminCard>
        <AdminCard title="Active Users (Hourly)">
          <BarChart data={systemStats.slice(0, 24).reverse()} xKey="hour" yKeys={[{ key: 'active_users_count', color: 'var(--text-primary)', label: 'User' }]} />
        </AdminCard>
      </div>

      {/* Database Health */}
      <AdminCard title="Database Health" action={
        dbHealth ? <span className="text-[10px] bg-green-900/20 text-green-400 border border-green-800/30 px-2 py-0.5 rounded uppercase font-bold">Live</span> : undefined
      }>
        {!dbHealth ? (
          <p className="text-xs text-(--text-muted)">Lade DB-Metriken…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-(--surface-sunken) rounded-lg p-4">
                <p className="text-xs text-(--text-secondary) uppercase mb-1">Storage</p>
                <p className="text-2xl font-bold text-(--text-primary)">{dbHealth.dbSizePretty}</p>
              </div>
              <div className="bg-(--surface-sunken) rounded-lg p-4">
                <p className="text-xs text-(--text-secondary) uppercase mb-1">Verbindungen</p>
                <p className="text-2xl font-bold text-(--text-primary)">
                  {dbHealth.activeConnections}
                  <span className="text-sm text-(--text-muted) font-normal"> / {dbHealth.totalConnections}</span>
                </p>
              </div>
              <div className="bg-(--surface-sunken) rounded-lg p-4">
                <p className="text-xs text-(--text-secondary) uppercase mb-1">Cache Hit Ratio</p>
                <p className={`text-2xl font-bold ${
                  dbHealth.cacheHitRatio == null ? 'text-(--text-muted)'
                  : dbHealth.cacheHitRatio >= 95 ? 'text-(--success)'
                  : dbHealth.cacheHitRatio >= 85 ? 'text-(--warning)'
                  : 'text-(--error)'
                }`}>
                  {dbHealth.cacheHitRatio != null ? `${dbHealth.cacheHitRatio}%` : '–'}
                </p>
              </div>
              <div className="bg-(--surface-sunken) rounded-lg p-4">
                <p className="text-xs text-(--text-secondary) uppercase mb-1">Tabellen</p>
                <p className="text-2xl font-bold text-(--text-primary)">{dbHealth.tableCount}</p>
              </div>
            </div>
            {dbHealth.biggestTables.length > 0 && (
              <div>
                <p className="text-xs text-(--text-muted) uppercase mb-2">Größte Tabellen</p>
                <div className="space-y-1.5">
                  {dbHealth.biggestTables.map(t => {
                    const maxBytes = dbHealth.biggestTables[0].totalSizeBytes || 1
                    const barWidth = Math.round((t.totalSizeBytes / maxBytes) * 100)
                    return (
                      <div key={t.name} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-(--text-secondary) w-48 truncate shrink-0">{t.name}</span>
                        <div className="flex-1 bg-(--surface-hover) rounded-full h-1.5">
                          <div className="bg-(--brand)/60 h-1.5 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="text-xs text-(--text-secondary) w-16 text-right shrink-0">{t.totalSize}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* KI Nutzung */}
      <AdminCard title={`KI-Nutzung (${dateRange})`}>
        {!aiStats || aiStats.totalCalls === 0 ? (
          <p className="text-xs text-(--text-muted)">Keine KI-Calls in diesem Zeitraum erfasst.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-(--surface-sunken) rounded-lg p-3">
                <p className="text-[10px] text-(--text-muted) uppercase mb-1">Gesamt-Calls</p>
                <p className="text-xl font-bold text-(--text-primary)">{aiStats.totalCalls.toLocaleString()}</p>
              </div>
              <div className="bg-(--surface-sunken) rounded-lg p-3">
                <p className="text-[10px] text-(--text-muted) uppercase mb-1">Fehler</p>
                <p className="text-xl font-bold text-(--error)">
                  {aiStats.errorCalls.toLocaleString()}
                  <span className="text-xs text-(--text-muted) font-normal ml-1">
                    ({aiStats.totalCalls > 0 ? ((aiStats.errorCalls / aiStats.totalCalls) * 100).toFixed(1) : '0'}%)
                  </span>
                </p>
              </div>
              <div className="bg-(--surface-sunken) rounded-lg p-3">
                <p className="text-[10px] text-(--text-muted) uppercase mb-1">Geschätzte Kosten</p>
                <p className="text-xl font-bold text-(--warning)">{aiStats.totalCostEur.toFixed(3)} €</p>
              </div>
              <div className="bg-(--surface-sunken) rounded-lg p-3">
                <p className="text-[10px] text-(--text-muted) uppercase mb-1">Tokens gesamt</p>
                <p className="text-xl font-bold text-(--accent-purple)">{aiStats.totalTokens.toLocaleString()}</p>
              </div>
            </div>
            {aiStats.dailyTrend.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-(--text-muted) uppercase mb-3">Täglicher Verlauf</p>
                <div className="bg-(--surface-sunken) rounded-lg p-4">
                  <LineChart
                    data={aiStats.dailyTrend}
                    xKey="date"
                    yKeys={[
                      { key: 'calls', color: '#a78bfa', label: 'Calls' },
                      { key: 'errors', color: '#f87171', label: 'Fehler' },
                    ]}
                  />
                </div>
              </div>
            )}
            {aiStats.byType.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-(--text-muted) uppercase mb-2">Nach Typ</p>
                  <div className="space-y-2">
                    {aiStats.byType.map(t => (
                      <div key={t.type} className="flex justify-between items-center bg-(--surface-hover)/50 rounded px-3 py-2">
                        <span className="text-xs font-mono text-(--text-secondary)">{t.type}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-(--text-secondary)">{t.calls} Calls</span>
                          <span className="text-xs text-(--warning)">{t.cost.toFixed(4)} €</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-(--text-muted) uppercase mb-2">Nach Modell</p>
                  <div className="space-y-2">
                    {aiStats.byModel.map(m => (
                      <div key={m.model} className="flex justify-between items-center bg-(--surface-hover)/50 rounded px-3 py-2">
                        <span className="text-xs font-mono text-(--text-secondary) truncate">{m.model}</span>
                        <span className="text-xs text-(--warning)">{m.cost.toFixed(4)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* Feature Usage */}
      <AdminCard title="Feature Usage (7d)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-(--border) text-left">
                <th className="py-3 px-4 text-(--text-muted) font-medium">Feature</th>
                <th className="py-3 px-4 text-(--text-muted) font-medium">Category</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Total</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Unique Users</th>
                <th className="text-right py-3 px-4 text-(--text-muted) font-medium">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {featureUsage.map((feature) => {
                const successRate = (feature.usage_count as number) > 0
                  ? (((feature.success_count as number) / (feature.usage_count as number)) * 100).toFixed(1)
                  : '0.0'
                let badgeClass = 'bg-(--surface-hover) text-(--text-secondary) border-(--border-hover)'
                let categoryLabel = 'Core'
                if (feature.category === 'premium_ai') {
                  badgeClass = 'bg-purple-900/30 text-purple-400 border-purple-500/30'
                  categoryLabel = 'AI Premium'
                } else if (feature.category === 'monetization') {
                  badgeClass = 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
                  categoryLabel = 'System/Limit'
                }
                return (
                  <tr key={feature.feature as string} className="border-b border-(--border)/50 hover:bg-(--surface-hover)/20">
                    <td className="py-3 px-4 text-(--text-secondary) font-mono text-xs">{feature.feature as string}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${badgeClass}`}>{categoryLabel}</span>
                    </td>
                    <td className="text-right py-3 px-4 text-(--text-primary) font-medium">{feature.usage_count as number}</td>
                    <td className="text-right py-3 px-4 text-(--text-secondary)">{feature.unique_users as number}</td>
                    <td className="text-right py-3 px-4">
                      <span className={Number(successRate) > 90 ? 'text-(--success)' : Number(successRate) > 75 ? 'text-(--warning)' : 'text-(--error)'}>{successRate}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Nonces */}
      {nonceStats && (
        <AdminCard title="Anti-Replay Nonces">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Beat the Brewer', data: nonceStats.btb, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
              { label: 'Vibe Check', data: nonceStats.vibeCheck, color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
              { label: 'Ratings', data: nonceStats.rating, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
            ].map(({ label, data: nData, color }) => (
              <div key={label} className={`rounded-xl border p-4 ${color}`}>
                <p className="text-xs font-semibold mb-3 text-(--text-secondary)">{label}</p>
                <div className="space-y-2">
                  {[
                    { label: 'Gesamt (alle Zeit)', value: nData.total },
                    { label: 'Letzte 7 Tage', value: nData.last7d },
                    { label: 'Letzte 24h', value: nData.last24h },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-[11px] text-(--text-muted)">{row.label}</span>
                      <span className="font-mono text-sm font-bold text-(--text-primary)">{row.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-(--text-disabled) mt-3">
            Hinweis: Nonces werden nach Ablauf (TTL) automatisch bereinigt.
          </p>
        </AdminCard>
      )}

      {/* ─── ALERTS SECTION ─── */}
      <div className="pt-4 border-t border-(--border)">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-(--text-primary)">Alerts & Monitoring</h2>
          <button onClick={loadData} className="text-sm text-(--text-secondary) hover:text-(--text-primary) border border-(--border-hover) px-3 py-1.5 rounded-lg">↻ Aktualisieren</button>
        </div>
      </div>

      {/* Alert Rules */}
      <AdminCard title={`Alert-Regeln (${rules.length})`}>
        {rules.length === 0 ? (
          <div className="py-4 text-center text-(--text-muted) text-sm">Noch keine Alert-Regeln konfiguriert.</div>
        ) : (
          <div className="divide-y divide-(--border)">
            {rules.map(rule => (
              <div key={rule.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${rule.enabled ? 'bg-(--success)' : 'bg-(--text-disabled)'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-(--text-primary) text-sm">{rule.name}</p>
                      <p className="text-xs text-(--text-muted) mt-0.5">
                        {METRIC_LABELS[rule.metric] || rule.metric} {CONDITION_LABELS[rule.condition] || rule.condition} {rule.threshold}
                        {' '}· Zeitfenster: {rule.timeframe_minutes}min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rule.last_triggered_at && (
                      <span className="text-[10px] text-(--text-disabled) hidden sm:block">
                        Zuletzt: {new Date(rule.last_triggered_at).toLocaleDateString('de')}
                      </span>
                    )}
                    <button
                      onClick={() => handleToggle(rule.id, rule.enabled)}
                      disabled={toggling === rule.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        rule.enabled
                          ? 'bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400 border border-green-500/20 hover:border-red-500/20'
                          : 'bg-(--surface-hover) text-(--text-secondary) hover:bg-green-500/10 hover:text-green-400 border border-(--border-hover) hover:border-green-500/20'
                      }`}
                    >
                      {toggling === rule.id ? (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : rule.enabled ? (
                        <><Bell className="w-3 h-3" /> Aktiv</>
                      ) : (
                        <><BellOff className="w-3 h-3" /> Inaktiv</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* Unacknowledged Alerts */}
      {unacknowledged.length > 0 && (
        <div className="bg-red-950/20 rounded-xl border border-red-800/40 overflow-hidden">
          <div className="p-4 border-b border-red-800/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="font-bold text-(--text-primary)">Offene Alerts ({unacknowledged.length})</h3>
          </div>
          <div className="divide-y divide-red-800/20">
            {unacknowledged.map(h => (
              <div key={h.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-300 font-semibold">{(h as unknown as Record<string, Record<string, string>>).analytics_alert_rules?.name || `Alert #${h.rule_id}`}</p>
                  <p className="text-xs text-(--text-secondary) mt-0.5">{h.message}</p>
                  <p className="text-[10px] text-(--text-disabled) mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(h.triggered_at).toLocaleString('de')}
                    {h.metric_value != null && ` · Wert: ${h.metric_value}`}
                  </p>
                </div>
                <button
                  onClick={() => handleAcknowledge(h.id)}
                  disabled={acknowledging === h.id}
                  className="flex items-center gap-1.5 bg-(--surface-hover) hover:bg-green-900/30 text-(--text-secondary) hover:text-green-400 border border-(--border-hover) hover:border-green-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0"
                >
                  {acknowledging === h.id ? (
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle className="w-3 h-3" /> Bestätigen</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert History */}
      <AdminCard title={`Verlauf (${acknowledged.length} bestätigt)`}>
        {acknowledged.length === 0 && unacknowledged.length === 0 ? (
          <div className="py-4 text-center text-(--text-muted) text-sm">Noch keine Alert-Ereignisse vorhanden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border)">
                  <th className="text-left py-3 px-4 text-(--text-muted) font-medium text-xs">Alert</th>
                  <th className="text-left py-3 px-4 text-(--text-muted) font-medium text-xs">Zeitpunkt</th>
                  <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Wert</th>
                  <th className="text-right py-3 px-4 text-(--text-muted) font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {acknowledged.slice(0, 50).map(h => (
                  <tr key={h.id} className="border-b border-(--border)/50 hover:bg-(--surface-hover)/20">
                    <td className="py-3 px-4 text-(--text-secondary) text-xs">
                      {(h as unknown as Record<string, Record<string, string>>).analytics_alert_rules?.name || `Regel #${h.rule_id}`}
                    </td>
                    <td className="py-3 px-4 text-(--text-muted) text-xs">{new Date(h.triggered_at).toLocaleString('de')}</td>
                    <td className="text-right py-3 px-4 text-(--text-secondary) text-xs font-mono">{h.metric_value ?? '–'}</td>
                    <td className="text-right py-3 px-4">
                      <span className="text-[10px] bg-green-900/20 text-green-400 border border-green-800/30 px-2 py-0.5 rounded">Bestätigt</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  )
}
