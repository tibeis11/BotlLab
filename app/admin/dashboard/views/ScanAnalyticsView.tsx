'use client'

import { useState, useEffect } from 'react'
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
} from '@/lib/actions/analytics-admin-actions'
import type {
  DateRange,
  ScanOverview,
  ScanGeography,
  ScanDevice,
  TopScanBrew,
  CisOverview,
} from '@/lib/types/admin-analytics'

const DEVICE_COLORS: Record<string, string> = {
  mobile: 'bg-blue-500',
  desktop: 'bg-cyan-500',
  tablet: 'bg-purple-500',
  unknown: 'bg-zinc-600',
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: '📱 Mobile',
  desktop: '🖥 Desktop',
  tablet: '📲 Tablet',
  unknown: '❓ Unbekannt',
}

export default function ScanAnalyticsView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<ScanOverview | null>(null)
  const [geo, setGeo] = useState<ScanGeography[]>([])
  const [devices, setDevices] = useState<ScanDevice[]>([])
  const [topBrews, setTopBrews] = useState<TopScanBrew[]>([])
  const [cis, setCis] = useState<CisOverview | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [ov, g, d, t, cisData] = await Promise.all([
        getScanOverview(dateRange),
        getScanGeography(dateRange, 10),
        getScanDeviceSplit(dateRange),
        getTopScanBrews(dateRange, 10),
        getCisOverview(dateRange),
      ])
      setOverview(ov)
      setGeo(g)
      setDevices(d)
      setTopBrews(t)
      setCis(cisData)
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
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Lade Scan-Daten…</p>
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
          <h1 className="text-xl font-bold text-white">Scan-Analyse</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            QR-Code-Scans, Herkunft &amp; Gerätenutzung ·
            Quelle: <code className="text-cyan-400 text-xs">bottle_scans</code>
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} availableRanges={['7d', '30d', '90d']} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Gesamt-Scans" value={overview.totalScans.toLocaleString()} icon="📷" />
        <MetricCard title="Unique Visitors" value={overview.uniqueVisitors.toLocaleString()} icon="👁" />
        <MetricCard title="Ø pro Tag" value={overview.avgPerDay} icon="📈" />
        <MetricCard title="Engagement-Rate" value={`${overview.conversionRate}%`} icon="⚡"
          subValue="Non-Owner Scans" />
      </div>

      {/* Geography + Device Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geography */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
            Top-Länder
          </h2>
          {geo.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
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
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 bg-cyan-500 rounded-full"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Split */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
            Gerätenutzung
          </h2>
          {devices.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
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
                  <div key={d.deviceType} className="flex items-center gap-2 text-xs text-zinc-400">
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Meistgescannte Brews
          </h2>
          <span className="text-xs text-zinc-500">{topBrews.length} Einträge</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium uppercase tracking-wider">Brew</th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium uppercase tracking-wider">Brauerei</th>
                <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium uppercase tracking-wider">Scans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {topBrews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Keine Scan-Daten im gewählten Zeitraum
                  </td>
                </tr>
              ) : (
                topBrews.map((brew, i) => (
                  <tr key={brew.brewId} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-zinc-200 text-xs font-medium">{brew.brewName}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{brew.breweryName}</td>
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
            <h2 className="text-base font-semibold text-white">Consumer Intent Score (CIS)</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Phase-0-Engine · Additive Scoring · QR-Hard-Rule
            </p>
          </div>

          {/* CIS KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Gesch. Trinker</p>
              <p className="text-2xl font-mono font-semibold text-cyan-400">
                {cis.weightedDrinkerEstimate.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">Σ drinking_probability (nur QR)</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">QR-Scans</p>
              <p className="text-2xl font-mono font-semibold text-white">
                {cis.qrScanCount.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">Scan Source = qr_code</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Hard Proofs</p>
              <p className="text-2xl font-mono font-semibold text-emerald-400">
                {cis.confirmedScans.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                {(cis.confirmedRate * 100).toFixed(1)}% aller QR-Scans bestätigt
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Klassifizierungs-Backlog</p>
              <p className={`text-2xl font-mono font-semibold ${
                cis.pendingClassification > 500 ? 'text-amber-400' : 'text-white'
              }`}>
                {cis.pendingClassification.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">Scans im 15-Min-Wartezeitfenster</p>
            </div>
          </div>

          {/* Source breakdown + Intent distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scan Source Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-1 uppercase tracking-wider">
                Scan-Quelle (Hard Rule 0.1)
              </h3>
              <p className="text-[10px] text-zinc-600 mb-4">
                Nicht-QR-Scans werden zwingend auf drinking_probability = 0.0 gesetzt
              </p>
              <div className="space-y-2.5">
                {cis.sourceBreakdown.map(row => (
                  <div key={row.source}>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span className="flex items-center gap-1.5">
                        {row.isHardZero && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 uppercase tracking-wider">
                            0.0
                          </span>
                        )}
                        <code className="text-zinc-300 text-[11px]">{row.source}</code>
                      </span>
                      <span>{row.count.toLocaleString()} ({row.pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          row.isHardZero ? 'bg-red-700/60' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Intent Distribution */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-1 uppercase tracking-wider">
                Intent-Verteilung (klassifiziert)
              </h3>
              <p className="text-[10px] text-zinc-600 mb-4">Ø Wahrscheinlichkeit pro Intent</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      <th className="text-left py-1.5">Intent</th>
                      <th className="text-right py-1.5">Scans</th>
                      <th className="text-right py-1.5">Anteil</th>
                      <th className="text-right py-1.5">Ø Prob</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cis.intentDistribution.map(row => (
                      <tr key={row.intent} className="border-b border-zinc-800/40">
                        <td className="py-1.5 text-zinc-300 font-medium">{row.intent}</td>
                        <td className="text-right py-1.5 font-mono text-zinc-400">{row.count.toLocaleString()}</td>
                        <td className="text-right py-1.5 font-mono text-zinc-400">{row.pct}%</td>
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
    </div>
  )
}
