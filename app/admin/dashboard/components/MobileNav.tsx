'use client'

import {
  LayoutDashboard, BarChart2, Layers, FlaskConical, Server, Wrench,
} from 'lucide-react'
import type { Section } from './SidebarNav'
import { getDefaultView } from './SidebarNav'

interface MobileNavProps {
  activeSection: Section
  onNavigate: (section: Section, view?: string) => void
  alertCount: number
  moderationCount: number
}

const MOBILE_SECTIONS: { section: Section; label: string; Icon: React.ElementType }[] = [
  { section: 'overview',    label: 'Übersicht',  Icon: LayoutDashboard },
  { section: 'analytics',   label: 'Analytics',  Icon: BarChart2 },
  { section: 'operations',  label: 'Ops',        Icon: Layers },
  { section: 'product',     label: 'Product',    Icon: FlaskConical },
  { section: 'system',      label: 'System',     Icon: Server },
  { section: 'settings',    label: 'Settings',   Icon: Wrench },
]

export default function MobileNav({ activeSection, onNavigate, alertCount, moderationCount }: MobileNavProps) {
  const totalBadge = alertCount + moderationCount

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 lg:hidden"
      role="navigation"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-stretch justify-around h-14">
        {MOBILE_SECTIONS.map(({ section, label, Icon }) => {
          const isActive = activeSection === section
          // Show combined badge only on system (alerts) and operations (moderation)
          const badge =
            section === 'system' ? alertCount :
            section === 'operations' ? moderationCount : 0

          return (
            <button
              key={section}
              onClick={() => onNavigate(section, getDefaultView(section))}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative outline-none ${
                isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/4 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
