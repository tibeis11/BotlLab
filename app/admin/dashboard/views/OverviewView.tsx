
'use client'

import { useEffect, useState } from 'react'
import MetricCard from '../components/MetricCard'
import BarChart from '../components/charts/BarChart'
import {
  getAdminDashboardSummary,
  getUnacknowledgedAlertCount,
  getAdminAuditLogs,
  getEmailReportStats,
  getPendingModerationCount,
  getDauTrend,
  getScanTrend,
} from '@/lib/actions/analytics-admin-actions'
import type { AdminAuditLog, AdminDashboardSummary, EmailReportStats } from '@/lib/types/admin-analytics'
import { AlertTriangle, Shield, Mail, RefreshCw, ArrowRight } from 'lucide-react'

interface OverviewData {
  summary: AdminDashboardSummary | null
  alertCount: number
  moderationCount: number
  emailStats: EmailReportStats | null
  auditLogs: AdminAuditLog[]
  dauTrend: { date: string; dau: number }[]
  scanTrend: { date: string; scans: number }[]
}

const ACTION_COLOR = {
  ok: 'border-zinc-700 bg-zinc-900',
  warn: 'border-amber-700/50 bg-amber-950/30',
  danger: 'border-red-700/50 bg-red-950/30',
}

export default function OverviewView() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<OverviewData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [summary, alertCount, moderationCount, emailStats, auditLogs, dauTrend, scanTrend] =
        await Promise.all([
          getAdminDashboardSummary(),
          getUnacknowledgedAlertCount(),
          getPendingModerationCount(),
          getEmailReportStats(),
          getAdminAuditLogs(5),
          getDauTrend(7),
          getScanTrend(30),
        ])
      setData({ summary, alertCount, moderationCount, emailStats, auditLogs, dauTrend, scanTrend })
      setLastUpdated(new Date())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Lade Operations-Center…</p>
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

  const { summary, alertCount, moderationCount, emailStats, auditLogs, dauTrend, scanTrend } = data

  const failedEmails = emailStats?.failedLast30d ?? 0
  const totalActionItems = alertCount + moderationCount + failedEmails

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Operations Center</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Live-Überblick über Plattformgesundheit und offene Aufgaben
            {lastUpdated && (
              <span className="ml-2 text-zinc-600">
                · Aktualisiert {lastUpdated.toLocaleTimeString('de-DE', { timeStyle: 'short' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Total Nutzer" value={(summary?.totalUsers ?? 0).toLocaleString()} icon="👥" />
        <MetricCard title="Aktive Nutzer" value={(summary?.activeUsers ?? 0).toLocaleString()} icon="🔥" />
        <MetricCard title="Brews gesamt" value={(summary?.totalBrews ?? 0).toLocaleString()} icon="🍺" />
        <MetricCard title="QR-Scans" value={(summary?.totalScans ?? 0).toLocaleString()} icon="📷" />
        <MetricCard title="Fehler (24h)" value={summary?.errorCount ?? 0} icon="⚠️" />
        <MetricCard title="Ø Bewertung" value={`${summary?.avgRating?.toFixed(1) ?? '—'} ⭐`} icon="🌟" />
      </div>

      {/* Action Items */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Handlungsbedarf
          </h2>
          {totalActionItems > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-800 text-red-400 text-xs rounded-full font-medium">
              {totalActionItems} offen
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-800 text-emerald-400 text-xs rounded-full font-medium">
              Alles im grünen Bereich
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Moderation */}
          <div className={`rounded-lg border p-4 flex items-start justify-between gap-3 ${moderationCount > 0 ? ACTION_COLOR.warn : ACTION_COLOR.ok}`}>
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 flex-shrink-0 ${moderationCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div>
                <p className="text-xs text-zinc-400 font-medium">Moderation-Queue</p>
                <p className={`text-xl font-bold mt-0.5 ${moderationCount > 0 ? 'text-amber-300' : 'text-zinc-300'}`}>
                  {moderationCount}
                </p>
              </div>
            </div>
            <span className="text-zinc-600 text-xs">ausstehend</span>
          </div>

          {/* Alerts */}
          <div className={`rounded-lg border p-4 flex items-start justify-between gap-3 ${alertCount > 0 ? ACTION_COLOR.danger : ACTION_COLOR.ok}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alertCount > 0 ? 'text-red-400' : 'text-zinc-500'}`} />
              <div>
                <p className="text-xs text-zinc-400 font-medium">Unbestätigte Alerts</p>
                <p className={`text-xl font-bold mt-0.5 ${alertCount > 0 ? 'text-red-300' : 'text-zinc-300'}`}>
                  {alertCount}
                </p>
              </div>
            </div>
            <span className="text-zinc-600 text-xs">neu</span>
          </div>

          {/* Failed email reports */}
          <div className={`rounded-lg border p-4 flex items-start justify-between gap-3 ${failedEmails > 0 ? ACTION_COLOR.warn : ACTION_COLOR.ok}`}>
            <div className="flex items-center gap-3">
              <Mail className={`w-5 h-5 flex-shrink-0 ${failedEmails > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div>
                <p className="text-xs text-zinc-400 font-medium">E-Mail-Fehler (30d)</p>
                <p className={`text-xl font-bold mt-0.5 ${failedEmails > 0 ? 'text-amber-300' : 'text-zinc-300'}`}>
                  {failedEmails}
                </p>
              </div>
            </div>
            <span className="text-zinc-600 text-xs">fehlgeschl.</span>
          </div>
        </div>
      </div>

      {/* 7-Day Sparklines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
            Aktive Nutzer (letzte 7 Tage)
          </h2>
          <BarChart
            data={dauTrend}
            xKey="date"
            yKeys={[{ key: 'dau', color: '#22d3ee', label: 'Aktive Nutzer' }]}
            height={180}
          />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
            QR-Scans (letzte 30 Tage)
          </h2>
          <BarChart
            data={scanTrend}
            xKey="date"
            yKeys={[{ key: 'scans', color: '#a78bfa', label: 'Scans' }]}
            height={180}
          />
        </div>
      </div>

      {/* Recent Audit Log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Letzte Admin-Aktionen
          </h2>
          <span className="text-xs text-zinc-500">Letzte 5 Einträge</span>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {auditLogs.length === 0 ? (
            <p className="px-5 py-6 text-center text-zinc-500 text-sm">
              Noch keine Audit-Log-Einträge
            </p>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-zinc-800/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 font-medium">{log.action}</p>
                  {log.resource_id && (
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                      {log.resource_id.length > 20 ? `${log.resource_id.slice(0, 20)}…` : log.resource_id}
                    </p>
                  )}
                </div>
                <span className="text-zinc-600 text-xs flex-shrink-0">
                  {new Date(log.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
