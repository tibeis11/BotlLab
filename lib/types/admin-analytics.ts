// ============================================================================
// Admin Analytics Types
// Created: 2026-01-21
// Purpose: Type definitions for admin analytics system
// ============================================================================

export type UserDailyActivity = {
  id: number
  user_id: string
  date: string
  events_count: number
  session_duration_seconds: number
  features_used: string[]
  last_event_at: string
  created_at: string
}

export type BreweryDailyActivity = {
  id: number
  brewery_id: string
  date: string
  members_count: number
  brews_count: number
  sessions_count: number
  bottles_scanned: number
  ratings_received: number
  active_members: number
  created_at: string
}

export type ContentDaily = {
  id: number
  date: string
  total_brews: number
  total_sessions: number
  total_bottles: number
  total_ratings: number
  public_brews: number
  private_brews: number
  team_brews: number
  avg_rating: number
  brews_created_today: number
  sessions_created_today: number
  created_at: string
}

export type SystemHourly = {
  id: number
  timestamp: string
  hour: number
  date: string
  error_count: number
  avg_response_time_ms: number
  active_users_count: number
  api_calls_count: number
  unique_sessions: number
  created_at: string
}

export type Cohort = {
  cohort_id: string // YYYY-MM
  user_count: number
  retention_day1: number
  retention_day7: number
  retention_day30: number
  retention_day90: number
  avg_events_per_user: number
  avg_brews_per_user: number
  paid_conversion_rate: number
  avg_ltv: number
  updated_at: string
  created_at: string
}

export type FeatureUsage = {
  id: number
  feature: string
  date: string
  usage_count: number
  unique_users: number
  success_count: number
  error_count: number
  avg_duration_seconds: number
  created_at: string
}

export type AlertRule = {
  id: number
  name: string
  description: string
  metric: string
  condition: 'greater_than' | 'less_than' | 'drops_by_percent'
  threshold: number
  timeframe_minutes: number
  notification_channels: string[]
  enabled: boolean
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

export type AlertHistory = {
  id: number
  rule_id: number
  triggered_at: string
  metric_value: number
  message: string
  resolved_at: string | null
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

export type AdminAuditLog = {
  id: number
  admin_id: string | null
  action: string
  resource_id: string | null
  details: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Helper type for date range selection
export type DateRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all'

// Helper function to convert date range to days
export function getDateRangeDays(range: DateRange): number {
  switch (range) {
    case '24h':
      return 1
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
    case '1y':
      return 365
    case 'all':
      return 99999 // Very large number
  }
}

// Helper function to get cutoff date
export function getCutoffDate(range: DateRange): Date {
  const date = new Date()
  const days = getDateRangeDays(range)
  if (days < 99999) {
    date.setDate(date.getDate() - days)
  } else {
    date.setFullYear(2000) // Far past
  }
  return date
}

// Dashboard Summary Types
export type AdminDashboardSummary = {
  totalUsers: number
  activeUsers: number
  totalBrews: number
  totalBreweries: number
  totalSessions: number
  totalScans: number
  errorCount: number
  avgRating: number
}

export type UserGrowthData = {
  date: string
  newUsers: number
  totalUsers: number
}

export type FeatureAdoptionData = {
  feature: string
  usageCount: number
  uniqueUsers: number
  successRate: number
}
