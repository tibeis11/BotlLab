'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AdminTopBar from './AdminTopBar'
import AdminSidebar from './AdminSidebar'
import ErrorBoundary from './ErrorBoundary'
import type { AdminRole } from '@/lib/admin-auth'
import { getUnacknowledgedAlertCount, getPendingModerationCount } from '@/lib/actions/analytics-admin-actions'

export type AdminArea = 'command-center' | 'moderation' | 'settings'

export interface SidebarItem {
  id: string
  label: string
  icon: React.ElementType
  badgeKey?: 'alerts' | 'moderation'
}

interface AdminShellProps {
  role: AdminRole
  userId: string
  children: ReactNode
}

export default function AdminShell({ role, userId, children }: AdminShellProps) {
  const pathname = usePathname()
  const [alertCount, setAlertCount] = useState(0)
  const [moderationCount, setModerationCount] = useState(0)

  // Determine active area from URL
  const activeArea: AdminArea = pathname.startsWith('/admin/moderation')
    ? 'moderation'
    : pathname.startsWith('/admin/settings')
      ? 'settings'
      : 'command-center'

  useEffect(() => {
    Promise.all([
      getUnacknowledgedAlertCount().catch(() => 0),
      getPendingModerationCount().catch(() => 0),
    ]).then(([alerts, moderation]) => {
      setAlertCount(alerts)
      setModerationCount(moderation)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <AdminTopBar
        activeArea={activeArea}
        role={role}
        alertCount={alertCount}
        moderationCount={moderationCount}
      />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar
          activeArea={activeArea}
          role={role}
          alertCount={alertCount}
          moderationCount={moderationCount}
        />
        <main id="main-content" className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1400px] mx-auto">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
