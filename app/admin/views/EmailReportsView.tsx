'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import {
  getEmailReportStats,
  getRecentEmailReportLogs,
} from '@/lib/actions/analytics-admin-actions'
import type { EmailReportStats, EmailReportLog } from '@/lib/types/admin-analytics'
import { CheckCircle, XCircle, Clock, Mail, Calendar, CalendarDays, BarChart2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  sent: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    cls: 'text-emerald-400',
    label: 'Gesendet',
  },
  failed: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    cls: 'text-red-400',
    label: 'Fehlgeschlagen',
  },
  pending: {
    icon: <Clock className="w-3.5 h-3.5" />,
    cls: 'text-amber-400',
    label: 'Ausstehend',
  },
}

export default function EmailReportsView() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<EmailReportStats | null>(null)
  const [logs, setLogs] = useState<EmailReportLog[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([
        getEmailReportStats(),
        getRecentEmailReportLogs(50),
      ])
      setStats(s)
      setLogs(l)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-(--brand) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Lade Email-Report-Daten…</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-(--surface)/50 border border-(--error) rounded-xl p-8 text-center">
        <p className="text-(--error)">Fehler beim Laden der Daten</p>
      </div>
    )
  }

  const sentPct =
    stats.sentLast30d + stats.failedLast30d > 0
      ? Math.round(
          (stats.sentLast30d / (stats.sentLast30d + stats.failedLast30d)) * 100
        )
      : 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--text-primary)">E-Mail-Reports</h1>
        <p className="text-(--text-muted) text-sm mt-0.5">
          Automatisierte Analyse-Reports für Brauereiinhaber ·
          Quelle: <code className="text-cyan-400 text-xs">analytics_report_logs</code>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          title="Aktive Abos"
          value={stats.activeSubscriptions}
          icon={<Mail className="w-4 h-4 text-cyan-400" />}
        />
        <MetricCard title="Wöchentlich" value={stats.weeklySubscriptions} icon={<Calendar className="w-4 h-4" />} />
        <MetricCard title="Monatlich" value={stats.monthlySubscriptions} icon={<CalendarDays className="w-4 h-4" />} />
        <MetricCard
          title="Gesendet (30d)"
          value={stats.sentLast30d}
          icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
        />
        <MetricCard
          title="Fehlgeschlagen (30d)"
          value={stats.failedLast30d}
          icon={<XCircle className="w-4 h-4 text-red-400" />}
        />
        <MetricCard title="Erfolgsrate" value={`${sentPct}%`} icon={<BarChart2 className="w-4 h-4" />} />
      </div>

      <div className="bg-(--surface) border border-(--border) rounded-xl p-5">
        <div className="flex justify-between text-xs text-(--text-secondary) mb-2">
          <span>Zustellrate (30 Tage)</span>
          <span>{stats.sentLast30d} / {stats.sentLast30d + stats.failedLast30d} versandt</span>
        </div>
        <div className="h-3 bg-(--surface-hover) rounded-full overflow-hidden">
          <div className="h-3 bg-emerald-500 rounded-full transition-all" style={{ width: `${sentPct}%` }} />
        </div>
        {stats.failedLast30d > 0 && (
          <p className="text-xs text-red-400 mt-2">
            {stats.failedLast30d} Berichte konnten nicht zugestellt werden. Prüfe die Logs unten.
          </p>
        )}
      </div>

      <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--text-secondary) uppercase tracking-wider">Letzte Report-Zustellungen</h2>
          <span className="text-xs text-(--text-muted)">{logs.length} Einträge</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Zeitraum</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">E-Mail</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Fehlermeldung</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-(--text-muted)">Noch keine Einträge vorhanden</td>
                </tr>
              ) : (
                logs.map(log => {
                  const sc = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending
                  return (
                    <tr key={log.id} className="hover:bg-(--surface-hover)/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${sc.cls}`}>
                          {sc.icon}{sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-(--text-secondary) text-xs whitespace-nowrap">
                        {log.periodStart} → {log.periodEnd}
                      </td>
                      <td className="px-4 py-3 text-(--text-secondary) text-xs font-mono">{log.emailMasked ?? '—'}</td>
                      <td className="px-4 py-3 text-(--text-muted) text-xs max-w-xs truncate">{log.errorMessage ?? '—'}</td>
                      <td className="px-4 py-3 text-(--text-muted) text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
