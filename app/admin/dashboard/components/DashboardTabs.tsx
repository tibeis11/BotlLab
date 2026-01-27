'use client'

import { BarChart2, Shield, AlertTriangle, Users, Briefcase, FileText, Settings, Wrench } from 'lucide-react'

export type Tab = 'overview' | 'users' | 'business' | 'content' | 'moderation' | 'reports' | 'system' | 'settings'

interface DashboardTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const tabs: { id: Tab; label: string; Icon: any }[] = [
    { id: 'overview', label: 'Übersicht', Icon: BarChart2 },
    { id: 'moderation', label: 'Moderation', Icon: Shield },
    { id: 'reports', label: 'Meldungen', Icon: AlertTriangle },
    { id: 'users', label: 'User', Icon: Users },
    { id: 'business', label: 'Business', Icon: Briefcase },
    { id: 'content', label: 'Content', Icon: FileText },
    { id: 'system', label: 'System', Icon: Settings },
    { id: 'settings', label: 'Einstellungen', Icon: Wrench },
  ]

  return (
    <nav className="w-full" role="navigation" aria-label="Dashboard navigation">
      <div className="flex flex-col gap-2">
        {tabs.map((tab) => {
          const Icon = tab.Icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label} tab`}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                isActive ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-800' : 'text-zinc-400 hover:bg-zinc-900/40'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
