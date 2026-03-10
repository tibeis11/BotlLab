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

// ============================================================================
// Phase C.1 – Revenue & Subscriptions
// ============================================================================
export type RevenueStats = {
  activePaidUsers: number
  mrrEur: number
  churnLast30d: number
  upgradeLast30d: number
  downgradeLast30d: number
  tierDistribution: { tier: string; count: number; pct: number }[]
  monthlyTrend: { month: string; mrr: number; activePaid: number }[]
}

export type SubscriptionEvent = {
  id: string
  profileIdMasked: string
  tier: string
  previousTier: string | null
  status: string
  reason: string | null
  changedAt: string
  eventType: 'upgrade' | 'downgrade' | 'new' | 'cancel' | 'reactivate' | 'other'
}

// ============================================================================
// Phase C.2 – Email Reports
// ============================================================================
export type EmailReportStats = {
  activeSubscriptions: number
  weeklySubscriptions: number
  monthlySubscriptions: number
  sentLast30d: number
  failedLast30d: number
  successRate: number
}

export type EmailReportLog = {
  id: string
  breweryId: string
  periodStart: string
  periodEnd: string
  status: 'sent' | 'failed' | 'pending'
  errorMessage: string | null
  emailMasked: string | null
  createdAt: string
}

// ============================================================================
// Phase C.3 – Scan Analytics
// ============================================================================
export type ScanOverview = {
  totalScans: number
  uniqueVisitors: number
  avgPerDay: number
  conversionRate: number
}

export type ScanGeography = {
  countryCode: string
  scans: number
  pct: number
}

export type ScanDevice = {
  deviceType: string
  count: number
  pct: number
}

export type TopScanBrew = {
  brewId: string
  brewName: string
  breweryName: string
  scans: number
}

// ============================================================================
// Phase D — CIS Admin Monitoring
// ============================================================================
export type CisSourceRow = {
  source: string
  count: number
  pct: number
  isHardZero: boolean
}

export type CisIntentRow = {
  intent: string
  count: number
  pct: number
  avgProbability: number
}

export type CisOverview = {
  /** Per scan_source breakdown — tells us how many scans are zeroed by Hard Rule 0.1 */
  sourceBreakdown: CisSourceRow[]
  /** Σ drinking_probability of QR scans in the period — the platform-wide CIS */
  weightedDrinkerEstimate: number
  /** Number of QR scans in the period (denominator for the estimate) */
  qrScanCount: number
  /** Scans still waiting in the 15-min classification window (scan_intent IS NULL) */
  pendingClassification: number
  /** How classified scans are distributed across intents */
  intentDistribution: CisIntentRow[]
  /** Scans marked scan_intent = 'confirmed' (Hard Proofs) */
  confirmedScans: number
  /** confirmedScans / qrScanCount */
  confirmedRate: number
}

export type CisFalseNegative = {
  scanId: string
  userId: string
  brewId: string
  brewName: string
  scanIntent: string
  drinkingProbability: number
  scannedAt: string
  proofType: 'rating' | 'btb'
}

export type CisFalseNegativeSummary = {
  total: number
  byIntent: { intent: string; count: number }[]
  examples: CisFalseNegative[]
}

// ============================================================================
// Enterprise Codes
// ============================================================================
export type EnterpriseCode = {
  id: string
  code: string
  createdAt: string | null
  createdBy: string | null
  currentUses: number
  maxUses: number | null
  expiresAt: string | null
  isActive: boolean
}

// ============================================================================
// Scan Geo-Events (scan_events + scan_event_members)
// ============================================================================
export type AdminScanEvent = {
  id: string
  createdAt: string
  eventStart: string
  eventEnd: string | null
  city: string | null
  countryCode: string | null
  totalScans: number
  uniqueSessions: number
  uniqueBrews: number | null
  eventType: string
  confidence: number
  centerLat: number | null
  centerLng: number | null
  radiusM: number | null
  breweries: string[]
  memberCount: number
}

// ============================================================================
// Nonce monitoring (btb_used_nonces, vibe_check_used_nonces, rating_used_nonces)
// ============================================================================
export type NonceStats = {
  btb: { total: number; last24h: number; last7d: number }
  vibeCheck: { total: number; last24h: number; last7d: number }
  rating: { total: number; last24h: number; last7d: number }
}

// ============================================================================
// Database Health (get_db_health_stats RPC)
// ============================================================================
export type DbHealthStats = {
  dbSizeBytes: number
  dbSizePretty: string
  activeConnections: number
  idleConnections: number
  totalConnections: number
  tableCount: number
  cacheHitRatio: number | null
  biggestTables: { name: string; totalSize: string; totalSizeBytes: number }[]
}
