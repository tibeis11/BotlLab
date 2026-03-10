'use client'

import { useState, useEffect } from 'react'
import {
  getAdminAuditLogs,
} from '@/lib/actions/analytics-admin-actions'
import type { AdminAuditLog } from '@/lib/types/admin-analytics'
import { Shield, ChevronDown, ChevronUp, Clock } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  approve_item: 'text-green-400 bg-green-900/20 border-green-800/30',
  reject_item: 'text-red-400 bg-red-900/20 border-red-800/30',
  delete_content: 'text-red-400 bg-red-900/20 border-red-800/30',
  update_report_status: 'text-blue-400 bg-blue-900/20 border-blue-800/30',
  resolve_appeal: 'text-purple-400 bg-purple-900/20 border-purple-800/30',
  update_user_subscription: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
  trigger_aggregation: 'text-cyan-400 bg-cyan-900/20 border-cyan-800/30',
  set_trending_override: 'text-orange-400 bg-orange-900/20 border-orange-800/30',
  clear_trending_override: 'text-zinc-400 bg-zinc-800 border-zinc-700',
  set_brew_featured: 'text-amber-400 bg-amber-900/20 border-amber-800/30',
  save_algorithm_settings: 'text-indigo-400 bg-indigo-900/20 border-indigo-800/30',
  save_discover_settings: 'text-indigo-400 bg-indigo-900/20 border-indigo-800/30',
  acknowledge_alert: 'text-teal-400 bg-teal-900/20 border-teal-800/30',
  toggle_alert_rule: 'text-sky-400 bg-sky-900/20 border-sky-800/30',
}

const ACTION_LABELS: Record<string, string> = {
  approve_item: 'Freigegeben',
  reject_item: 'Abgelehnt',
  delete_content: 'Gelöscht',
  update_report_status: 'Meldung aktualisiert',
  resolve_appeal: 'Widerspruch bearbeitet',
  update_user_subscription: 'Abo geändert',
  trigger_aggregation: 'Aggregation ausgelöst',
  set_trending_override: 'Trending Override gesetzt',
  clear_trending_override: 'Trending Override gelöscht',
  set_brew_featured: 'Featured Toggle',
  save_algorithm_settings: 'Algorithmus gespeichert',
  save_discover_settings: 'Discover-Einstellungen gespeichert',
  acknowledge_alert: 'Alert bestätigt',
  toggle_alert_rule: 'Alert-Regel umgeschaltet',
}

export default function AuditLogView() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getAdminAuditLogs(200)
      setLogs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const actionTypes = ['all', ...Array.from(new Set(logs.map(l => l.action)))]

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-(--text-muted) border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-zinc-400" />
            <h2 className="text-2xl font-black text-(--text-primary)">Audit-Log</h2>
          </div>
          <p className="text-(--text-muted) text-sm">Alle Admin-Aktionen werden hier protokolliert (letzten 200)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="text-sm text-(--text-secondary) hover:text-(--text-primary) border border-(--border-hover) px-3 py-1.5 rounded-lg">
            ↻ Neu laden
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {actionTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
              filter === type
                ? 'bg-white/10 text-(--text-primary) border-white/20'
                : 'text-(--text-muted) border-(--border) hover:text-(--text-secondary) hover:border-(--border-hover)'
            }`}
          >
            {type === 'all' ? `Alle (${logs.length})` : `${ACTION_LABELS[type] || type} (${logs.filter(l => l.action === type).length})`}
          </button>
        ))}
      </div>

      {/* Log Table */}
      <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-(--text-muted)">Keine Einträge gefunden.</div>
        ) : (
          <div className="divide-y divide-(--border-subtle)">
            {filtered.map(log => (
              <div key={log.id}>
                <div
                  className="flex items-start gap-3 p-4 hover:bg-(--surface-hover)/20 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  {/* Action Badge */}
                  <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider mt-0.5 ${ACTION_COLORS[log.action] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-(--text-secondary) font-mono truncate">
                        {log.resource_id ? `ID: ${log.resource_id.substring(0, 12)}…` : '–'}
                      </p>
                    </div>
                    <p className="text-[10px] text-(--text-disabled) mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString('de')}
                      {log.ip_address && ` · ${log.ip_address}`}
                    </p>
                  </div>

                  {/* Expand indicator */}
                  <div className="flex-shrink-0 text-(--text-disabled)">
                    {expandedId === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === log.id && (
                  <div className="px-4 pb-4 bg-(--surface-sunken)/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-(--text-disabled) mb-1 uppercase tracking-wider text-[10px]">Admin ID</p>
                        <p className="font-mono text-(--text-secondary)">{log.admin_id || '–'}</p>
                      </div>
                      <div>
                        <p className="text-(--text-disabled) mb-1 uppercase tracking-wider text-[10px]">IP-Adresse</p>
                        <p className="font-mono text-(--text-secondary)">{log.ip_address || 'nicht erfasst'}</p>
                      </div>
                      <div>
                        <p className="text-(--text-disabled) mb-1 uppercase tracking-wider text-[10px]">Ressource</p>
                        <p className="font-mono text-(--text-secondary) break-all">{log.resource_id || '–'}</p>
                      </div>
                      <div>
                        <p className="text-(--text-disabled) mb-1 uppercase tracking-wider text-[10px]">User-Agent</p>
                        <p className="font-mono text-(--text-secondary) truncate" title={log.user_agent || undefined}>
                          {log.user_agent || 'nicht erfasst'}
                        </p>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-(--text-disabled) mb-1 uppercase tracking-wider text-[10px]">Details</p>
                          <pre className="bg-(--surface-sunken)/50 rounded p-2 text-(--text-secondary) text-[10px] overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note about IP logging */}
      <div className="bg-(--surface)/50 border border-(--border) rounded-lg p-4 text-xs text-(--text-muted)">
        <p className="font-medium text-(--text-secondary) mb-1">Datenschutzhinweis</p>
        <p>
          IP-Adressen werden nur für destruktive Admin-Aktionen gespeichert. 
          Rein lesende Operationen (Dashboard-Aufrufe, Charts) werden nicht geloggt. 
          Logs werden gemäß DSGVO nach 90 Tagen automatisch gelöscht (TODO: Retention Policy implementieren).
        </p>
      </div>
    </div>
  )
}
