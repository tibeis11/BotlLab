'use client'

import { useState, useEffect, useTransition } from 'react'
import { UserPlus, RefreshCw, ShieldCheck, Shield, ToggleLeft, ToggleRight, X, Plus, AlertTriangle, Lock } from 'lucide-react'
import {
  getAdminUserList,
  addAdminUserByEmail,
  setAdminUserActive,
  updateAdminUserRole,
  toggleAdminDailyReport,
  type AdminUserWithAddedBy,
} from '@/lib/actions/admin-user-actions'
import type { AdminRole } from '@/lib/admin-auth'

// ============================================================================
// Role badge
// ============================================================================
const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  admin:       { label: 'Admin',       color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  moderator:   { label: 'Moderator',   color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
}

// ============================================================================
// Main Component
// ============================================================================
export default function AdminAccessView({ canWrite = false }: { canWrite?: boolean }) {
  const [users, setUsers] = useState<AdminUserWithAddedBy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [, startTransition] = useTransition()

  // Add-modal state
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<AdminRole>('admin')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminUserList()
      setUsers(data)
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleToggleActive(u: AdminUserWithAddedBy) {
    try {
      const res = await setAdminUserActive(u.profile_id, !u.is_active)
      if (!res.success) { setError(res.error ?? 'Fehler'); return }
      setUsers(prev => prev.map(x => x.profile_id === u.profile_id ? { ...x, is_active: !u.is_active } : x))
    } catch (e: any) { setError(e.message) }
  }

  async function handleDailyReportToggle(u: AdminUserWithAddedBy) {
    try {
      const res = await toggleAdminDailyReport(u.profile_id, !u.daily_report_enabled)
      if (!res.success) { setError(res.error ?? 'Fehler'); return }
      setUsers(prev => prev.map(x => x.profile_id === u.profile_id ? { ...x, daily_report_enabled: !u.daily_report_enabled } : x))
    } catch (e: any) { setError(e.message) }
  }

  async function handleRoleChange(u: AdminUserWithAddedBy, role: AdminRole) {
    try {
      const res = await updateAdminUserRole(u.profile_id, role)
      if (!res.success) { setError(res.error ?? 'Fehler'); return }
      setUsers(prev => prev.map(x => x.profile_id === u.profile_id ? { ...x, role } : x))
    } catch (e: any) { setError(e.message) }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await addAdminUserByEmail(addEmail.trim(), addRole)
      if (!res.success) { setAddError(res.error ?? 'Fehler'); return }
      setShowAddModal(false)
      setAddEmail('')
      setAddRole('admin')
      startTransition(() => { load() })
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const bootstrapUser = users.length === 1 && users[0].notes?.includes('Auto-bootstrapped')
    ? users[0] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-(--text-primary)">Admin-Zugänge</h2>
          <p className="text-sm text-(--text-muted) mt-0.5">Verwaltung der Nutzer mit Dashboard-Zugriff</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-(--border) text-(--text-muted) hover:text-(--text-primary) hover:border-(--border-active) transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {canWrite && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/20 transition-colors"
            >
              <UserPlus size={14} />
              Admin hinzufügen
            </button>
          )}
        </div>
      </div>

      {/* Read-only notice for non-super-admins */}
      {!canWrite && (
        <div className="flex items-center gap-2 p-3 bg-(--surface) border border-(--border) rounded-xl text-sm text-(--text-muted)">
          <Lock size={14} className="shrink-0" />
          Nur Super-Admins können Admin-Zugänge verwalten. Du kannst die Liste einsehen, aber keine Änderungen vornehmen.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-(--text-disabled) text-sm">Lädt…</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
            <Shield size={28} className="text-(--text-disabled)" />
            <p className="text-(--text-muted) text-sm">Keine Admin-Einträge</p>
            <p className="text-(--text-disabled) text-xs">Trage eine E-Mail in ADMIN_EMAILS ein und lade die Seite neu, um dich zu bootstrappen.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                <th className="text-left px-5 py-3 text-(--text-muted) font-medium text-xs uppercase tracking-wide">E-Mail</th>
                <th className="text-left px-5 py-3 text-(--text-muted) font-medium text-xs uppercase tracking-wide">Rolle</th>
                <th className="text-left px-5 py-3 text-(--text-muted) font-medium text-xs uppercase tracking-wide hidden md:table-cell">Hinzugefügt von</th>
                <th className="text-left px-5 py-3 text-(--text-muted) font-medium text-xs uppercase tracking-wide hidden lg:table-cell">Datum</th>
                <th className="text-center px-5 py-3 text-(--text-muted) font-medium text-xs uppercase tracking-wide">Aktiv</th>
                <th className="text-center px-5 py-3 text-(--text-muted) font-medium text-xs uppercase tracking-wide hidden lg:table-cell">Tagesbericht</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)/60">
              {users.map((u) => {
                const roleCfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.admin
                return (
                  <tr key={u.profile_id} className={`hover:bg-(--surface-hover)/30 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3.5 text-(--text-secondary) font-mono text-xs">{u.email}</td>
                    <td className="px-5 py-3.5">
                      {canWrite ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as AdminRole)}
                          className={`text-xs font-medium px-2 py-1 rounded border bg-transparent cursor-pointer ${roleCfg.color}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                          <option value="moderator">Moderator</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded border ${roleCfg.color}`}>
                          {roleCfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-(--text-muted) text-xs hidden md:table-cell">
                      {u.added_by_email ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-(--text-muted) text-xs hidden lg:table-cell">
                      {new Date(u.added_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {canWrite ? (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="text-zinc-400 hover:text-white transition-colors"
                          title={u.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          {u.is_active
                            ? <ToggleRight size={20} className="text-cyan-500" />
                            : <ToggleLeft size={20} />
                          }
                        </button>
                      ) : (
                        <span className="text-(--text-disabled)">
                          {u.is_active
                            ? <ToggleRight size={20} className="text-(--text-disabled)" />
                            : <ToggleLeft size={20} />
                          }
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center hidden lg:table-cell">
                      {u.role === 'super_admin' ? (
                        canWrite ? (
                          <button
                            onClick={() => handleDailyReportToggle(u)}
                            className="text-zinc-400 hover:text-white transition-colors"
                            title={u.daily_report_enabled ? 'Tagesbericht deaktivieren' : 'Tagesbericht aktivieren'}
                          >
                            {u.daily_report_enabled
                              ? <ToggleRight size={20} className="text-amber-400" />
                              : <ToggleLeft size={20} />
                            }
                          </button>
                        ) : (
                          <span className="text-(--text-disabled)">
                            {u.daily_report_enabled
                              ? <ToggleRight size={20} className="text-(--text-disabled)" />
                              : <ToggleLeft size={20} />
                            }
                          </span>
                        )
                      ) : (
                        <span className="text-(--text-disabled)">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal — only for super-admins */}
      {showAddModal && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-(--surface) border border-(--border-hover) rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-cyan-400" />
                <h3 className="text-(--text-primary) font-semibold">Admin hinzufügen</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-(--text-muted) hover:text-(--text-primary)">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-(--text-secondary) mb-1.5">E-Mail-Adresse</label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="nutzer@beispiel.de"
                  className="w-full bg-(--surface-hover) border border-(--border-hover) text-(--text-primary) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--brand) placeholder-(--text-disabled)"
                />
                <p className="text-(--text-disabled) text-xs mt-1">Nutzer muss bereits ein Konto haben.</p>
              </div>
              <div>
                <label className="block text-xs text-(--text-secondary) mb-1.5">Rolle</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as AdminRole)}
                  className="w-full bg-(--surface-hover) border border-(--border-hover) text-(--text-primary) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--brand)"
                >
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {addError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{addError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-(--border-hover) text-(--text-secondary) text-sm hover:border-(--text-muted) hover:text-(--text-primary) transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={addLoading || !addEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addLoading ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  Hinzufügen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
