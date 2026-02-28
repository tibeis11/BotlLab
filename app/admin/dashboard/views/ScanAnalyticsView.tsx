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
} from '@/lib/actions/analytics-admin-actions'
import type {
  DateRange,
  ScanOverview,
  ScanGeography,
  ScanDevice,
  TopScanBrew,
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

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [ov, g, d, t] = await Promise.all([
        getScanOverview(dateRange),
        getScanGeography(dateRange, 10),
        getScanDeviceSplit(dateRange),
        getTopScanBrews(dateRange, 10),
      ])
      setOverview(ov)
      setGeo(g)
      setDevices(d)
      setTopBrews(t)
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
    </div>
  )
}
