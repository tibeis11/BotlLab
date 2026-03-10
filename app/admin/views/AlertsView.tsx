'use client'

import { useState, useEffect } from 'react'
import {
  getAlertRules,
  getAlertHistory,
  toggleAlertRule,
  acknowledgeAlert,
} from '@/lib/actions/analytics-admin-actions'
import type { AlertRule, AlertHistory } from '@/lib/types/admin-analytics'
import { AlertTriangle, Bell, BellOff, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

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

export default function AlertsView() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [history, setHistory] = useState<AlertHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [acknowledging, setAcknowledging] = useState<number | null>(null)
  const [expandedRule, setExpandedRule] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [rulesData, historyData] = await Promise.all([
        getAlertRules(),
        getAlertHistory(100),
      ])
      setRules(rulesData)
      setHistory(historyData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(ruleId: number, currentEnabled: boolean) {
    setToggling(ruleId)
    try {
      await toggleAlertRule(ruleId, !currentEnabled)
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r))
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(null)
    }
  }

  async function handleAcknowledge(historyId: number) {
    setAcknowledging(historyId)
    try {
      await acknowledgeAlert(historyId)
      setHistory(prev => prev.map(h =>
        h.id === historyId ? { ...h, acknowledged_at: new Date().toISOString() } : h
      ))
    } catch (e) {
      console.error(e)
    } finally {
      setAcknowledging(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const unacknowledged = history.filter(h => !h.acknowledged_at)
  const acknowledged = history.filter(h => !!h.acknowledged_at)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Alerts & Monitoring</h2>
          <p className="text-zinc-500 text-sm">Automatische Überwachungsregeln und Ereignisverlauf</p>
        </div>
        <div className="flex items-center gap-3">
          {unacknowledged.length > 0 && (
            <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full text-sm font-bold">
              <AlertTriangle className="w-4 h-4" />
              {unacknowledged.length} offen
            </span>
          )}
          <button onClick={loadData} className="text-sm text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg">
            ↻ Aktualisieren
          </button>
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Bell className="w-4 h-4 text-yellow-400" />
          <h3 className="font-bold text-white">Alert-Regeln ({rules.length})</h3>
        </div>
        {rules.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            Noch keine Alert-Regeln konfiguriert.<br />
            Alert-Regeln werden über die Supabase Edge Function oder direkt in der DB angelegt.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {rules.map(rule => (
              <div key={rule.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${rule.enabled ? 'bg-green-400' : 'bg-zinc-600'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm">{rule.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {METRIC_LABELS[rule.metric] || rule.metric} {CONDITION_LABELS[rule.condition] || rule.condition} {rule.threshold}
                        {' '}· Zeitfenster: {rule.timeframe_minutes}min
                      </p>
                      {rule.description && (
                        <p className="text-xs text-zinc-600 mt-1">{rule.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rule.last_triggered_at && (
                      <span className="text-[10px] text-zinc-600 hidden sm:block">
                        Zuletzt: {new Date(rule.last_triggered_at).toLocaleDateString('de')}
                      </span>
                    )}
                    <button
                      onClick={() => handleToggle(rule.id, rule.enabled)}
                      disabled={toggling === rule.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        rule.enabled
                          ? 'bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400 border border-green-500/20 hover:border-red-500/20'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-green-500/10 hover:text-green-400 border border-zinc-700 hover:border-green-500/20'
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
      </div>

      {/* Unacknowledged Alerts */}
      {unacknowledged.length > 0 && (
        <div className="bg-red-950/20 rounded-xl border border-red-800/40 overflow-hidden">
          <div className="p-4 border-b border-red-800/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="font-bold text-white">Offene Alerts ({unacknowledged.length})</h3>
          </div>
          <div className="divide-y divide-red-800/20">
            {unacknowledged.map(h => (
              <div key={h.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-300 font-semibold">{(h as any).analytics_alert_rules?.name || `Alert #${h.rule_id}`}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{h.message}</p>
                  <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(h.triggered_at).toLocaleString('de')}
                    {h.metric_value != null && ` · Wert: ${h.metric_value}`}
                  </p>
                </div>
                <button
                  onClick={() => handleAcknowledge(h.id)}
                  disabled={acknowledging === h.id}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-green-900/30 text-zinc-300 hover:text-green-400 border border-zinc-700 hover:border-green-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0"
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
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <h3 className="font-bold text-white">Verlauf ({acknowledged.length} bestätigt)</h3>
        </div>
        {acknowledged.length === 0 && unacknowledged.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            Noch keine Alert-Ereignisse vorhanden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs">Alert</th>
                  <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs">Zeitpunkt</th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium text-xs">Wert</th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {acknowledged.slice(0, 50).map(h => (
                  <tr key={h.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 text-zinc-300 text-xs">
                      {(h as any).analytics_alert_rules?.name || `Regel #${h.rule_id}`}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">
                      {new Date(h.triggered_at).toLocaleString('de')}
                    </td>
                    <td className="text-right py-3 px-4 text-zinc-400 text-xs font-mono">
                      {h.metric_value ?? '–'}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-[10px] bg-green-900/20 text-green-400 border border-green-800/30 px-2 py-0.5 rounded">
                        Bestätigt
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
