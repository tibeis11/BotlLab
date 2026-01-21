'use client'

import { useState } from 'react'
import DashboardTabs, { Tab } from './DashboardTabs'
import ErrorBoundary from './ErrorBoundary'
import OverviewView from '@/app/admin/dashboard/views/OverviewView'
import UsersView from '@/app/admin/dashboard/views/UsersView'
import BusinessView from '@/app/admin/dashboard/views/BusinessView'
import ContentView from '@/app/admin/dashboard/views/ContentView'
import SystemView from '@/app/admin/dashboard/views/SystemView'
import SettingsView from '@/app/admin/dashboard/views/SettingsView'

export default function DashboardClient({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div className="space-y-6">
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <ErrorBoundary>
        {activeTab === 'overview' && <OverviewView />}
      </ErrorBoundary>
      
      <ErrorBoundary>
        {activeTab === 'users' && <UsersView />}
      </ErrorBoundary>
      
      <ErrorBoundary>
        {activeTab === 'business' && <BusinessView />}
      </ErrorBoundary>
      
      <ErrorBoundary>
        {activeTab === 'content' && <ContentView />}
      </ErrorBoundary>
      
      <ErrorBoundary>
        {activeTab === 'system' && <SystemView />}
      </ErrorBoundary>
      
      <ErrorBoundary>
        {activeTab === 'settings' && <SettingsView />}
      </ErrorBoundary>
    </div>
  )
}
