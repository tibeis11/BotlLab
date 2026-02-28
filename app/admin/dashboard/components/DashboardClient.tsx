'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SidebarNav, { type Section, getDefaultView } from './SidebarNav'
import MobileNav from './MobileNav'
import ErrorBoundary from './ErrorBoundary'

// Views — Overview
import OverviewView from '@/app/admin/dashboard/views/OverviewView'

// Views — Analytics
import UsersView from '@/app/admin/dashboard/views/UsersView'
import ContentView from '@/app/admin/dashboard/views/ContentView'
import RevenueView from '@/app/admin/dashboard/views/RevenueView'
import SystemView from '@/app/admin/dashboard/views/SystemView'

// Views — Operations
import ModerationView from '@/app/admin/dashboard/views/ModerationView'
import ReportsView from '@/app/admin/dashboard/views/ReportsView'
import AppealsView from '@/app/admin/dashboard/views/AppealsView'
import EmailReportsView from '@/app/admin/dashboard/views/EmailReportsView'

// Views — Product
import BotlguideView from '@/app/admin/dashboard/views/BotlguideView'
import ScanAnalyticsView from '@/app/admin/dashboard/views/ScanAnalyticsView'
import AlgorithmsView from '@/app/admin/dashboard/views/AlgorithmsView'

// Views — System
import AlertsView from '@/app/admin/dashboard/views/AlertsView'
import AuditLogView from '@/app/admin/dashboard/views/AuditLogView'

// Views — Settings
import SettingsView from '@/app/admin/dashboard/views/SettingsView'
import DiscoverView from '@/app/admin/dashboard/views/DiscoverView'
import AdminAccessView from '@/app/admin/dashboard/views/AdminAccessView'

// Server actions for nav badge counts
import { getUnacknowledgedAlertCount } from '@/lib/actions/analytics-admin-actions'

// ============================================================================
// Helpers
// ============================================================================

function isValidSection(s: string): s is Section {
  return ['overview', 'analytics', 'operations', 'product', 'system', 'settings'].includes(s)
}

function renderView(section: Section, view: string | undefined) {
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
    if (view === 'scans')      return <ScanAnalyticsView />
    if (view === 'algorithms') return <AlgorithmsView />
    return <BotlguideView />     // default: botlguide
  }

  if (section === 'system') {
    if (view === 'alerts')   return <AlertsView />
    if (view === 'auditlog') return <AuditLogView />
    return <SystemView />        // default: infrastructure
  }

  if (section === 'settings') {
    if (view === 'admins')   return <AdminAccessView />
    if (view === 'discover') return <DiscoverView />
    return <SettingsView />      // default: plans
  }

  return <OverviewView />
}

// ============================================================================
// Component
// ============================================================================

interface DashboardClientProps {
  userId: string
  initialSection?: Section
  initialView?: string
}

export default function DashboardClient({
  userId,
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
            moderationCount={moderationCount}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <ErrorBoundary>
          {renderView(section, view)}
        </ErrorBoundary>
      </main>

      {/* Bottom navigation — mobile only */}
      <MobileNav
        activeSection={section}
        onNavigate={navigate}
        alertCount={alertCount}
        moderationCount={moderationCount}
      />
    </div>
  )
}
