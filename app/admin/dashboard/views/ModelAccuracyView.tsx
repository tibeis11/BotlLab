'use client'

import { useEffect, useState } from 'react'
import {
  Brain, Target, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Info, BarChart3,
  Activity, Users,
} from 'lucide-react'
import { getModelAccuracyMetrics, type ModelAccuracyMetrics } from '@/lib/actions/analytics-admin-actions'

// ============================================================================
// Helpers
// ============================================================================

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function StatusBadge({ count, label }: { count: number; label: string }) {
  const color = count >= 200
    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
    : count >= 50
      ? 'bg-amber-950 text-amber-400 border-amber-800'
      : 'bg-red-950 text-red-400 border-red-800'
  const status = count >= 200 ? '✅ Robust' : count >= 50 ? '⚠️ Ausreichend' : '🔴 Zu wenig'

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${color}`}>
      {status} ({count} {label})
    </span>
  )
}

// ============================================================================
// Component
// ============================================================================

export default function ModelAccuracyView() {
  const [data, setData] = useState<ModelAccuracyMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await getModelAccuracyMetrics()
        if (!cancelled) setData(result)
      } catch (err) {
        console.error('Failed to load model metrics:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-zinc-900 rounded-lg border border-zinc-800" />
          ))}
        </div>
        <div className="h-64 bg-zinc-900 rounded-lg border border-zinc-800" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center text-zinc-500 py-20">
        <Brain size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Keine Daten verfügbar</p>
      </div>
    )
  }

  const { overall, perIntent, calibrationCurve, drift, alerts } = data

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain size={20} className="text-cyan-500" />
        <div>
          <h2 className="text-lg font-semibold text-white">Model Health: Scan Intent Classification</h2>
          <p className="text-xs text-zinc-500">Phase 9 — Überwachung der Intent-Klassifikation</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const colors = alert.severity === 'critical'
              ? 'bg-red-950/50 border-red-800 text-red-300'
              : alert.severity === 'warning'
                ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            const Icon = alert.severity === 'critical'
              ? AlertTriangle
              : alert.severity === 'warning'
                ? AlertTriangle
                : Info

            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${colors}`}>
                <Icon size={16} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{alert.message}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{alert.recommendation}</p>
                </div>
                {alert.intent && (
                  <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 flex-shrink-0">
                    {alert.intent}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          label="Accuracy"
          value={pct(overall.accuracy)}
          icon={<Target size={16} className="text-cyan-500" />}
          showTrend={drift.length >= 7}
          trendValue={drift.length >= 7 ? computeTrend(drift, 'accuracy') : undefined}
        />
        <KPITile
          label="Precision"
          value={pct(overall.precision)}
          icon={<BarChart3 size={16} className="text-violet-500" />}
          showTrend={drift.length >= 7}
          trendValue={drift.length >= 7 ? computeTrend(drift, 'precision') : undefined}
        />
        <KPITile
          label="Recall"
          value={pct(overall.recall)}
          icon={<Activity size={16} className="text-emerald-500" />}
          showTrend={drift.length >= 7}
          trendValue={drift.length >= 7 ? computeTrend(drift, 'recall') : undefined}
        />
        <KPITile
          label="Feedbacks"
          value={overall.totalFeedbacks.toLocaleString('de-DE')}
          icon={<Users size={16} className="text-amber-500" />}
          subtitle={overall.totalFeedbacks < 200 ? 'Bootstrap-Modus' : undefined}
        />
      </div>

      {/* Confusion Matrix */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Confusion Matrix (Gesamt)</h3>

        <div className="overflow-x-auto">
          <table className="w-full max-w-md mx-auto text-xs">
            <thead>
              <tr>
                <th className="text-left text-zinc-500 pb-2" />
                <th className="text-center text-zinc-400 pb-2 px-4">Nutzer: &quot;Ja&quot;</th>
                <th className="text-center text-zinc-400 pb-2 px-4">Nutzer: &quot;Nein&quot;</th>
                <th className="text-right text-zinc-500 pb-2" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-zinc-400 pr-4 py-2 font-medium">Modell: Trinker</td>
                <td className="text-center py-2">
                  <span className="inline-block px-3 py-1.5 rounded bg-emerald-950 text-emerald-400 font-mono font-medium border border-emerald-800">
                    TP: {computeTP(perIntent)}
                  </span>
                </td>
                <td className="text-center py-2">
                  <span className="inline-block px-3 py-1.5 rounded bg-red-950 text-red-400 font-mono font-medium border border-red-800">
                    FP: {computeFP(perIntent)}
                  </span>
                </td>
                <td className="text-right pl-4 py-2 text-zinc-500">Prec: {pct(overall.precision)}</td>
              </tr>
              <tr>
                <td className="text-zinc-400 pr-4 py-2 font-medium">Modell: Kein Trinker</td>
                <td className="text-center py-2">
                  <span className="inline-block px-3 py-1.5 rounded bg-amber-950 text-amber-400 font-mono font-medium border border-amber-800">
                    FN: {computeFN(perIntent)}
                  </span>
                </td>
                <td className="text-center py-2">
                  <span className="inline-block px-3 py-1.5 rounded bg-emerald-950 text-emerald-400 font-mono font-medium border border-emerald-800">
                    TN: {computeTN(perIntent)}
                  </span>
                </td>
                <td className="text-right pl-4 py-2 text-zinc-500">
                  NPV: {computeNPV(perIntent)}
                </td>
              </tr>
              <tr>
                <td className="pt-2" />
                <td className="text-center pt-2 text-zinc-500">Recall: {pct(overall.recall)}</td>
                <td className="text-center pt-2 text-zinc-500">
                  Spec: {computeSpecificity(perIntent)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-center mt-4 space-y-1">
          <p className="text-xs text-zinc-400">
            Gesamt-Accuracy: <span className="text-white font-mono font-medium">{pct(overall.accuracy)}</span>
            {' '} · F1-Score: <span className="text-white font-mono font-medium">{overall.f1Score.toFixed(3)}</span>
          </p>
        </div>
      </div>

      {/* Per-Intent Breakdown */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Aufschlüsselung nach Intent</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-3">Intent</th>
                <th className="text-right py-2 px-2">TP</th>
                <th className="text-right py-2 px-2">TN</th>
                <th className="text-right py-2 px-2">FP</th>
                <th className="text-right py-2 px-2">FN</th>
                <th className="text-right py-2 px-2">Acc</th>
                <th className="text-right py-2 px-2">Prec</th>
                <th className="text-right py-2 px-2">Recall</th>
                <th className="text-right py-2 px-2">N</th>
                <th className="text-right py-2 px-2">Prob (default)</th>
                <th className="text-right py-2 px-2">Prob (empirisch)</th>
                <th className="text-right py-2 pl-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {perIntent.map((pi) => (
                <tr key={pi.intent} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 pr-3 font-medium text-zinc-300">{pi.intent}</td>
                  <td className="text-right py-2 px-2 font-mono text-emerald-400">{pi.truePositives}</td>
                  <td className="text-right py-2 px-2 font-mono text-emerald-400">{pi.trueNegatives}</td>
                  <td className="text-right py-2 px-2 font-mono text-red-400">{pi.falsePositives}</td>
                  <td className="text-right py-2 px-2 font-mono text-amber-400">{pi.falseNegatives}</td>
                  <td className="text-right py-2 px-2 font-mono text-zinc-300">{pct(pi.accuracy)}</td>
                  <td className="text-right py-2 px-2 font-mono text-zinc-300">
                    {pi.precision !== null ? pct(pi.precision) : '—'}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-zinc-300">
                    {pi.recall !== null ? pct(pi.recall) : '—'}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-zinc-400">{pi.feedbackCount}</td>
                  <td className="text-right py-2 px-2 font-mono text-zinc-500">{pi.currentProbability}</td>
                  <td className={`text-right py-2 px-2 font-mono ${
                    Math.abs(pi.empiricalProbability - pi.currentProbability) > 0.15
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }`}>
                    {pi.empiricalProbability.toFixed(3)}
                  </td>
                  <td className="text-right py-2 pl-3">
                    <StatusBadge count={pi.feedbackCount} label="" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calibration Curve */}
      {calibrationCurve.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Calibration Curve</h3>
          <p className="text-[10px] text-zinc-500 mb-4">
            Vorhergesagte vs. tatsächliche Trinkrate (Punkte auf der Diagonale = perfekt kalibriert)
          </p>

          {/* Simple ASCII-style calibration grid */}
          <div className="overflow-x-auto">
            <table className="w-full max-w-lg mx-auto text-[11px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-2">Bin</th>
                  <th className="text-right py-2">Predicted</th>
                  <th className="text-right py-2">Actual</th>
                  <th className="text-right py-2">Δ</th>
                  <th className="text-right py-2">N</th>
                  <th className="text-left py-2 pl-4">Visualisierung</th>
                </tr>
              </thead>
              <tbody>
                {calibrationCurve.map((c) => {
                  const delta = c.actual - c.predicted
                  const deltaColor = Math.abs(delta) > 0.15
                    ? 'text-amber-400'
                    : Math.abs(delta) > 0.08
                      ? 'text-yellow-400'
                      : 'text-emerald-400'

                  return (
                    <tr key={c.bin} className="border-b border-zinc-800/50">
                      <td className="py-1.5 font-mono text-zinc-400">
                        {(c.bin * 100).toFixed(0)}–{(c.bin * 100 + 10).toFixed(0)}%
                      </td>
                      <td className="text-right py-1.5 font-mono text-cyan-400">{pct(c.predicted)}</td>
                      <td className="text-right py-1.5 font-mono text-violet-400">{pct(c.actual)}</td>
                      <td className={`text-right py-1.5 font-mono ${deltaColor}`}>
                        {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}pp
                      </td>
                      <td className="text-right py-1.5 font-mono text-zinc-500">{c.n}</td>
                      <td className="py-1.5 pl-4">
                        <div className="flex items-center gap-1">
                          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                            <div
                              className="absolute h-full bg-cyan-600/50 rounded-full"
                              style={{ width: `${c.predicted * 100}%` }}
                            />
                            <div
                              className="absolute h-full w-1 bg-violet-400 rounded-full"
                              style={{ left: `${c.actual * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Temporal Drift */}
      {drift.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Accuracy-Trend (7-Tage Rolling Window)</h3>

          {/* Simple sparkline representation */}
          <div className="grid grid-cols-3 gap-6">
            <DriftSparkline data={drift} metric="accuracy" label="Accuracy" color="text-cyan-400" />
            <DriftSparkline data={drift} metric="precision" label="Precision" color="text-violet-400" />
            <DriftSparkline data={drift} metric="recall" label="Recall" color="text-emerald-400" />
          </div>

          {/* Last 10 data points table */}
          <details className="mt-4">
            <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-400">
              Letzte {Math.min(drift.length, 14)} Datenpunkte anzeigen
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-1">Datum</th>
                    <th className="text-right py-1">Accuracy</th>
                    <th className="text-right py-1">Precision</th>
                    <th className="text-right py-1">Recall</th>
                  </tr>
                </thead>
                <tbody>
                  {drift.slice(-14).map((d) => (
                    <tr key={d.date} className="border-b border-zinc-800/30">
                      <td className="py-1 text-zinc-400 font-mono">{d.date}</td>
                      <td className="text-right py-1 font-mono text-cyan-400">{pct(d.accuracy)}</td>
                      <td className="text-right py-1 font-mono text-violet-400">{pct(d.precision)}</td>
                      <td className="text-right py-1 font-mono text-emerald-400">{pct(d.recall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Sample Coverage */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Stichproben-Abdeckung</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2">Intent</th>
                <th className="text-right py-2">Feedbacks</th>
                <th className="text-right py-2">Status</th>
                <th className="text-right py-2">Sampling-Rate</th>
                <th className="text-right py-2">Modus</th>
              </tr>
            </thead>
            <tbody>
              {perIntent.map(pi => (
                <tr key={pi.intent} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 text-zinc-300 font-medium">{pi.intent}</td>
                  <td className="text-right py-2 font-mono text-zinc-400">{pi.feedbackCount}</td>
                  <td className="text-right py-2">
                    <StatusBadge count={pi.feedbackCount} label="" />
                  </td>
                  <td className="text-right py-2 font-mono text-zinc-400">
                    {pi.samplingRate > 0 ? `${(pi.samplingRate * 100).toFixed(0)}%` : 'Hard-Exclude'}
                  </td>
                  <td className="text-right py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      pi.samplingMode === 're-learning'
                        ? 'bg-red-950 text-red-400 border-red-800'
                        : pi.samplingMode === 'maintenance'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {pi.samplingMode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function KPITile({ label, value, icon, showTrend, trendValue, subtitle }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  showTrend?: boolean;
  trendValue?: number;
  subtitle?: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 flex flex-col justify-between hover:border-zinc-600 transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{label}</span>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-medium text-white font-mono">{value}</span>
          {showTrend && trendValue !== undefined && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5
              ${trendValue >= 0
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                : 'bg-red-950 text-red-400 border border-red-900'
              }`}
            >
              {trendValue >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      {subtitle && (
        <p className="text-[10px] text-zinc-600 mt-2">{subtitle}</p>
      )}
    </div>
  )
}

function DriftSparkline({ data, metric, label, color }: {
  data: { accuracy: number; precision: number; recall: number; date: string }[];
  metric: 'accuracy' | 'precision' | 'recall';
  label: string;
  color: string;
}) {
  const values = data.map(d => d[metric])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.01
  const latest = values[values.length - 1]
  const first = values[0]
  const change = ((latest - first) / (first || 1)) * 100

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-mono font-medium ${color}`}>{pct(latest)}</span>
      </div>
      {/* Mini bar chart representing last N values */}
      <div className="flex items-end gap-px h-12">
        {values.slice(-30).map((v, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${color.replace('text-', 'bg-')}`}
            style={{
              height: `${Math.max(((v - min) / range) * 100, 4)}%`,
              opacity: 0.3 + (i / values.slice(-30).length) * 0.7,
            }}
          />
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 mt-1">
        {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% Trend
      </p>
    </div>
  )
}

// ============================================================================
// Metric Helpers
// ============================================================================

function computeTP(perIntent: ModelAccuracyMetrics['perIntent']): number {
  return perIntent.reduce((s, pi) => s + pi.truePositives, 0)
}

function computeTN(perIntent: ModelAccuracyMetrics['perIntent']): number {
  return perIntent.reduce((s, pi) => s + pi.trueNegatives, 0)
}

function computeFP(perIntent: ModelAccuracyMetrics['perIntent']): number {
  return perIntent.reduce((s, pi) => s + pi.falsePositives, 0)
}

function computeFN(perIntent: ModelAccuracyMetrics['perIntent']): number {
  return perIntent.reduce((s, pi) => s + pi.falseNegatives, 0)
}

function computeNPV(perIntent: ModelAccuracyMetrics['perIntent']): string {
  const tn = computeTN(perIntent)
  const fn = computeFN(perIntent)
  return (tn + fn) > 0 ? pct(tn / (tn + fn)) : '—'
}

function computeSpecificity(perIntent: ModelAccuracyMetrics['perIntent']): string {
  const tn = computeTN(perIntent)
  const fp = computeFP(perIntent)
  return (tn + fp) > 0 ? pct(tn / (tn + fp)) : '—'
}

function computeTrend(
  drift: { accuracy: number; precision: number; recall: number }[],
  metric: 'accuracy' | 'precision' | 'recall'
): number {
  if (drift.length < 7) return 0
  const recent = drift.slice(-7).reduce((s, d) => s + d[metric], 0) / 7
  const older = drift.slice(-30, -7)
  if (older.length === 0) return 0
  const olderAvg = older.reduce((s, d) => s + d[metric], 0) / older.length
  return olderAvg > 0 ? ((recent - olderAvg) / olderAvg) * 100 : 0
}
