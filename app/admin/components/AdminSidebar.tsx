'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, FileText, DollarSign, QrCode, BookOpen, Mail,
  Shield, AlertTriangle, Scale, ClipboardList, Palette,
  Server, Activity, Settings2, Search, Key, UserCog, Wrench,
} from 'lucide-react'
import type { AdminRole } from '@/lib/admin-auth'
import type { AdminArea } from './AdminShell'

interface SidebarConfig {
  id: string
  label: string
  href: string
  Icon: React.ElementType
  badgeKey?: 'alerts' | 'moderation'
  superAdminOnly?: boolean
}

const COMMAND_CENTER_NAV: SidebarConfig[] = [
  { id: 'overview', label: 'Übersicht', href: '/admin', Icon: LayoutDashboard },
  { id: 'users', label: 'Nutzer & Wachstum', href: '/admin/users', Icon: TrendingUp },
  { id: 'content', label: 'Content', href: '/admin/content', Icon: FileText },
  { id: 'revenue', label: 'Revenue', href: '/admin/revenue', Icon: DollarSign },
  { id: 'scans', label: 'Scans & CIS', href: '/admin/scans', Icon: QrCode },
  { id: 'botlguide', label: 'BotlGuide', href: '/admin/botlguide', Icon: BookOpen },
  { id: 'email', label: 'E-Mail-Zustellung', href: '/admin/email', Icon: Mail },
]

const MODERATION_NAV: SidebarConfig[] = [
  { id: 'queue', label: 'Moderations-Queue', href: '/admin/moderation', Icon: Shield, badgeKey: 'moderation' },
  { id: 'reports', label: 'Meldungen', href: '/admin/moderation/reports', Icon: AlertTriangle },
  { id: 'appeals', label: 'Widersprüche', href: '/admin/moderation/appeals', Icon: Scale },
  { id: 'content-control', label: 'Content-Kontrolle', href: '/admin/moderation/content', Icon: Palette },
  { id: 'audit', label: 'Audit-Log', href: '/admin/moderation/audit', Icon: ClipboardList },
]

const SETTINGS_NAV: SidebarConfig[] = [
  { id: 'system', label: 'System Health', href: '/admin/settings', Icon: Server, badgeKey: 'alerts' },
  { id: 'algorithms', label: 'Algorithmen', href: '/admin/settings/algorithms', Icon: Settings2 },
  { id: 'model', label: 'Model Health', href: '/admin/settings/model', Icon: Activity },
  { id: 'discover', label: 'Discover', href: '/admin/settings/discover', Icon: Search },
  { id: 'enterprise', label: 'Enterprise-Codes', href: '/admin/settings/enterprise', Icon: Key },
  { id: 'admins', label: 'Admin-Zugänge', href: '/admin/settings/admins', Icon: UserCog, superAdminOnly: true },
  { id: 'tools', label: 'Tools', href: '/admin/settings/tools', Icon: Wrench },
]

const NAV_BY_AREA: Record<AdminArea, SidebarConfig[]> = {
  'command-center': COMMAND_CENTER_NAV,
  'moderation': MODERATION_NAV,
  'settings': SETTINGS_NAV,
}

interface AdminSidebarProps {
  activeArea: AdminArea
  role: AdminRole
  alertCount: number
  moderationCount: number
}

export default function AdminSidebar({ activeArea, role, alertCount, moderationCount }: AdminSidebarProps) {
  const pathname = usePathname()
  const isSuperAdmin = role === 'super_admin'

  const items = NAV_BY_AREA[activeArea].filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false
    return true
  })

  function getBadge(badgeKey?: 'alerts' | 'moderation') {
    if (badgeKey === 'alerts') return alertCount
    if (badgeKey === 'moderation') return moderationCount
    return 0
  }

  function isActive(href: string) {
    // Exact match for index routes, startsWith for sub-routes
    if (href === '/admin' || href === '/admin/moderation' || href === '/admin/settings') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-56 border-r border-(--border) bg-(--surface-sunken) shrink-0 overflow-y-auto">
      <nav className="p-3 flex flex-col gap-0.5" role="navigation" aria-label="Bereichs-Navigation">
        {items.map(({ id, label, href, Icon, badgeKey }) => {
          const active = isActive(href)
          const badge = getBadge(badgeKey)

          return (
            <Link
              key={id}
              href={href}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-(--surface) text-(--text-primary) shadow-sm'
                  : 'text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--surface)/50'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-5">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
