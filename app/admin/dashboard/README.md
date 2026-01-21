# Admin Dashboard

**Location:** `/admin/dashboard`  
**Access:** Restricted to admin emails (see `.env.local` - `ADMIN_EMAILS`)  
**Purpose:** Comprehensive analytics and system monitoring for BotlLab platform

---

## 🏗️ Architecture

### Data Flow

```
Raw Events (analytics_events)
  → Edge Function (aggregate-analytics)
    → Aggregation Tables (analytics_*)
      → Server Actions (analytics-admin-actions.ts)
        → Views (Overview, Users, Business, Content, System)
```

### Directory Structure

```
app/admin/dashboard/
├── page.tsx                 # Entry point (auth check)
├── components/
│   ├── DashboardClient.tsx  # Main client component (tab routing)
│   ├── DashboardTabs.tsx    # Tab navigation
│   ├── DateRangePicker.tsx  # Date filter (7d/30d/90d)
│   ├── MetricCard.tsx       # KPI display card
│   ├── ErrorBoundary.tsx    # Error handling wrapper
│   └── charts/
│       ├── LineChart.tsx    # Recharts line chart wrapper
│       ├── BarChart.tsx     # Recharts bar chart wrapper
│       └── PieChart.tsx     # Recharts pie chart wrapper
└── views/
    ├── OverviewView.tsx     # System overview & health
    ├── UsersView.tsx        # User analytics & cohorts
    ├── BusinessView.tsx     # Brewery metrics
    ├── ContentView.tsx      # Brew & rating analytics
    ├── SystemView.tsx       # System health & errors
    └── SettingsView.tsx     # Configuration (placeholder)
```

---

## 📊 Views Overview

### 1. **Overview** (Default Tab)

- **KPIs:** Total Users, Brews, Breweries, Average Rating
- **System Health:** Active users (30d), Total scans, Error count (24h)
- **Quick Actions:** Manual aggregation trigger, View audit logs

### 2. **Users**

- **User Growth:** Chart of new signups over time
- **Retention:** Cohort analysis (D1, D7, D30, D90)
- **Tier Distribution:** Free/Pro/Premium breakdown (Pie Chart)
- **Engagement:** Avg events/user, Avg brews/user

### 3. **Business**

- **Brewery Growth:** New breweries over time
- **Activity Metrics:** Sessions/day, Bottle scans/day
- **Top Breweries:** Ranked by activity (sessions count)

### 4. **Content**

- **Content Growth:** Brews created per day
- **Visibility:** Public/Private/Team distribution
- **Rating Distribution:** 1-5 star breakdown
- **Top Brews:** Ranked by bottle count

### 5. **System**

- **Error Tracking:** Error rate over time
- **API Performance:** Calls per hour, Active users per hour
- **Feature Usage:** Usage count, unique users, success rate
- **Database Health:** Connection pool, query performance, storage

---

## 🔐 Security & Privacy

### Access Control

- **Admin Check:** Email must be in `ADMIN_EMAILS` environment variable
- **RLS Policies:** All analytics tables use `POLICY "Admin full access" ... USING (false)`
  - Only accessible via Service Role Key (used in Edge Functions)
  - Server Actions run in authenticated context

### DSGVO/GDPR Compliance

- **Data Retention:** 90 days for raw events (`analytics_events`)
- **Audit Logging:** All admin actions logged in `analytics_admin_audit_logs`
- **Anonymization:** User IDs never exposed in exports (TODO: Phase 5)

### Environment Variables Required

```env
ADMIN_EMAILS="admin@example.com,admin2@example.com"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # For Edge Functions
```

---

## 🔧 Server Actions

**File:** `lib/actions/analytics-admin-actions.ts`

All actions automatically log to `analytics_admin_audit_logs` for transparency.

### Dashboard Summary

- `getAdminDashboardSummary()` - Overview KPIs

### User Analytics

- `getUserGrowthChart(dateRange)` - Signup growth over time
- `getActiveUsersCount(dateRange)` - Unique active users
- `getCohortAnalysis()` - Retention by signup month
- `getUserTierDistribution()` - Free/Pro/Premium counts

### Business Analytics

- `getBreweryDailyStats(dateRange)` - Daily brewery activity
- `getBreweryGrowthChart(dateRange)` - New breweries over time

### Content Analytics

- `getContentDailyStats(dateRange)` - Brews/Sessions/Bottles stats
- `getTopBrews(limit)` - Top brews by bottle count
- `getRatingDistribution()` - Rating histogram

### System Health

- `getSystemHourlyStats(dateRange)` - Errors, API calls, active users
- `getFeatureUsageStats(dateRange)` - Feature adoption metrics

### Manual Operations

