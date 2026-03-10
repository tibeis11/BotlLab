'use client'

import { useState, useEffect } from 'react'
import { Key, Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw, Copy, Check } from 'lucide-react'
import {
  getAdminEnterpriseCodes,
  createEnterpriseCode,
  toggleEnterpriseCode,
  deleteEnterpriseCode,
} from '@/lib/actions/analytics-admin-actions'
import type { EnterpriseCode } from '@/lib/types/admin-analytics'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export default function EnterpriseCodesView({ canWrite }: { canWrite: boolean }) {
  const [codes, setCodes] = useState<EnterpriseCode[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formCode, setFormCode] = useState('')
  const [formMaxUses, setFormMaxUses] = useState<string>('')
  const [formExpiresAt, setFormExpiresAt] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => { loadCodes() }, [])

  async function loadCodes() {
    setLoading(true)
    try {
      const data = await getAdminEnterpriseCodes()
      setCodes(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!formCode.trim()) return
    setSaving(true)
    setErrorMsg(null)
    const result = await createEnterpriseCode({
      code: formCode,
      maxUses: formMaxUses ? parseInt(formMaxUses) : null,
      expiresAt: formExpiresAt || null,
    })
    setSaving(false)
    if (result.success) {
      setShowForm(false)
      setFormCode('')
      setFormMaxUses('')
      setFormExpiresAt('')
      loadCodes()
    } else {
      setErrorMsg(result.error ?? 'Fehler beim Erstellen')
    }
  }

  async function handleToggle(code: EnterpriseCode) {
    await toggleEnterpriseCode(code.id, !code.isActive)
    setCodes(prev => prev.map(c => c.id === code.id ? { ...c, isActive: !c.isActive } : c))
  }

  async function handleDelete(id: string) {
    if (!confirm('Code wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    await deleteEnterpriseCode(id)
    setCodes(prev => prev.filter(c => c.id !== id))
  }

  async function copyCode(code: string, id: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            Enterprise-Codes
          </h2>
          <p className="text-sm text-(--text-muted) mt-1">
            Einmal- oder Mehrfach-Codes für direkte Tier-Upgrades (ohne Stripe).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCodes}
            className="p-2 text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-hover) rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canWrite && (
            <button
              onClick={() => { setShowForm(!showForm); setErrorMsg(null) }}
              className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neuer Code
            </button>
          )}
        </div>
      </div>

      {/* Create Form */}
      {showForm && canWrite && (
        <div className="bg-(--surface)/80 border border-amber-500/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-amber-300">Neuen Enterprise-Code erstellen</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs text-zinc-400 mb-1">Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toUpperCase())}
                  placeholder="BOTL-XXXX-XXXX"
                  className="flex-1 bg-(--surface-sunken) border border-(--border-hover) rounded-lg px-3 py-2 text-sm font-mono text-(--text-primary) placeholder-(--text-disabled) focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setFormCode(generateCode())}
                  className="px-3 py-2 bg-(--surface-hover) hover:bg-(--border-hover) border border-(--border-hover) rounded-lg text-xs text-(--text-secondary) transition-colors whitespace-nowrap"
                >
                  Generieren
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-(--text-secondary) mb-1">Max. Nutzungen</label>
              <input
                type="number"
                min="1"
                value={formMaxUses}
                onChange={e => setFormMaxUses(e.target.value)}
                placeholder="∞ (unbegrenzt)"
                className="w-full bg-(--surface-sunken) border border-(--border-hover) rounded-lg px-3 py-2 text-sm text-(--text-primary) placeholder-(--text-disabled) focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-(--text-secondary) mb-1">Ablaufdatum</label>
              <input
                type="date"
                value={formExpiresAt}
                onChange={e => setFormExpiresAt(e.target.value)}
                className="w-full bg-(--surface-sunken) border border-(--border-hover) rounded-lg px-3 py-2 text-sm text-(--text-primary) focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowForm(false); setErrorMsg(null) }}
              className="px-4 py-2 text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !formCode.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg text-sm transition-colors"
            >
              {saving ? 'Erstellen…' : 'Code erstellen'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gesamt', value: codes.length, color: 'text-(--text-primary)' },
          { label: 'Aktiv', value: codes.filter(c => c.isActive && !isExpired(c.expiresAt)).length, color: 'text-emerald-400' },
          { label: 'Deaktiviert/Abgelaufen', value: codes.filter(c => !c.isActive || isExpired(c.expiresAt)).length, color: 'text-red-400' },
          { label: 'Nutzungen gesamt', value: codes.reduce((s, c) => s + c.currentUses, 0), color: 'text-amber-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-(--surface) border border-(--border) rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-(--text-muted) mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Codes Table */}
      <div className="bg-(--surface-sunken) border border-(--border) rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-14 text-(--text-disabled)">
            <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Noch keine Enterprise-Codes erstellt.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-(--text-muted) border-b border-(--border) text-left bg-(--surface)/50">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Nutzungen</th>
                  <th className="px-4 py-3">Erstellt</th>
                  <th className="px-4 py-3">Läuft ab</th>
                  {canWrite && <th className="px-4 py-3 text-right">Aktionen</th>}
                </tr>
              </thead>
              <tbody>
                {codes.map(code => {
                  const expired = isExpired(code.expiresAt)
                  const exhausted = code.maxUses !== null && code.currentUses >= code.maxUses
                  const statusColor = !code.isActive || expired || exhausted
                    ? 'text-red-400 bg-red-900/20 border-red-800/30'
                    : 'text-emerald-400 bg-emerald-900/20 border-emerald-800/30'
                  const statusLabel = !code.isActive ? 'Deaktiviert' : expired ? 'Abgelaufen' : exhausted ? 'Erschöpft' : 'Aktiv'

                  return (
                    <tr key={code.id} className="border-b border-(--border)/40 hover:bg-(--surface)/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-amber-300 tracking-wider text-[13px]">{code.code}</code>
                          <button
                            onClick={() => copyCode(code.code, code.id)}
                            className="text-zinc-600 hover:text-zinc-300 transition-colors"
                            title="Kopieren"
                          >
                            {copiedId === code.id
                              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                              : <Copy className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium uppercase tracking-wide border px-2 py-0.5 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-(--text-secondary)">
                        {code.currentUses}
                        {code.maxUses !== null && (
                          <span className="text-(--text-disabled)">/{code.maxUses}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-(--text-muted)">{formatDate(code.createdAt)}</td>
                      <td className={`px-4 py-3 ${expired ? 'text-red-400' : 'text-(--text-muted)'}`}>
                        {formatDate(code.expiresAt)}
                      </td>
                      {canWrite && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleToggle(code)}
                              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
                              title={code.isActive ? 'Deaktivieren' : 'Aktivieren'}
                            >
                              {code.isActive
                                ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                                : <ToggleLeft className="w-4 h-4 text-zinc-500" />
                              }
                            </button>
                            <button
                              onClick={() => handleDelete(code.id)}
                              className="p-1.5 hover:bg-red-900/20 rounded-md transition-colors text-(--text-disabled) hover:text-red-400"
                              title="Löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
