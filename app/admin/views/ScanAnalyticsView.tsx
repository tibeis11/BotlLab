'use client'

import { useState, useEffect } from 'react'
import { Camera, Eye, TrendingUp, Zap, MapPin } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import BarChart from '../components/charts/BarChart'
import { getCountryNameWithFlag } from '@/lib/utils/country-names'
import {
  getScanOverview,
  getScanGeography,
  getScanDeviceSplit,
  getTopScanBrews,
  getCisOverview,
  getAdminScanEvents,
} from '@/lib/actions/analytics-admin-actions'
import type {
  DateRange,
  ScanOverview,
  ScanGeography,
  ScanDevice,
  TopScanBrew,
  CisOverview,
  AdminScanEvent,
} from '@/lib/types/admin-analytics'

const DEVICE_COLORS: Record<string, string> = {
  mobile: 'bg-blue-500',
  desktop: 'bg-cyan-500',
  tablet: 'bg-purple-500',
  unknown: 'bg-zinc-600',
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
  unknown: 'Unbekannt',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  festival: 'Festival',
  market: 'Markt',
  club: 'Club',
  private: 'Privat',
  unknown: 'Unbekannt',
}

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ScanAnalyticsView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<ScanOverview | null>(null)
  const [geo, setGeo] = useState<ScanGeography[]>([])
  const [devices, setDevices] = useState<ScanDevice[]>([])
  const [topBrews, setTopBrews] = useState<TopScanBrew[]>([])
  const [cis, setCis] = useState<CisOverview | null>(null)
  const [scanEvents, setScanEvents] = useState<AdminScanEvent[]>([])

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [ov, g, d, t, cisData, events] = await Promise.all([
        getScanOverview(dateRange),
        getScanGeography(dateRange, 10),
        getScanDeviceSplit(dateRange),
        getTopScanBrews(dateRange, 10),
        getCisOverview(dateRange),
        getAdminScanEvents(30),
      ])
      setOverview(ov)
      setGeo(g)
      setDevices(d)
      setTopBrews(t)
      setCis(cisData)
      setScanEvents(events)
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
          <p className="text-(--text-secondary)">Lade Scan-Daten…</p>
        </div>
      </div>
    )
  }

  if (!overview) {
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
          <h1 className="text-xl font-bold text-(--text-primary)">Scan-Analyse</h1>
          <p className="text-(--text-muted) text-sm mt-0.5">
            QR-Code-Scans, Herkunft &amp; Gerätenutzung ·
            Quelle: <code className="text-(--brand) text-xs">bottle_scans</code>
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} availableRanges={['7d', '30d', '90d']} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Gesamt-Scans" value={overview.totalScans.toLocaleString()} icon={<Camera className="w-4 h-4" />} />
        <MetricCard title="Unique Visitors" value={overview.uniqueVisitors.toLocaleString()} icon={<Eye className="w-4 h-4" />} />
        <MetricCard title="Ø pro Tag" value={overview.avgPerDay} icon={<TrendingUp className="w-4 h-4" />} />
        <MetricCard title="Engagement-Rate" value={`${overview.conversionRate}%`} icon={<Zap className="w-4 h-4" />}
          subValue="Non-Owner Scans" />
      </div>

      {/* Geography + Device Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geography */}
        <div className="bg-(--surface) border border-(--border) rounded-xl p-5">
          <h2 className="text-sm font-semibold text-(--text-secondary) mb-4 uppercase tracking-wider">
            Top-Länder
          </h2>
          {geo.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-(--text-muted) text-sm">
              Keine Geodaten verfügbar
            </div>
          ) : (
            <div className="space-y-2.5">
              {geo.map(g => (
                <div key={g.countryCode}>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{getCountryNameWithFlag(g.countryCode)}</span>
                    <span>{g.scans.toLocaleString()} ({g.pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-(--surface-hover) rounded-full overflow-hidden">
                    <div
                      className="h-1.5 bg-(--brand) rounded-full"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Split */}
        <div className="bg-(--surface) border border-(--border) rounded-xl p-5">
          <h2 className="text-sm font-semibold text-(--text-secondary) mb-4 uppercase tracking-wider">
            Gerätenutzung
          </h2>
          {devices.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-(--text-muted) text-sm">
              Keine Gerätedaten verfügbar
            </div>
          ) : (
            <>
              <BarChart
                data={devices}
                xKey="deviceType"
                yKeys={[{ key: 'count', color: '#22d3ee', label: 'Scans' }]}
                height={180}
              />
              <div className="mt-3 space-y-1.5">
                {devices.map(d => (
                  <div key={d.deviceType} className="flex items-center gap-2 text-xs text-(--text-secondary)">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DEVICE_COLORS[d.deviceType] ?? 'bg-zinc-600'}`} />
                    <span>{DEVICE_LABELS[d.deviceType] ?? d.deviceType}</span>
                    <span className="ml-auto">{d.count.toLocaleString()} ({d.pct}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Brews Table */}
      <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--text-secondary) uppercase tracking-wider">
            Meistgescannte Brews
          </h2>
          <span className="text-xs text-(--text-muted)">{topBrews.length} Einträge</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Brew</th>
                <th className="px-4 py-3 text-left text-xs text-(--text-muted) font-medium uppercase tracking-wider">Brauerei</th>
                <th className="px-4 py-3 text-right text-xs text-(--text-muted) font-medium uppercase tracking-wider">Scans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {topBrews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-(--text-muted)">
                    Keine Scan-Daten im gewählten Zeitraum
                  </td>
                </tr>
              ) : (
                topBrews.map((brew, i) => (
                  <tr key={brew.brewId} className="hover:bg-(--surface-hover)/40 transition-colors">
                    <td className="px-4 py-3 text-(--text-muted) text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-(--text-secondary) text-xs font-medium">{brew.brewName}</td>
                    <td className="px-4 py-3 text-(--text-secondary) text-xs">{brew.breweryName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-cyan-400 font-mono text-xs font-semibold">
                        {brew.scans.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CIS Block ───────────────────────────────────────────────────── */}
      {cis && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-(--text-primary)">Consumer Intent Score (CIS)</h2>
            <p className="text-(--text-muted) text-xs mt-0.5">
              Phase-0-Engine · Additive Scoring · QR-Hard-Rule
            </p>
          </div>

          {/* CIS KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-(--surface) border border-(--border) rounded-xl p-4">
              <p className="text-xs text-(--text-muted) uppercase tracking-wider mb-1">Gesch. Trinker</p>
              <p className="text-2xl font-mono font-semibold text-cyan-400">
                {cis.weightedDrinkerEstimate.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
              </p>
              <p className="text-[10px] text-(--text-disabled) mt-1">Σ drinking_probability (nur QR)</p>
            </div>
            <div className="bg-(--surface) border border-(--border) rounded-xl p-4">
              <p className="text-xs text-(--text-muted) uppercase tracking-wider mb-1">QR-Scans</p>
              <p className="text-2xl font-mono font-semibold text-(--text-primary)">
                {cis.qrScanCount.toLocaleString()}
              </p>
              <p className="text-[10px] text-(--text-disabled) mt-1">Scan Source = qr_code</p>
            </div>
            <div className="bg-(--surface) border border-(--border) rounded-xl p-4">
              <p className="text-xs text-(--text-muted) uppercase tracking-wider mb-1">Hard Proofs</p>
              <p className="text-2xl font-mono font-semibold text-emerald-400">
                {cis.confirmedScans.toLocaleString()}
              </p>
              <p className="text-[10px] text-(--text-disabled) mt-1">
                {(cis.confirmedRate * 100).toFixed(1)}% aller QR-Scans bestätigt
              </p>
            </div>
            <div className="bg-(--surface) border border-(--border) rounded-xl p-4">
              <p className="text-xs text-(--text-muted) uppercase tracking-wider mb-1">Klassifizierungs-Backlog</p>
              <p className={`text-2xl font-mono font-semibold ${
                cis.pendingClassification > 500 ? 'text-amber-400' : 'text-(--text-primary)'
              }`}>
                {cis.pendingClassification.toLocaleString()}
              </p>
              <p className="text-[10px] text-(--text-disabled) mt-1">Scans im 15-Min-Wartezeitfenster</p>
            </div>
          </div>

          {/* Source breakdown + Intent distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scan Source Breakdown */}
            <div className="bg-(--surface) border border-(--border) rounded-xl p-5">
              <h3 className="text-sm font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                Scan-Quelle (Hard Rule 0.1)
              </h3>
              <p className="text-[10px] text-(--text-disabled) mb-4">
                Nicht-QR-Scans werden zwingend auf drinking_probability = 0.0 gesetzt
              </p>
              <div className="space-y-2.5">
                {cis.sourceBreakdown.map(row => (
                  <div key={row.source}>
                    <div className="flex justify-between text-xs text-(--text-secondary) mb-1">
                      <span className="flex items-center gap-1.5">
                        {row.isHardZero && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 uppercase tracking-wider">
                            0.0
                          </span>
                        )}
                        <code className="text-(--text-secondary) text-[11px]">{row.source}</code>
                      </span>
                      <span>{row.count.toLocaleString()} ({row.pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-(--surface-hover) rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          row.isHardZero ? 'bg-red-700/60' : 'bg-(--brand)'
                        }`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Intent Distribution */}
            <div className="bg-(--surface) border border-(--border) rounded-xl p-5">
              <h3 className="text-sm font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                Intent-Verteilung (klassifiziert)
              </h3>
              <p className="text-[10px] text-(--text-disabled) mb-4">Ø Wahrscheinlichkeit pro Intent</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-(--text-muted) border-b border-(--border)">
                      <th className="text-left py-1.5">Intent</th>
                      <th className="text-right py-1.5">Scans</th>
                      <th className="text-right py-1.5">Anteil</th>
                      <th className="text-right py-1.5">Ø Prob</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cis.intentDistribution.map(row => (
                      <tr key={row.intent} className="border-b border-(--border)/40">
                        <td className="py-1.5 text-(--text-secondary) font-medium">{row.intent}</td>
                        <td className="text-right py-1.5 font-mono text-(--text-secondary)">{row.count.toLocaleString()}</td>
                        <td className="text-right py-1.5 font-mono text-(--text-secondary)">{row.pct}%</td>
                        <td className={`text-right py-1.5 font-mono ${
                          row.avgProbability >= 0.7 ? 'text-emerald-400'
                          : row.avgProbability >= 0.3 ? 'text-amber-400'
                          : 'text-red-400'
                        }`}>
                          {row.avgProbability.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Geo-Events (scan_events + scan_event_members) ─────────────────── */}
      <div className="bg-(--surface-sunken) border border-(--border) rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-(--text-primary) flex items-center gap-1.5"><MapPin className="w-4 h-4" />Event-Erkennungen</h2>
            <p className="text-[11px] text-(--text-muted) mt-0.5">
              PostGIS-Cluster aus <code className="text-(--brand)">scan_events</code> + <code className="text-(--brand)">scan_event_members</code>
            </p>
          </div>
          <span className="text-xs font-mono text-(--text-muted) bg-(--surface) border border-(--border) px-3 py-1 rounded-full">
            {scanEvents.length} Events
          </span>
        </div>

        {scanEvents.length === 0 ? (
          <div className="text-center py-10 text-(--text-disabled) text-sm">
            Noch keine Geo-Events erkannt — der PostGIS-Clustering-Cron läuft stündlich.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-(--text-muted) border-b border-(--border) text-left">
                  <th className="pb-2 pr-4">Zeitraum</th>
                  <th className="pb-2 pr-4">Ort</th>
                  <th className="pb-2 pr-4">Typ</th>
                  <th className="pb-2 pr-4 text-right">Scans</th>
                  <th className="pb-2 pr-4 text-right">Sessions</th>
                  <th className="pb-2 pr-4 text-right">Members</th>
                  <th className="pb-2 pr-4 text-right">Brauereien</th>
                  <th className="pb-2 text-right">Konfidenz</th>
                </tr>
              </thead>
              <tbody>
                {scanEvents.map(ev => (
                  <tr key={ev.id} className="border-b border-(--border)/40 hover:bg-(--surface)/40 transition-colors">
                    <td className="py-2 pr-4 text-(--text-secondary) whitespace-nowrap">
                      <div>{formatEventDate(ev.eventStart)}</div>
                      {ev.eventEnd && (
                        <div className="text-(--text-disabled) text-[10px]">→ {formatEventDate(ev.eventEnd)}</div>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-(--text-secondary)">
                      {ev.city ? ev.city : '—'}
                      {ev.countryCode && (
                        <span className="text-(--text-disabled) ml-1 text-[10px]">{ev.countryCode.toUpperCase()}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs bg-(--surface) border border-(--border-hover) px-2 py-0.5 rounded-full text-(--text-secondary)">
                        {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-(--text-secondary)">{ev.totalScans}</td>
                    <td className="py-2 pr-4 text-right font-mono text-(--text-secondary)">{ev.uniqueSessions}</td>
                    <td className="py-2 pr-4 text-right font-mono text-(--text-secondary)">{ev.memberCount}</td>
                    <td className="py-2 pr-4 text-right font-mono text-(--text-secondary)">{(ev.breweries ?? []).length}</td>
                    <td className="py-2 text-right">
                      <span className={`font-mono text-xs ${
                        ev.confidence >= 0.8 ? 'text-emerald-400'
                        : ev.confidence >= 0.5 ? 'text-amber-400'
                        : 'text-red-400'
                      }`}>
                        {(ev.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