- `triggerAggregation(mode, date?)` - Manually run aggregation Edge Function

---

## ⚡ Performance Considerations

### Current Optimizations

- ✅ **Pre-aggregated Data:** Queries run against aggregation tables, not raw events
- ✅ **Error Boundaries:** Each view wrapped to prevent cascading failures
- ✅ **Loading States:** Spinner + "Lade..." message during data fetch
- ✅ **Safe Fallbacks:** `?.` and `|| 0` used throughout to prevent crashes

### Future Optimizations (TODO)

- ⚠️ **React.memo():** Memoize chart components to prevent re-renders
- ⚠️ **Lazy Loading:** Code-split views using `next/dynamic`
- ⚠️ **SWR/React Query:** Client-side caching for repeated queries
- ⚠️ **Incremental Static Regeneration:** Pre-render dashboard for fast load

---

## 🗄️ Database Schema

### Aggregation Tables (Created by Phase 1 Migration)

- `analytics_user_daily` - User activity per day
- `analytics_brewery_daily` - Brewery activity per day
- `analytics_content_daily` - Content metrics per day
- `analytics_system_hourly` - System health per hour
- `analytics_cohorts` - User cohort retention
- `analytics_feature_usage` - Feature adoption per day
- `analytics_alert_rules` - Alert configurations (Phase 4)
- `analytics_alert_history` - Triggered alerts (Phase 4)
- `analytics_admin_audit_logs` - Admin action logs (GDPR)

### Cron Jobs (pg_cron)

- **Daily Aggregation** (2 AM): Aggregate yesterday's user/brewery/content data
- **Hourly Aggregation** (Every hour :05): System health metrics
- **Cohort Calculation** (Monday 3 AM): Recalculate retention rates
- **Feature Usage** (Daily 2:30 AM): Feature adoption stats
- **Data Cleanup** (Daily 4 AM): Delete old raw events (90+ days)

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Set `ADMIN_EMAILS` in production `.env`
- [ ] Run all migrations (`npx supabase db push`)
- [ ] Deploy Edge Function (`npx supabase functions deploy aggregate-analytics`)
- [ ] Verify cron jobs are scheduled (`SELECT * FROM cron.job;`)
- [ ] Test admin access at `/admin/dashboard`
- [ ] Verify audit logging works
- [ ] Check data retention is running (90-day cleanup)

### Post-Deployment Monitoring

- [ ] Check Edge Function logs for errors
- [ ] Verify aggregations are running daily
- [ ] Monitor dashboard load times
- [ ] Review audit logs for suspicious access

---

## 📝 Development Notes

### Adding a New View

1. Create `app/admin/dashboard/views/YourView.tsx`
2. Add tab to `DashboardTabs.tsx` (`Tab` type + tabs array)
3. Import and add conditional render in `DashboardClient.tsx`
4. Wrap in `<ErrorBoundary>` for safety

### Adding New Server Actions

1. Add function to `lib/actions/analytics-admin-actions.ts`
2. Call `await logAdminAction('action_name', resourceId, details)`
3. Export function with proper TypeScript types
4. Test error handling (return `null` or throw)

### Database Changes

1. Create migration in `supabase/migrations/`
2. Update TypeScript types in `lib/types/admin-analytics.ts`
3. Test locally with `npx supabase db reset`
4. Deploy with `npx supabase db push`

---

## 🐛 Troubleshooting

### "Cannot read properties of undefined"

- **Cause:** Missing data from aggregation tables (empty database)
- **Fix:** Run `triggerAggregation('daily')` manually from Overview tab
- **Prevention:** Add more `?.` optional chaining and `|| 0` fallbacks

### "Access Denied / Not Admin"

- **Cause:** Email not in `ADMIN_EMAILS` environment variable
- **Fix:** Add email to `.env.local` (comma-separated list)
- **Note:** Restart dev server after changing `.env.local`

### Charts Not Rendering

- **Cause:** Data format mismatch (Recharts expects array of objects)
- **Fix:** Check `xKey` and `yKeys` props match data structure
- **Debug:** `console.log(data)` before passing to chart

### Slow Dashboard Load

- **Cause:** Large raw event table (no aggregations)
- **Fix:** Ensure cron jobs are running and Edge Function works
- **Check:** Query `analytics_user_daily` - should have recent entries

---

## 📚 Related Documentation

- [ROADMAP_ADMIN_DASHBOARD.md](../../../documentation/ROADMAP_ADMIN_DASHBOARD.md) - Full specification
- [Edge Function](../../../supabase/functions/aggregate-analytics/index.ts) - Aggregation logic
- [Migrations](../../../supabase/migrations/) - Database schema

---

**Last Updated:** 2026-01-21  
**Contributors:** GitHub Copilot, Tim
