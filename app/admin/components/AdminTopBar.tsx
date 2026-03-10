'use client'

import Link from 'next/link'
import {
  BarChart2, Shield, Settings2, ArrowLeft,
} from 'lucide-react'
import type { AdminRole } from '@/lib/admin-auth'
import type { AdminArea } from './AdminShell'

interface AdminTopBarProps {
  activeArea: AdminArea
  role: AdminRole
  alertCount: number
  moderationCount: number
}

const AREAS: { id: AdminArea; label: string; href: string; Icon: React.ElementType }[] = [
  { id: 'command-center', label: 'Command Center', href: '/admin', Icon: BarChart2 },
  { id: 'moderation', label: 'Trust & Safety', href: '/admin/moderation', Icon: Shield },
  { id: 'settings', label: 'Konfiguration', href: '/admin/settings', Icon: Settings2 },
]

export default function AdminTopBar({ activeArea, role, alertCount, moderationCount }: AdminTopBarProps) {
  const ROLE_STYLES: Record<AdminRole, { bg: string; text: string; border: string; label: string }> = {
    super_admin: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Super Admin' },
    admin: { bg: 'bg-(--surface-hover)', text: 'text-(--text-secondary)', border: 'border-(--border)', label: 'Admin' },
    moderator: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Moderator' },
  }

  const roleStyle = ROLE_STYLES[role]

  return (
    <header className="h-14 border-b border-(--border) bg-(--surface-sunken) flex items-center px-6 shrink-0">
      {/* Left: Logo + Role */}
      <div className="flex items-center gap-3 mr-8">
        <h1 className="text-base font-bold tracking-tight">Admin</h1>
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
          {roleStyle.label}
        </span>
      </div>

      {/* Center: Area tabs */}
      <nav className="flex items-center gap-1" role="navigation" aria-label="Admin-Bereiche">
        {AREAS.map(({ id, label, href, Icon }) => {
          const isActive = activeArea === id
          // Badge for moderation area
          const badge = id === 'moderation' ? moderationCount : id === 'settings' ? alertCount : 0

          return (
            <Link
              key={id}
              href={href}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-(--surface) text-(--text-primary) shadow-sm'
                  : 'text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--surface)/50'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {badge > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-5">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Right: Environment + Back */}
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <div className="w-1.5 h-1.5 rounded-full bg-(--success)"></div>
            <p className="text-(--text-secondary) font-mono text-xs">Production</p>
          </div>
        </div>
        <div className="h-6 w-px bg-(--border)"></div>
        <Link
          href="/dashboard"
          className="text-(--text-muted) hover:text-(--text-primary) px-3 py-1.5 rounded-md text-sm font-medium border border-(--border) hover:border-(--border-hover) transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to App
        </Link>
      </div>
    </header>
  )
}
