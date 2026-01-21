'use client'

export type Tab = 'overview' | 'users' | 'business' | 'content' | 'system' | 'settings'

interface DashboardTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Übersicht', icon: '📊' },
    { id: 'users', label: 'User', icon: '👥' },
    { id: 'business', label: 'Business', icon: '💰' },
    { id: 'content', label: 'Content', icon: '🍺' },
    { id: 'system', label: 'System', icon: '⚙️' },
    { id: 'settings', label: 'Einstellungen', icon: '🔧' },
  ]

  return (
    <nav className="border-b border-zinc-800 mb-8" role="navigation" aria-label="Dashboard navigation">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-label={`${tab.label} tab`}
            className={`
              px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all
              border-b-2 flex items-center gap-2
              focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black rounded-t-lg
              ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              }
            `}
          >
            <span className="text-base sm:text-lg" aria-hidden="true">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
