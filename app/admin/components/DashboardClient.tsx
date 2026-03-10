'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SidebarNav, { type Section, getDefaultView } from './SidebarNav'
import MobileNav from './MobileNav'
import ErrorBoundary from './ErrorBoundary'
import type { AdminRole } from '@/lib/admin-auth'

// Views — Overview
import OverviewView from '@/app/admin/views/OverviewView'

// Views — Analytics
import UsersView from '@/app/admin/views/UsersView'
import ContentView from '@/app/admin/views/ContentView'
import RevenueView from '@/app/admin/views/RevenueView'
import SystemView from '@/app/admin/views/SystemView'

// Views — Operations
import ModerationView from '@/app/admin/views/ModerationView'
import ReportsView from '@/app/admin/views/ReportsView'
import AppealsView from '@/app/admin/views/AppealsView'
import EmailReportsView from '@/app/admin/views/EmailReportsView'

// Views — Product
import BotlguideView from '@/app/admin/views/BotlguideView'
import ScanAnalyticsView from '@/app/admin/views/ScanAnalyticsView'
import AlgorithmsView from '@/app/admin/views/AlgorithmsView'
import ModelAccuracyView from '@/app/admin/views/ModelAccuracyView'

// Views — System
import AlertsView from '@/app/admin/views/AlertsView'
import AuditLogView from '@/app/admin/views/AuditLogView'

// Views — Settings
import SettingsView from '@/app/admin/views/SettingsView'
import DiscoverView from '@/app/admin/views/DiscoverView'
import AdminAccessView from '@/app/admin/views/AdminAccessView'
import ZweiWeltenView from '@/app/admin/views/ZweiWeltenView'
import EnterpriseCodesView from '@/app/admin/views/EnterpriseCodesView'

// Server actions for nav badge counts
import { getUnacknowledgedAlertCount } from '@/lib/actions/analytics-admin-actions'

// ============================================================================
// Helpers
// ============================================================================

function isValidSection(s: string): s is Section {
  return ['overview', 'analytics', 'operations', 'product', 'system', 'settings'].includes(s)
}

function renderView(section: Section, view: string | undefined, role: AdminRole) {
  const isModerator = role === 'moderator'
  const isSuperAdmin = role === 'super_admin'

  if (section === 'overview') return <OverviewView />

  if (section === 'analytics') {
    if (view === 'revenue')  return <RevenueView />
    if (view === 'content')  return <ContentView />
    if (view === 'features') return <SystemView />
    return <UsersView />          // default: growth
  }

  if (section === 'operations') {
    if (view === 'reports')      return <ReportsView />
    if (view === 'appeals')      return <AppealsView />
    if (view === 'emailreports') return <EmailReportsView />
    return <ModerationView />    // default: moderation
  }

  if (section === 'product') {
    if (view === 'scans')       return <ScanAnalyticsView />
    if (view === 'modelhealth') return <ModelAccuracyView />
    if (view === 'algorithms')  return <AlgorithmsView />
    return <BotlguideView />     // default: botlguide
  }

  if (section === 'system') {
    if (view === 'alerts')   return <AlertsView />
    if (view === 'auditlog') return <AuditLogView />
    return <SystemView />        // default: infrastructure
  }

  if (section === 'settings') {
    if (view === 'admins')      return <AdminAccessView canWrite={isSuperAdmin} />
    if (view === 'discover')   return <DiscoverView />
    if (view === 'zweiwelten') return <ZweiWeltenView />
    if (view === 'enterprise') return <EnterpriseCodesView canWrite={isSuperAdmin} />
    return <SettingsView />      // default: plans
  }

  return <OverviewView />
}

// ============================================================================
// Component
// ============================================================================

interface DashboardClientProps {
  userId: string
  role: AdminRole
  initialSection?: Section
  initialView?: string
}

export default function DashboardClient({
  userId,
  role,
  initialSection = 'overview',
  initialView,
}: DashboardClientProps) {
  const router = useRouter()

  const [section, setSection] = useState<Section>(
    isValidSection(initialSection) ? initialSection : 'overview'
  )
  const [view, setView] = useState<string | undefined>(initialView)
  const [alertCount, setAlertCount] = useState(0)
  const [moderationCount] = useState(0) // TODO Phase E: fetch pending moderation count

  // Load alert badge count on mount
  useEffect(() => {
    getUnacknowledgedAlertCount().then(setAlertCount).catch(() => {})
  }, [])

  const navigate = useCallback((newSection: Section, newView?: string) => {
    setSection(newSection)
    setView(newView)

    // Update URL without full page reload — enables browser back/forward
    const params = new URLSearchParams()
    if (newSection !== 'overview') params.set('section', newSection)
    if (newView) params.set('view', newView)
    const query = params.toString()
    router.replace(`/admin/dashboard${query ? `?${query}` : ''}`, { scroll: false })
  }, [router])

  return (
    <div className="flex gap-6 pb-16 lg:pb-0">
      {/* Left sidebar — desktop only */}
      <aside className="w-56 hidden lg:block shrink-0">
        <div className="sticky top-6">
          <SidebarNav
            activeSection={section}
            activeView={view}
            onNavigate={navigate}
            alertCount={alertCount}
            moderationCount={moderationCount}            role={role}          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <ErrorBoundary>
          {renderView(section, view, role)}
        </ErrorBoundary>
      </main>

      {/* Bottom navigation — mobile only */}
      <MobileNav
        activeSection={section}
        onNavigate={navigate}
        alertCount={alertCount}
        moderationCount={moderationCount}
        role={role}
      />
    </div>
  )
}
