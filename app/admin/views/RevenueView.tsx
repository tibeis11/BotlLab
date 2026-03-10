'use client'

import { useState, useEffect } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import BarChart from '../components/charts/BarChart'
import {
  getRevenueStats,
  getSubscriptionEvents,
} from '@/lib/actions/analytics-admin-actions'
import type { DateRange, RevenueStats, SubscriptionEvent } from '@/lib/types/admin-analytics'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, MinusCircle, Euro, Gem } from 'lucide-react'

const TIER_COLORS: Record<string, string> = {
  free: 'bg-zinc-600',
  brewer: 'bg-blue-500',
  brewery: 'bg-amber-500',
  enterprise: 'bg-purple-500',
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  brewer: 'Brewer (4,99 €)',
  brewery: 'Brewery (14,99 €)',
  enterprise: 'Enterprise (49,99 €)',
}

const EVENT_BADGES: Record<SubscriptionEvent['eventType'], { label: string; cls: string }> = {
  upgrade:    { label: 'Upgrade',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-800' },
  downgrade:  { label: 'Downgrade',    cls: 'bg-red-500/10 text-red-400 border-red-800' },
  new:        { label: 'Neu',          cls: 'bg-blue-500/10 text-blue-400 border-blue-800' },
  cancel:     { label: 'Kündigung',    cls: 'bg-orange-500/10 text-orange-400 border-orange-800' },
  reactivate: { label: 'Reaktiviert',  cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-800' },
  other:      { label: 'Änderung',     cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-700' },
}

export default function RevenueView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [events, setEvents] = useState<SubscriptionEvent[]>([])

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [s, e] = await Promise.all([
        getRevenueStats(dateRange),
        getSubscriptionEvents(50),
      ])
      setStats(s)
      setEvents(e)
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
          <p className="text-(--text-secondary)">Lade Revenue-Daten…</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-zinc-900/50 border border-red-800 rounded-xl p-8 text-center">
        <p className="text-red-400">Fehler beim Laden der Daten</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">Revenue &amp; Subscriptions</h1>
          <p className="text-(--text-muted) text-sm mt-0.5">
            MRR-Schätzung auf Basis aktiver Profile · Quelle: <code className="text-(--brand) text-xs">subscription_history</code>
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} availableRanges={['7d', '30d', '90d', '1y']} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard title="MRR (geschätzt)" value={`${stats.mrrEur.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`} icon={<Euro className="w-4 h-4" />} />
        <MetricCard title="Paid Nutzer" value={stats.activePaidUsers.toLocaleString()} icon={<Gem className="w-4 h-4" />} />
        <MetricCard title="Upgrades" value={stats.upgradeLast30d} icon={<ArrowUpRight className="w-4 h-4 text-emerald-400" />} />
        <MetricCard title="Downgrades" value={stats.downgradeLast30d} icon={<ArrowDownRight className="w-4 h-4 text-red-400" />} />
        <MetricCard title="Kündigungen" value={stats.churnLast30d} icon={<MinusCircle className="w-4 h-4 text-orange-400" />} />
      </div>

      {/* Tier Distribution + MRR Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="bg-(--surface) border border-(--border) rounded-xl p-5">
          <h2 className="text-sm font-semibold text-(--text-secondary) mb-4 uppercase tracking-wider">Tier-Verteilung</h2>
          <div className="space-y-3">
            {stats.tierDistribution.map(t => (
              <div key={t.tier}>
                <div className="flex justify-between text-xs text-(--text-secondary) mb-1">
                  <span>{TIER_LABELS[t.tier] ?? t.tier}</span>
                  <span>{t.count.toLocaleString()} ({t.pct}%)</span>
                </div>
                <div className="h-2 bg-(--surface-hover) rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${TIER_COLORS[t.tier] ?? 'bg-zinc-500'}`}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly MRR Trend */}
        <div className="bg-(--surface) border border-(--border) rounded-xl p-5">
          <h2 className="text-sm font-semibold text-(--text-secondary) mb-4 uppercase tracking-wider">Monatlicher MRR-Trend</h2>
          {stats.monthlyTrend.length > 0 ? (
            <BarChart
              data={stats.monthlyTrend}
              xKey="month"
              yKeys={[
                { key: 'mrr', color: '#22d3ee', label: 'MRR (€)' },
              ]}
              height={200}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-(--text-muted) text-sm">
              Noch keine Verlaufsdaten im gewählten Zeitraum
            </div>
          )}
        </div>
      </div>

      {/* Subscription Events Table */}
      <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--text-secondary) uppercase tracking-wider">Letzte Subscription-Events</h2>
          <span className="text-xs text-(--text-muted)">{events.length} Einträge</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Nutzer (ID)</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Tier</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Vorher</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-(--text-muted)">
                    Keine Events gefunden
                  </td>
                </tr>
              ) : (
                events.map(ev => {
                  const badge = EVENT_BADGES[ev.eventType]
                  return (
                    <tr key={ev.id} className="hover:bg-(--surface-hover)/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{ev.profileIdMasked}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${TIER_COLORS[ev.tier] ?? 'bg-zinc-600'}`} />
                        <span className="text-(--text-secondary) text-xs">{ev.tier}</span>
                      </td>
                      <td className="px-4 py-3 text-(--text-muted) text-xs">{ev.previousTier ?? '—'}</td>
                      <td className="px-4 py-3 text-(--text-secondary) text-xs">{ev.status}</td>
                      <td className="px-4 py-3 text-(--text-muted) text-xs">
                        {new Date(ev.changedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
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
