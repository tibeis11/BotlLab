'use client'

import { useState } from 'react'
import {
  LayoutDashboard, BarChart2, TrendingUp, FileText, DollarSign, Cpu,
  Layers, Shield, AlertTriangle, Scale, Mail,
  FlaskConical, BookOpen, QrCode, Settings2,
  Server, Activity, Bell, ClipboardList,
  Wrench, Search, CreditCard, UserCog,
  ChevronDown, EyeOff,
} from 'lucide-react'
import type { AdminRole } from '@/lib/admin-auth'

// ============================================================================
// Types
// ============================================================================

export type Section = 'overview' | 'analytics' | 'operations' | 'product' | 'system' | 'settings'

export interface NavView {
  id: string
  label: string
  Icon: React.ElementType
  badgeKey?: 'alerts' | 'moderation'
}

export interface NavSection {
  section: Section
  label: string
  Icon: React.ElementType
  views: NavView[]
}

// ============================================================================
// Navigation Config
// ============================================================================

export const NAV_CONFIG: NavSection[] = [
  {
    section: 'overview',
    label: 'Übersicht',
    Icon: LayoutDashboard,
    views: [],
  },
  {
    section: 'analytics',
    label: 'Analytics',
    Icon: BarChart2,
    views: [
      { id: 'growth',   label: 'Wachstum',        Icon: TrendingUp },
      { id: 'content',  label: 'Content & Scans',  Icon: FileText },
      { id: 'revenue',  label: 'Revenue',           Icon: DollarSign },
      { id: 'features', label: 'Feature-Nutzung',  Icon: Cpu },
    ],
  },
  {
    section: 'operations',
    label: 'Operations',
    Icon: Layers,
    views: [
      { id: 'moderation',   label: 'Moderation',      Icon: Shield,         badgeKey: 'moderation' },
      { id: 'reports',      label: 'Meldungen',        Icon: AlertTriangle },
      { id: 'appeals',      label: 'Widersprüche',     Icon: Scale },
      { id: 'emailreports', label: 'E-Mail-Reports',   Icon: Mail },
    ],
  },
  {
    section: 'product',
    label: 'Product',
    Icon: FlaskConical,
    views: [
      { id: 'botlguide',  label: 'BotlGuide',     Icon: BookOpen },
      { id: 'scans',      label: 'Scan-Analyse',   Icon: QrCode },
      { id: 'algorithms', label: 'Algorithmen',    Icon: Settings2 },
    ],
  },
  {
    section: 'system',
    label: 'System',
    Icon: Server,
    views: [
      { id: 'infrastructure', label: 'Infrastruktur', Icon: Activity },
      { id: 'alerts',         label: 'Alerts',         Icon: Bell,          badgeKey: 'alerts' },
      { id: 'auditlog',       label: 'Audit-Log',      Icon: ClipboardList },
    ],
  },
  {
    section: 'settings',
    label: 'Einstellungen',
    Icon: Wrench,
    views: [
      { id: 'discover', label: 'Discover',       Icon: Search },
      { id: 'plans',    label: 'Pläne & Tiers',  Icon: CreditCard },
      { id: 'admins',   label: 'Admin-Zugänge',  Icon: UserCog },
    ],
  },
]

// ============================================================================
// Default view per section
// ============================================================================

export function getDefaultView(section: Section): string | undefined {
  const s = NAV_CONFIG.find(c => c.section === section)
  return s?.views[0]?.id
}

// ============================================================================
// Props
// ============================================================================

interface SidebarNavProps {
  activeSection: Section
  activeView: string | undefined
  onNavigate: (section: Section, view?: string) => void
  alertCount: number
  moderationCount: number
  role: AdminRole
}

// ============================================================================
// Component
// ============================================================================

export default function SidebarNav({
  activeSection,
  activeView,
  onNavigate,
  alertCount,
  moderationCount,
  role,
}: SidebarNavProps) {
  const isModerator = role === 'moderator'
  const isSuperAdmin = role === 'super_admin'

  // Sections where moderators have full write access
  const MODERATOR_WRITE_SECTIONS: Section[] = ['operations']

  // Filter nav config based on role:
  // - non-super-admins don't see settings/admins
  const filteredConfig = NAV_CONFIG.map(sec => {
    if (sec.section === 'settings' && !isSuperAdmin) {
      return { ...sec, views: sec.views.filter(v => v.id !== 'admins') }
    }
    return sec
  })
  // Track which sections are expanded. Active section always open.
  const [expanded, setExpanded] = useState<Set<Section>>(() => new Set([activeSection]))

  function toggleSection(section: Section) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  function handleSectionClick(section: Section) {
    if (section === 'overview') {
      onNavigate('overview', undefined)
      return
    }
    const isExpanded = expanded.has(section)
    // Always expand on click; if already expanded toggle collapse
    if (!isExpanded) {
      setExpanded(prev => new Set(prev).add(section))
    } else {
      toggleSection(section)
    }
    // Navigate to default view
    onNavigate(section, getDefaultView(section))
  }

  function getBadgeCount(badgeKey?: 'alerts' | 'moderation') {
    if (badgeKey === 'alerts') return alertCount
    if (badgeKey === 'moderation') return moderationCount
    return 0
  }

  return (
    <nav className="w-full" role="navigation" aria-label="Admin Dashboard Navigation">
      <div className="flex flex-col gap-0.5">
        {filteredConfig.map(({ section, label, Icon, views }) => {
          const isActiveSection = activeSection === section
          const isExpanded = expanded.has(section)
          const hasViews = views.length > 0
          // For moderators: sections outside their write-access are read-only
          const isReadOnly = isModerator && !MODERATOR_WRITE_SECTIONS.includes(section)

          // Section-level badge (for sections with badged views)
          const sectionBadge = views.reduce((sum, v) => sum + getBadgeCount(v.badgeKey), 0)

          return (
            <div key={section}>
              {/* Section Header Button */}
              <button
                onClick={() => handleSectionClick(section)}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                  isActiveSection
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
                aria-expanded={hasViews ? isExpanded : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{label}</span>
                {isReadOnly && (
                  <EyeOff className="w-3 h-3 shrink-0 text-zinc-600" aria-label="Nur Lesezugriff" />
                )}
                {sectionBadge > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {sectionBadge > 99 ? '99+' : sectionBadge}
                  </span>
                )}
                {hasViews && (
                  <ChevronDown
                    className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                )}
              </button>

              {/* Sub-Views (collapsible) */}
              {hasViews && isExpanded && (
                <div className="ml-3 pl-3 border-l border-zinc-800 mb-1 flex flex-col gap-0.5">
                  {views.map(view => {
                    const ViewIcon = view.Icon
                    const isActiveView = isActiveSection && activeView === view.id
                    const badge = getBadgeCount(view.badgeKey)

                    return (
                      <button
                        key={view.id}
                        onClick={() => onNavigate(section, view.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-md flex items-center gap-2.5 text-[13px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                          isActiveView
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                        }`}
                        aria-current={isActiveView ? 'page' : undefined}
                      >
                        <ViewIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{view.label}</span>
                        {badge > 0 && (
                          <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
