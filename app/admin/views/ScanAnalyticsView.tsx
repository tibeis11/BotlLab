'use client'

import { useState, useEffect } from 'react'
import { Camera, Eye, TrendingUp, Zap, MapPin, Settings, RotateCcw } from 'lucide-react'
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
  getRecentCisScans,
} from '@/lib/actions/analytics-admin-actions'
import {
  getAlgorithmSettings,
  saveAlgorithmSettings,
} from '@/lib/actions/brew-admin-actions'
import { classifyCisScans, adminFetchWeatherForUnprocessed } from '@/lib/actions/analytics-actions'
import { ALGORITHM_DEFAULTS, AlgorithmSettings } from '@/lib/algorithm-settings'
import type {
  DateRange,
  ScanOverview,
  ScanGeography,
  ScanDevice,
  TopScanBrew,
  CisOverview,
  AdminScanEvent,
  CisRecentScan,
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

// ── CIS settings config ───────────────────────────────────────────────────────
type CisSettingField = {
  key: keyof AlgorithmSettings
  label: string
  min: number
  max: number
  step: number
  unit?: string
  description?: string
}

const CIS_CORE_SETTINGS: CisSettingField[] = [
  { key: 'cis_base_score', label: 'Basis-Score', min: 0, max: 1, step: 0.01, description: 'Startpunkt für jeden QR-Scan' },
  { key: 'cis_fridge_surfing_penalty', label: 'Fridge-Surfing Penalty', min: -1, max: 0, step: 0.01, description: 'Abzug wenn weitere Flasche in selber Session folgt' },
  { key: 'cis_dwell_time_bonus', label: 'Dwell-Time Bonus', min: 0, max: 1, step: 0.01, description: 'Bonus bei langem Verweilen auf der Seite' },
  { key: 'cis_last_in_session_bonus', label: 'Last-in-Session Bonus', min: 0, max: 0.5, step: 0.01, description: 'Letzte Flasche der Entscheidungs-Session' },
  { key: 'cis_session_window_minutes', label: 'Session-Fenster', min: 5, max: 120, step: 1, unit: 'min', description: 'Zeitfenster für Session-Kontext' },
  { key: 'cis_dwell_time_threshold_s', label: 'Dwell-Schwelle', min: 30, max: 600, step: 10, unit: 's', description: 'Ab wann greift der Dwell-Bonus' },
]

const CIS_ENV_SETTINGS: CisSettingField[] = [
  { key: 'cis_dynamic_time_bonus', label: 'Zeit-Bonus', min: 0, max: 0.5, step: 0.01, description: 'Scan zur typischen Uhrzeit (±2h)' },
  { key: 'cis_dynamic_time_penalty', label: 'Zeit-Penalty', min: -0.5, max: 0, step: 0.01, description: 'Scan zu atypischer Zeit (>5h Abstand)' },
  { key: 'cis_dynamic_temp_bonus', label: 'Temp-Bonus', min: 0, max: 0.2, step: 0.01, description: 'Wetter passend zur Bier-Temperatur (≤5°C)' },
  { key: 'cis_dynamic_temp_penalty', label: 'Temp-Penalty', min: -0.2, max: 0, step: 0.01, description: 'Wetter unpassend (>12°C Abweichung)' },
  { key: 'cis_weekend_holiday_bonus', label: 'Wochenend/Feiertag', min: 0, max: 0.2, step: 0.01, description: 'Fr. Abend, Wochenende oder Feiertag' },
]

function CisSettingRow({
  field,
  value,
  onChange,
}: {
  field: CisSettingField
  value: number
  onChange: (v: number) => void
}) {
  const isDecimal = field.step < 1
  const formatted = isDecimal
    ? (value > 0 ? '+' : '') + value.toFixed(2) + (field.unit ? ` ${field.unit}` : '')
    : (value > 0 ? '+' : '') + value.toFixed(0) + (field.unit ? ` ${field.unit}` : '')
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xs text-(--text-secondary) font-medium">{field.label}</span>
          {field.description && (
            <span className="text-[10px] text-(--text-disabled)">{field.description}</span>
          )}
        </div>
        <span className={`text-xs font-mono tabular-nums pl-4 shrink-0 ${
          value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-(--text-muted)'
        }`}>
          {formatted}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-(--brand)"
        style={{
          background: field.min >= 0
            ? 'linear-gradient(to right, var(--surface-hover) 40%, rgba(52,211,153,0.35) 100%)'
            : field.max <= 0
            ? 'linear-gradient(to right, rgba(248,113,113,0.35) 0%, var(--surface-hover) 60%)'
            : 'linear-gradient(to right, rgba(248,113,113,0.25) 0%, var(--surface-hover) 30%, var(--surface-hover) 70%, rgba(52,211,153,0.25) 100%)',
        }}
      />
    </div>
  )
}

const INTENT_BADGE: Record<string, string> = {
  single: 'bg-emerald-950 text-emerald-400 border-emerald-900',
  browse: 'bg-amber-950 text-amber-400 border-amber-900',
  fridge_surf: 'bg-red-950 text-red-400 border-red-900',
  social_discovery: 'bg-blue-950 text-blue-400 border-blue-900',
  non_qr: 'bg-zinc-800 text-zinc-400 border-zinc-700',
}

function ScanTraceCard({ scan }: { scan: CisRecentScan }) {
  const b = scan.breakdown
  const factors: { label: string; value: number; context?: string }[] = b.isHardZero
    ? [{ label: 'Hard Zero (kein QR-Scan)', value: 0, context: `source = ${scan.scanSource}` }]
    : [
        { label: 'Basis-Score', value: b.base },
        {
          label: b.fridgeSurf !== 0 ? 'Fridge-Surfing Penalty' : 'Last-in-Session Bonus',
          value: b.fridgeSurf !== 0 ? b.fridgeSurf : b.lastInSession,
          context: b.fridgeSurf !== 0 ? 'weitere Flasche in Session gescannt' : 'letzter Scan in Session',
        },
        {
          label: 'Dwell-Time',
          value: b.dwellTime,
          context: b.dwellTime !== 0 ? `≥ 180s verweilt` : 'kein Dwell-Bonus',
        },
        {
          label: 'Zeit-Modifier',
          value: b.dynamicTime,
          context: b.hourDiff != null
            ? `Scan ${b.scanLocalHour}h · typisch ${b.typicalScanHour}h · Δ ${b.hourDiff}h`
            : 'keine Daten',
        },
        {
          label: 'Temp-Modifier',
          value: b.dynamicTemp,
          context: b.tempDiff != null
            ? `Scan ${b.scanTempC?.toFixed(1)}°C · typisch ${b.typicalTempC?.toFixed(1)}°C · Δ ${b.tempDiff?.toFixed(1)}°C`
            : 'keine Wetterdaten',
        },
        {
          label: 'Wochenend/Feiertag',
          value: b.weekendHoliday,
          context: b.isHoliday ? 'Feiertag' : b.isWeekend ? 'Wochenende' : b.isFridayEvening ? 'Freitag Abend' : 'kein Effekt',
        },
      ]

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-(--text-primary) truncate">
            {scan.brewName ?? '(unbekanntes Bier)'}
          </p>
          <p className="text-[11px] text-(--text-disabled) mt-0.5">
            {new Date(scan.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {scan.scanIntent && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${INTENT_BADGE[scan.scanIntent] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
              {scan.scanIntent}
            </span>
          )}
          <span className={`text-sm font-mono font-bold ${
            (scan.drinkingProbability ?? 0) >= 0.45 ? 'text-emerald-400'
            : (scan.drinkingProbability ?? 0) >= 0.15 ? 'text-amber-400'
            : 'text-red-400'
          }`}>
            {scan.breakdown.isHardZero ? '0.00' : (scan.drinkingProbability ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="border-t border-(--border)/50 pt-3 space-y-1.5">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <div className="flex flex-col">
              <span className={f.value === 0 && !b.isHardZero ? 'text-(--text-disabled)' : 'text-(--text-secondary)'}>
                {f.label}
              </span>
              {f.context && (
                <span className="text-[10px] text-(--text-disabled)">{f.context}</span>
              )}
            </div>
            <span className={`font-mono tabular-nums pl-4 shrink-0 ${
              f.value > 0 ? 'text-emerald-400'
              : f.value < 0 ? 'text-red-400'
              : 'text-(--text-disabled)'
            }`}>
              {f.value > 0 ? '+' : ''}{f.value.toFixed(2)}
            </span>
          </div>
        ))}
        {!b.isHardZero && (
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-(--border)/50 text-[11px] font-semibold">
            <span className="text-(--text-secondary)">= Endergebnis (geclamppt)</span>
            <span className={`font-mono tabular-nums pl-4 ${
              (scan.drinkingProbability ?? 0) >= 0.45 ? 'text-emerald-400'
              : (scan.drinkingProbability ?? 0) >= 0.15 ? 'text-amber-400'
              : 'text-red-400'
            }`}>
              {(scan.drinkingProbability ?? 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
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
  const [cisLocalSettings, setCisLocalSettings] = useState<AlgorithmSettings>({ ...ALGORITHM_DEFAULTS })
  const [cisSaving, setCisSaving] = useState(false)
  const [cisMsg, setCisMsg] = useState<string | null>(null)
  const [recentScans, setRecentScans] = useState<CisRecentScan[]>([])
  const [classifying, setClassifying] = useState(false)
  const [classifyMsg, setClassifyMsg] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [ov, g, d, t, cisData, events, algSettings, scans] = await Promise.all([
        getScanOverview(dateRange),
        getScanGeography(dateRange, 10),
        getScanDeviceSplit(dateRange),
        getTopScanBrews(dateRange, 10),
        getCisOverview(dateRange),
        getAdminScanEvents(30),
        getAlgorithmSettings(),
        getRecentCisScans(),
      ])
      setOverview(ov)
      setGeo(g)
      setDevices(d)
      setTopBrews(t)
      setCis(cisData)
      setScanEvents(events)
      setCisLocalSettings(algSettings)
      setRecentScans(scans)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function runClassification() {
    setClassifying(true)
    setClassifyMsg('Wetterdaten werden geladen...')
    try {
      const weatherResult = await adminFetchWeatherForUnprocessed()
      if (weatherResult && weatherResult.ok && weatherResult.processed && weatherResult.processed > 0) {
        setClassifyMsg(`${weatherResult.processed} Wetter-Datenpunkte geladen. Klassifiziere...`)
      } else {
        setClassifyMsg('Klassifiziere Scans...')
      }
      const result = await classifyCisScans()
      setClassifyMsg(`✓ ${result.session} Scans klassifiziert (${result.nonQr} Non-QR)`)
      await loadData()
    } catch {
      setClassifyMsg('Fehler beim Klassifizieren')
    } finally {
      setClassifying(false)
    }
  }

  async function saveCisSettings() {
    setCisSaving(true)
    setCisMsg(null)
    try {
      await saveAlgorithmSettings({
        cis_base_score: cisLocalSettings.cis_base_score,
        cis_fridge_surfing_penalty: cisLocalSettings.cis_fridge_surfing_penalty,
        cis_dwell_time_bonus: cisLocalSettings.cis_dwell_time_bonus,
        cis_last_in_session_bonus: cisLocalSettings.cis_last_in_session_bonus,
        cis_session_window_minutes: cisLocalSettings.cis_session_window_minutes,
        cis_dwell_time_threshold_s: cisLocalSettings.cis_dwell_time_threshold_s,
        cis_dynamic_time_bonus: cisLocalSettings.cis_dynamic_time_bonus,
        cis_dynamic_time_penalty: cisLocalSettings.cis_dynamic_time_penalty,
        cis_dynamic_temp_bonus: cisLocalSettings.cis_dynamic_temp_bonus,
        cis_dynamic_temp_penalty: cisLocalSettings.cis_dynamic_temp_penalty,
        cis_weekend_holiday_bonus: cisLocalSettings.cis_weekend_holiday_bonus,
      })
      setCisMsg('✓ Gespeichert')
    } catch {
      setCisMsg('Fehler beim Speichern')
    } finally {
      setCisSaving(false)
    }
  }

  function resetCisToDefaults() {
    setCisLocalSettings((prev) => ({
      ...prev,
      cis_base_score: ALGORITHM_DEFAULTS.cis_base_score,
      cis_fridge_surfing_penalty: ALGORITHM_DEFAULTS.cis_fridge_surfing_penalty,
      cis_dwell_time_bonus: ALGORITHM_DEFAULTS.cis_dwell_time_bonus,
      cis_last_in_session_bonus: ALGORITHM_DEFAULTS.cis_last_in_session_bonus,
      cis_session_window_minutes: ALGORITHM_DEFAULTS.cis_session_window_minutes,
      cis_dwell_time_threshold_s: ALGORITHM_DEFAULTS.cis_dwell_time_threshold_s,
      cis_dynamic_time_bonus: ALGORITHM_DEFAULTS.cis_dynamic_time_bonus,
      cis_dynamic_time_penalty: ALGORITHM_DEFAULTS.cis_dynamic_time_penalty,
      cis_dynamic_temp_bonus: ALGORITHM_DEFAULTS.cis_dynamic_temp_bonus,
      cis_dynamic_temp_penalty: ALGORITHM_DEFAULTS.cis_dynamic_temp_penalty,
      cis_weekend_holiday_bonus: ALGORITHM_DEFAULTS.cis_weekend_holiday_bonus,
    }))
    setCisMsg(null)
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-(--text-primary)">Consumer Intent Score (CIS)</h2>
                <p className="text-(--text-muted) text-xs mt-0.5">Phase-0-Engine · Additive Scoring · QR-Hard-Rule</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {classifyMsg && (
                  <span className={`text-xs ${classifyMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {classifyMsg}
                  </span>
                )}
                <button
                  onClick={runClassification}
                  disabled={classifying}
                  className="text-xs px-3 py-1.5 rounded-lg border border-(--border) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--brand) disabled:opacity-50 transition-colors"
                >
                  {classifying ? 'Wird verarbeitet…' : 'Jetzt klassifizieren'}
                </button>
              </div>
            </div>
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

      {/* ── CIS Engine Config ─────────────────────────────────────────────── */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-(--text-primary) flex items-center gap-1.5">
              <Settings className="w-4 h-4" />CIS Engine Konfiguration
            </h2>
            <p className="text-[11px] text-(--text-muted) mt-0.5">
              Gespeichert in <code className="text-(--brand)">platform_settings</code> · wird live bei der nächsten Klassifizierung verwendet
            </p>
          </div>
          <button
            onClick={resetCisToDefaults}
            className="flex items-center gap-1.5 text-xs text-(--text-muted) hover:text-(--text-secondary) transition-colors"
          >
            <RotateCcw className="w-3 h-3" />Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider pb-1 border-b border-(--border)">
              Kern-Modell
            </h3>
            {CIS_CORE_SETTINGS.map((field) => (
              <CisSettingRow
                key={field.key}
                field={field}
                value={cisLocalSettings[field.key] as number}
                onChange={(v) => setCisLocalSettings((s) => ({ ...s, [field.key]: v }))}
              />
            ))}
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider pb-1 border-b border-(--border)">
              Environment Context
            </h3>
            {CIS_ENV_SETTINGS.map((field) => (
              <CisSettingRow
                key={field.key}
                field={field}
                value={cisLocalSettings[field.key] as number}
                onChange={(v) => setCisLocalSettings((s) => ({ ...s, [field.key]: v }))}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-(--border)">
          <button
            onClick={saveCisSettings}
            disabled={cisSaving}
            className="text-sm px-4 py-2 rounded-lg bg-(--brand) text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {cisSaving ? 'Speichern…' : 'Speichern'}
          </button>
          {cisMsg && (
            <span className={`text-xs ${cisMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
              {cisMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Recent Scans with Breakdown ───────────────────────────────────── */}
      {recentScans.length > 0 && (
        <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-(--text-primary)">Letzte Scans · Score-Aufschlüsselung</h2>
            <p className="text-[11px] text-(--text-muted) mt-0.5">
              5 zuletzt klassifizierte QR-Scans mit rekonstruiertem Scoring
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {recentScans.map((scan) => (
              <ScanTraceCard key={scan.id} scan={scan} />
            ))}
          </div>
        </div>
      )}

      {/* ── Geo-Events (scan_events + scan_event_members) ─────────────────── */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl p-6">
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
