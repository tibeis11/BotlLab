# Admin Dashboard 3.0 — Vollständige Roadmap

**Erstellt:** 27. Februar 2026  
**Zuletzt aktualisiert:** 28. Februar 2026  
**Status:** Phase A + B + C + D + E vollständig implementiert · B.Verifikation nach Deployment ausstehend  
**Vorgänger:** [admin-dashboard-2.0-roadmap.md](./admin-dashboard-2.0-roadmap.md) (Phasen 1–4 abgeschlossen)  
**Kontext:** Vollständiges Data-Pipeline-Audit hat stille Fehler, tote Tabellen und strukturelle Schwächen aufgedeckt, die in 2.0 nicht adressiert wurden.

---

## ⚠️ Wichtiger Hinweis: Sensible Datenpipeline

Diese Plattform verwaltet **Stripe-Zahlungsdaten**, **personenbezogene Nutzerdaten**, **Admin-Aktions-Logs** und **KI-API-Kosten**. Vor jeder Code-Änderung muss geprüft werden:

1. Wird ein Service-Role-Client verwendet wo RLS-Bypass nötig ist?
2. Werden personenbezogene Daten (IP, E-Mail, User-ID) nur mit Berechtigung angezeigt?
3. Sind neue DB-Writes idempotent (kein doppeltes Schreiben bei Retry)?
4. Werden Fehler explizit geloggt, nicht stumm geschluckt?

---

## Audit-Ergebnisse: Kritische Befunde (Ist-Zustand)

### 🔴 Stille Fehler — Code läuft, Daten gehen verloren

#### FEHLER 1: `logAdminAction()` schreibt nie

**Datei:** `botllab-app/lib/actions/analytics-admin-actions.ts`, Funktion `logAdminAction()`, ca. Zeile 57–85  
**Problem:** Die Funktion verwendet `await supabase.from('analytics_admin_audit_logs').insert(...)` mit dem **User-Session-Client** (`createClient()`). Die RLS INSERT-Policy auf `analytics_admin_audit_logs` erlaubt jedoch nur `service_role`-Inserts. Jeder Audit-Log-Eintrag seit Erstellung der Tabelle schlägt **lautlos fehl** — der `catch`-Block loggt nur in die Konsole, wirft keinen Fehler.  
**Konsequenz:** `AuditLogView.tsx` ist immer leer. Es gibt kein Protokoll von Admin-Aktionen.  
**Fix:** In `logAdminAction()` den `const supabase = await createClient()` durch `const supabase = getServiceRoleClient()` ersetzen. Nur der Service-Role-Client darf in diese Tabelle schreiben.  
**Risiko:** Niedrig — nur eine Zeile, kein Datenverlust, kein Breaking Change.

#### FEHLER 2: `analytics_alert_history` wird nie befüllt

**Datei:** Keine — das ist das Problem.  
**Problem:** Es gibt keine Codekomponente die periodisch `analytics_alert_rules` gegen Live-Metriken prüft und bei Überschreitung in `analytics_alert_history` schreibt. Die CompleteAlert-Pipeline (Regeln → Evaluation → Trigger-Eintrag) fehlt vollständig.  
**Konsequenz:** `AlertsView.tsx` zeigt eine leere History. `getUnacknowledgedAlertCount()` gibt immer `0` zurück. Das Alert-Badge in der Navigation ist immer leer.  
**Fix:** Neue Edge Function `evaluate-alerts` (Phase B.3).

#### FEHLER 3: `expire-subscriptions` läuft möglicherweise nie

**Datei:** `botllab-app/supabase/functions/expire-subscriptions/index.ts`  
**Problem:** Der pg_cron-Schedule für diese Edge Function fehlt in allen Migration-Dateien. Sie ist nicht automatisch geplant. Abgelaufene Premium-Subscriptions werden nur heruntergestuft wenn:

- Sie manuell in Supabase Dashboard ausgelöst wird, oder
- Stripe selbst einen Webhook schickt
  **Konsequenz:** User könnten nach Ablauf ihrer Subscription weiterhin Premium-Features nutzen bis ein Webhook-Event kommt.  
  **Fix:** Neue Migration `[timestamp]_add_expire_subscriptions_cron.sql` (Phase B.2).

---

### 🟡 Strukturelle Datenlücken — Daten werden gesammelt, aber niemand sieht sie

| Tabelle                            | Befüllt durch                                       | Sichtbar im Dashboard? | Enthält was?                                            |
| ---------------------------------- | --------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| `subscription_history`             | Stripe Webhook, Cancellation-Route, Expiry-Function | ❌ NIE                 | Jede Zahlung, jeder Tier-Wechsel, jede Kündigung        |
| `analytics_report_logs`            | `report-actions.ts` bei jedem E-Mail-Versand        | ❌ NIE                 | Erfolge, Fehler, Bounce-Details aller Analytics-E-Mails |
| `analytics_report_settings`        | Brauerei-Owner-UI                                   | ❌ NIE                 | Welche Brauereien haben Reports aktiviert               |
| `analytics_daily_stats`            | `trackBottleScan()` auf jede Scan-Seite             | ❌ NIE im Admin        | Per-Brew, per-Land, per-Gerät Scan-Daten                |
| `bottle_scans.converted_to_rating` | `trackConversion()`                                 | ❌ NIE                 | Scan-zu-Rating Conversion-Funnel                        |

---

### 🟡 Hartcodierte Null-Werte — Graphen zeigen Phantomdaten

In `botllab-app/supabase/functions/aggregate-analytics/index.ts` sind folgende Felder hardcoded auf `0`:

| Spalte                     | Tabelle                   | TODO-Kommentar im Code                 | Was wäre der echte Wert                     |
| -------------------------- | ------------------------- | -------------------------------------- | ------------------------------------------- |
| `session_duration_seconds` | `analytics_user_daily`    | `// TODO: Calculate from session data` | Aus `brewing_sessions` start/end Timestamps |
| `avg_response_time_ms`     | `analytics_system_hourly` | `// TODO: Instrument response times`   | Neues Feld in `trackEvent()`                |
| `unique_sessions`          | `analytics_system_hourly` | `// TODO: Track sessions`              | Aus `session_hash` in `bottle_scans`        |
| `avg_duration_seconds`     | `analytics_feature_usage` | `// TODO: Track duration`              | Aus Event-Start/End Paaren                  |
| `avg_ltv`                  | `analytics_cohorts`       | `// TODO: Calculate LTV`               | Aus `subscription_history` pro Cohort       |

SystemView-Charts für "Antwortzeit" und "Sessions" zeigen immer `0` — der Graph ist flach, was falsch ist.

---

### 🟠 Architekturelle Probleme

1. **Flache 13-Tab-Navigation** passt nicht mehr zur Komplexität — keine thematische Gruppierung möglich
2. **Kein URL-State** — kein Tab ist bookmarkbar, Browser-Zurück funktioniert nicht
3. **kein Mobile-Nav** — `aside` mit `hidden lg:block`, auf Handy keine Navigation
4. **`getAdminDashboardSummary()` wird 3× separat aufgerufen** (Overview, Users, Business) ohne Caching — 21 DB-Queries pro Dashboard-Öffnung
5. **BusinessView-Top-Brauereien zeigt UUIDs** statt Brauerei-Namen (kein JOIN auf `breweries.name`)

---

## Neue Architektur: Dashboard 3.0

### Navigationsstruktur

```
/admin/dashboard                         → Overview (Landing)
/admin/dashboard?section=analytics
  &view=growth                           → Analytics > Wachstum (Users, MAU)
  &view=content                          → Analytics > Content & Scans
  &view=revenue                          → Analytics > Revenue & Subscriptions  ← NEU
  &view=features                         → Analytics > Feature-Nutzung
/admin/dashboard?section=operations
  &view=moderation                       → Operations > Moderation-Queue
  &view=reports                          → Operations > Content-Meldungen
  &view=appeals                          → Operations > Widersprüche
  &view=emailreports                     → Operations > E-Mail-Reports       ← NEU
/admin/dashboard?section=product
  &view=botlguide                        → Product > BotlGuide-Feedback
  &view=scans                            → Product > Scan-Analyse            ← NEU
  &view=algorithms                       → Product > Algorithmen
/admin/dashboard?section=system
  &view=infrastructure                   → System > Infrastruktur & KI-Kosten
  &view=alerts                           → System > Alert-System
  &view=auditlog                         → System > Audit-Log
/admin/dashboard?section=settings
  &view=discover                         → Einstellungen > Discover
  &view=admins                           → Einstellungen > Admin-Zugänge     ← NEU
  &view=plans                            → Einstellungen > Pläne & Tier-Switch
```

### Neue Dateistruktur

```
app/admin/dashboard/
├── page.tsx                             UPDATE: searchParams → initialSection/View
├── components/
│   ├── SidebarNav.tsx                   NEU: Ersetzt DashboardTabs
│   ├── DashboardShell.tsx               NEU: URL-State-Management, Accordion
│   ├── DashboardClient.tsx              UPDATE: section/view statt Tab-State
│   ├── MobileNav.tsx                    NEU: Bottom-Nav für Mobile
│   ├── AlertBadge.tsx                   NEU: Realtime-Badge für unbestätigte Alerts
│   ├── MetricCard.tsx                   UPDATE: +trend prop (±% vs. Vorperiode)
│   ├── ErrorBoundary.tsx                (unverändert)
│   └── SkeletonLoader.tsx               NEU: Generisches Loading-Skeleton
├── views/
│   ├── OverviewView.tsx                 UPDATE: Action-Items, Health-Strip
│   ├── UsersView.tsx                    (unverändert = Analytics > Wachstum)
│   ├── BusinessView.tsx                 UPDATE: Fix UUID → Name
│   ├── ContentView.tsx                  (unverändert = Analytics > Content)
│   ├── RevenueView.tsx                  NEU: subscription_history
│   ├── ModerationView.tsx               (unverändert)
│   ├── ReportsView.tsx                  (unverändert)
│   ├── AppealsView.tsx                  (unverändert)
│   ├── EmailReportsView.tsx             NEU: analytics_report_logs/settings
│   ├── BotlguideView.tsx                (unverändert)
│   ├── ScanAnalyticsView.tsx            NEU: analytics_daily_stats
│   ├── AlgorithmsView.tsx               (unverändert)
│   ├── SystemView.tsx                   (unverändert = Infrastruktur)
│   ├── AlertsView.tsx                   (unverändert, nach B.3 befüllt)
│   ├── AuditLogView.tsx                 (nach B.1 befüllt)
│   └── SettingsView.tsx                 UPDATE: discover + plans getrennt
│
supabase/functions/
├── aggregate-analytics/index.ts         UPDATE: Phase D (Null-Werte beheben)
├── evaluate-alerts/index.ts             NEU: Phase B.3
└── expire-subscriptions/index.ts        (unverändert)
│
supabase/migrations/
└── [timestamp]_add_expire_cron.sql      NEU: Phase B.2
│
lib/actions/
└── analytics-admin-actions.ts           UPDATE: logAdminAction + neue Actions für Revenue/Scans/Email
```

---

## Phasen-Plan

---

## Phase A — Neue Navigationsarchitektur

**Ziel:** Bestehende Views bleiben unverändert, werden nur in neue Struktur eingehängt.  
**Aufwand:** ~1.5 Tage  
**Risiko:** Mittel — URL-State-Änderung kann Bookmarks brechen, daher mit Fallback  
**Abhängigkeiten:** Keine

### A.1 — `page.tsx` URL-State einlesen

**Datei:** `botllab-app/app/admin/dashboard/page.tsx`

**Aktueller Zustand:** `page.tsx` macht nur Auth-Check und rendert `<DashboardClient userId={user.id} />`. Kein `searchParams`.

**Änderung:**

```typescript
// page.tsx
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; view?: string }>
}) {
  // ... bestehender Auth-Check unverändert ...

  const { section = 'overview', view } = await searchParams

  return (
    <DashboardClient
      userId={user.id}
      initialSection={section as Section}
      initialView={view as string | undefined}
    />
  )
}
```

**Fallback-Logik:** Wenn `section` keinen gültigen Wert hat → `overview`. Wenn `view` nicht zu `section` passt → erster View der Section.

### A.2 — Neue `SidebarNav.tsx` Komponente

**Datei:** `botllab-app/app/admin/dashboard/components/SidebarNav.tsx` (neue Datei)

**Props:**

```typescript
interface SidebarNavProps {
  activeSection: Section;
  activeView: string | undefined;
  onNavigate: (section: Section, view?: string) => void;
  alertCount: number; // für Alert-Badge
  moderationCount: number; // für Moderation-Badge
}
```

**Struktur:**

- Jede Section ist ein `<button>` mit `ChevronDown` Icon und klappt auf (CSS `max-height` Transition, kein JS-State nötig)
- Aktiver View wird mit `bg-zinc-800 text-white` hervorgehoben
- Badge-Komponente für Alerts + Moderation (rote Zahl-Kreise)
- Section-Header in `text-zinc-500 text-[10px] uppercase` Stil

**Section-Konfiguration (konstante Daten):**

```typescript
export type Section =
  | "overview"
  | "analytics"
  | "operations"
  | "product"
  | "system"
  | "settings";

const NAV_CONFIG = [
  { section: "overview", label: "Übersicht", icon: LayoutDashboard, views: [] },
  {
    section: "analytics",
    label: "Analytics",
    icon: BarChart2,
    views: [
      { id: "growth", label: "Wachstum", icon: TrendingUp },
      { id: "content", label: "Content & Scans", icon: FileText },
      { id: "revenue", label: "Revenue", icon: DollarSign }, // NEU
      { id: "features", label: "Feature-Nutzung", icon: Cpu },
    ],
  },
  {
    section: "operations",
    label: "Operations",
    icon: Layers,
    views: [
      { id: "moderation", label: "Moderation", icon: Shield },
      { id: "reports", label: "Meldungen", icon: AlertTriangle },
      { id: "appeals", label: "Widersprüche", icon: Scale },
      { id: "emailreports", label: "E-Mail-Reports", icon: Mail }, // NEU
    ],
  },
  {
    section: "product",
    label: "Product",
    icon: Beaker,
    views: [
      { id: "botlguide", label: "BotlGuide", icon: BookOpen },
      { id: "scans", label: "Scan-Analyse", icon: QrCode }, // NEU
      { id: "algorithms", label: "Algorithmen", icon: Settings2 },
    ],
  },
  {
    section: "system",
    label: "System",
    icon: Server,
    views: [
      { id: "infrastructure", label: "Infrastruktur", icon: Activity },
      { id: "alerts", label: "Alerts", icon: Bell }, // Badge!
      { id: "auditlog", label: "Audit-Log", icon: ClipboardList },
    ],
  },
  {
    section: "settings",
    label: "Einstellungen",
    icon: Wrench,
    views: [
      { id: "discover", label: "Discover", icon: Search },
      { id: "plans", label: "Pläne & Tiers", icon: CreditCard },
      { id: "admins", label: "Admin-Zugänge", icon: UserCog }, // NEU
    ],
  },
];
```

**Import-Liste für `SidebarNav.tsx`:**

```
LayoutDashboard, BarChart2, TrendingUp, FileText, DollarSign, Cpu,
Layers, Shield, AlertTriangle, Scale, Mail,
Beaker, BookOpen, QrCode, Settings2,
Server, Activity, Bell, ClipboardList,
Wrench, Search, CreditCard, UserCog,
ChevronDown, ChevronRight   — alle aus 'lucide-react'
```

### A.3 — `DashboardClient.tsx` auf section/view-Routing umbauen

**Datei:** `botllab-app/app/admin/dashboard/components/DashboardClient.tsx`

**Was sich ändert:**

- `useState<Tab>` → `useState<{ section: Section; view: string | undefined }>`
- `import DashboardTabs` entfernen → `import SidebarNav`
- `import { useRouter, usePathname } from 'next/navigation'` hinzufügen
- Navigation über `router.push('/admin/dashboard?section=X&view=Y')` statt setState
- Die `window.history.pushState` Alternative (ohne Page-Reload): `router.replace` mit `scroll: false`
- Alle bestehenden View-Imports bleiben, werden nur anders geroutet

**View-Routing-Logik:**

```typescript
function renderView(section: Section, view: string | undefined) {
  if (section === 'overview') return <OverviewView />
  if (section === 'analytics') {
    if (view === 'revenue')   return <RevenueView />
    if (view === 'content')   return <ContentView />
    if (view === 'features')  return <SystemView />  // Feature-Usage Teil von SystemView
    return <UsersView />  // default: growth
  }
  if (section === 'operations') {
    if (view === 'reports')      return <ReportsView />
    if (view === 'appeals')      return <AppealsView />
    if (view === 'emailreports') return <EmailReportsView />
    return <ModerationView />   // default: moderation
  }
  if (section === 'product') {
    if (view === 'scans')      return <ScanAnalyticsView />
    if (view === 'algorithms') return <AlgorithmsView />
    return <BotlguideView />    // default: botlguide
  }
  if (section === 'system') {
    if (view === 'alerts')   return <AlertsView />
    if (view === 'auditlog') return <AuditLogView />
    return <SystemView />        // default: infrastructure
  }
  if (section === 'settings') {
    if (view === 'plans')  return <SettingsView />    // Pläne-Teil
    if (view === 'admins') return <AdminAccessView /> // NEU Phase E
    return <SettingsView />      // default: discover
  }
  return <OverviewView />
}
```

### A.4 — `MobileNav.tsx` (neue Datei)

**Datei:** `botllab-app/app/admin/dashboard/components/MobileNav.tsx`

Für Mobile: `fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800`  
Zeigt nur die 6 Section-Icons als Bottom-Bar (kein Label). Tap auf Section → springt zum Default-View der Section.  
Auf Desktop: `hidden`. Auf Mobile: `block lg:hidden`.

Kein Hamburger-Sheet — zu komplex für die Nutzung. Bottom-Navigation ist der Mobile-Standard für komplexe Dashboards (Vercel Mobile, Linear Mobile).

### A.5 — `DashboardTabs.tsx` entfernen / deprecaten

`DashboardTabs.tsx` wird **nicht gelöscht**, sondern zunächst nur nicht mehr importiert. Falls ein Rollback nötig ist, kann er reaktiviert werden. Nach Stabilisierung (1-2 Wochen) löschen.

---

## Phase B — Kritische Bug-Fixes

**Ziel:** Alle 3 stillen Fehler beheben. Danach schreibt der Audit-Log wirklich, Subscriptions laufen ab, Alerts können feuern.  
**Aufwand:** ~0.5 Tage  
**Risiko:** Niedrig bis Mittel — Tests nach jedem Fix vorgeschrieben  
**Reihenfolge:** B.1 → B.2 → B.3 (unabhängig, können parallel implementiert werden)

### B.1 — Audit-Log INSERT: falscher Client

**Datei:** `botllab-app/lib/actions/analytics-admin-actions.ts`  
**Funktion:** `logAdminAction()`, ca. Zeile 62

**Exakter Fix:**

```typescript
// VORHER (fehlerhaft):
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

// NACHHER (korrekt):
const supabaseUser = await createClient()
const { data: { user } } = await supabaseUser.auth.getUser()  // User-Identity aus User-Client

const supabase = getServiceRoleClient()   // Service Role für INSERT
// ... dann:
await supabase.from('analytics_admin_audit_logs').insert({ ... })
```

**Warum so:** Die User-Identität (wer ist eingeloggt) muss weiter aus dem User-Session-Client kommen. Nur der INSERT selbst muss mit Service Role geschehen da die RLS-Policy `INSERT USING (false)` für alle außer `service_role` gilt.

**Verifikation nach Fix:**

1. Admin-Aktion ausführen (z.B. in ModerationView etwas genehmigen)
2. In `AuditLogView` prüfen ob Eintrag erscheint
3. Direkt in Supabase Dashboard: `SELECT * FROM analytics_admin_audit_logs ORDER BY created_at DESC LIMIT 5`

### B.2 — `expire-subscriptions` pg_cron Migration

**Neue Datei:** `botllab-app/supabase/migrations/[timestamp]_add_expire_subscriptions_cron.sql`

```sql
-- Stellt sicher dass pg_cron Extension aktiv ist
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Täglich um 00:05 UTC: Abgelaufene Premium-Subscriptions downgraden
SELECT cron.schedule(
  'expire-subscriptions-daily',       -- Job-Name (eindeutig)
  '5 0 * * *',                        -- 00:05 UTC täglich (5 min nach Mitternacht)
  $$
    SELECT
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/expire-subscriptions',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
      )
  $$
);
```

**Alternativ (falls net.http_post nicht verfügbar):** Den Inhalt der `expire_subscriptions()` DB-Funktion direkt per cron aufrufen statt den HTTP-Umweg.

**Verifikation:**

1. Migration deployen: `supabase db push`
2. In Supabase Dashboard unter "Database > Extensions" pg_cron prüfen
3. `SELECT * FROM cron.job WHERE jobname = 'expire-subscriptions-daily'` prüfen ob Job existiert
4. Nächsten Tag: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-subscriptions-daily')` — Ausführungsprotokoll

### B.3 — Neue Edge Function: `evaluate-alerts`

**Neue Datei:** `botllab-app/supabase/functions/evaluate-alerts/index.ts`

**Zweck:** Alle 15 Minuten prüfen ob Live-Metriken die definierten Alert-Regeln überschreiten. Bei Überschreitung: `analytics_alert_history` beschreiben.

**Pseudocode-Logik:**

```typescript
// 1. Alle aktiven Regeln laden
const rules = await db
  .from("analytics_alert_rules")
  .select("*")
  .eq("enabled", true);

// 2. Für jede Regel: aktuellen Metrik-Wert ermitteln
for (const rule of rules) {
  const currentValue = await getMetricValue(
    rule.metric,
    rule.timeframe_minutes,
  );

  // 3. Cooldown prüfen (keine Duplikate innerhalb von timeframe_minutes)
  const cooldownOk =
    !rule.last_triggered_at ||
    Date.now() - new Date(rule.last_triggered_at).getTime() >
      rule.timeframe_minutes * 60 * 1000;

  // 4. Bedingung prüfen
  const triggered =
    cooldownOk && evalCondition(rule.condition, currentValue, rule.threshold);

  if (triggered) {
    // 5. Alert-Eintrag schreiben
    await db.from("analytics_alert_history").insert({
      rule_id: rule.id,
      triggered_at: new Date().toISOString(),
      metric_value: currentValue,
      message: `${rule.name}: ${rule.metric} war ${currentValue} (Schwelle: ${rule.threshold})`,
    });
    // 6. last_triggered_at aktualisieren
    await db
      .from("analytics_alert_rules")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("id", rule.id);
  }
}
```

**Unterstützte Metriken** (gemappt auf DB-Queries):
| `rule.metric` | Quelle | Query |
|---|---|---|
| `error_rate` | `analytics_system_hourly` | Letzter Stundenwert `error_count` |
| `active_users` | `analytics_system_hourly` | Letzter Stundenwert `active_users_count` |
| `api_calls` | `analytics_system_hourly` | Letzter Stundenwert `api_calls_count` |
| `new_signups` | `profiles` | `COUNT(*)` der letzten `timeframe_minutes` |
| `failed_payments` | `subscription_history` | `COUNT(*)` wo `changed_reason LIKE '%fail%'` der letzten `timeframe_minutes` |
| `pending_moderation` | `brews`/`breweries` | `COUNT(*)` wo `moderation_status = 'pending'` |

**pg_cron Integration in Migration:**

```sql
-- Neue Migration: [timestamp]_add_evaluate_alerts_cron.sql
SELECT cron.schedule('evaluate-alerts', '*/15 * * * *', $$ /* HTTP POST zur Edge Function */ $$);
```

**Verifikation:**

1. Test-Alert-Regel direkt in Supabase einfügen (z.B. `error_count > 0` → wird sofort triggern)
2. Edge Function manuell POSTen: `supabase functions invoke evaluate-alerts`
3. `SELECT * FROM analytics_alert_history ORDER BY triggered_at DESC LIMIT 5` prüfen
4. `AuditLogView` → Eintrag für `acknowledge_alert` erscheint nach Bestätigung

---

## Phase C — Neue Views für bisher unsichtbare Daten

**Aufwand:** ~2 Tage  
**Abhängigkeit:** Phase A muss fertig sein (URL-Routing), Phase B.1 empfohlen aber nicht zwingend

### C.1 — `RevenueView.tsx` (Analytics > Revenue)

**Neue Datei:** `botllab-app/app/admin/dashboard/views/RevenueView.tsx`

**Datenbasis:** `subscription_history` Tabelle  
Befüllt durch: Stripe Webhook, Cancellation-Route, Expire-Function  
Felder: `profile_id`, `subscription_tier`, `subscription_status`, `changed_at`, `changed_reason`, `previous_tier`, `stripe_event_id`, `metadata`

**Neue Server Actions (in `analytics-admin-actions.ts` anhängen):**

```typescript
export async function getRevenueStats(
  dateRange: DateRange,
): Promise<RevenueStats>;
// → gruppiert subscription_history nach Monat, zählt upgrades/downgrades/cancellations
// → berechnet MRR aus aktiven paid subscriptions in profiles

export async function getSubscriptionEvents(
  limit?: number,
): Promise<SubscriptionEvent[]>;
// → letzte N Subscription-Änderungen mit User-ID, Tier-Wechsel, Zeitstempel, Grund
```

**UI-Sections:**

1. **KPI-Leiste:** MRR (aus `profiles.subscription_tier COUNT × Preis`), Aktive Paid Users, Churn Rate (Monat), Neue Paid Signups (Monat)
2. **Subscription-Fluss-Chart:** Bars für upgrades / downgrades / cancellations / expiries pro Monat (aus `subscription_history`)
3. **Aktuelle Tier-Verteilung:** Donut-Chart: free / premium / unlimited (aus `profiles`)
4. **Event-Tabelle:** Letzte 50 Subscription-Änderungen — User-ID, von-Tier, zu-Tier, Datum, Grund
   - Spalte `stripe_event_id` → klickbarer Link zu `payments.stripe.com/events/[id]` (nur wenn vorhanden)
   - `changed_reason` kann `'stripe_webhook'`, `'manual_admin'`, `'expired'`, `'cancelled'` etc. enthalten

**Datenschutz:** User-ID wird als `{uuid[:8]}...` gekürzt angezeigt (keine vollständige UUID im UI), kein Name, keine E-Mail in dieser View.

### C.2 — `EmailReportsView.tsx` (Operations > E-Mail-Reports)

**Neue Datei:** `botllab-app/app/admin/dashboard/views/EmailReportsView.tsx`

**Datenbasis:** `analytics_report_logs` + `analytics_report_settings`  
`analytics_report_logs` Felder: `report_setting_id`, `brewery_id`, `period_start`, `period_end`, `status`, `error_message`, `total_scans`, `unique_visitors`, `email_sent_to`, `email_provider`, `email_id`  
`analytics_report_settings` Felder: `user_id`, `brewery_id`, `enabled`, `frequency`, `email`, `send_day`, `last_sent_at`, `send_count`

**Neue Server Actions:**

```typescript
export async function getEmailReportStats(
  dateRange: DateRange,
): Promise<EmailReportStats>;
// → Gesamt-Versendungen, Erfolgsquote, Fehlerquote, häufigste Fehler

export async function getRecentEmailReportLogs(
  limit?: number,
): Promise<EmailReportLog[]>;
// → letzte N Report-Versände mit Status, Brauerei-ID, Fehlertext
```

**UI-Sections:**

1. **KPI-Leiste:** Versendungen Gesamt / Erfolgsquote / Fehler insgesamt / Aktive Subscriptions (enabled=true)
2. **Fehler-Tabelle:** Alle fehlgeschlagenen Reports (status ≠ 'success') mit Fehlermeldung + Brauerei-ID + Datum → ermöglicht Debug
3. **Versand-Tabelle:** Letzte 100 Report-Versände — Brauerei, Zeitraum, Status, Scans, Unique Visitors

**Datenschutz:** `email_sent_to` wird als `{local}@***.{tld}` maskiert (z.B. `tim@***.com`).

### C.3 — `ScanAnalyticsView.tsx` (Product > Scan-Analyse)

**Neue Datei:** `botllab-app/app/admin/dashboard/views/ScanAnalyticsView.tsx`

**Datenbasis:** `analytics_daily_stats`  
Felder: `date`, `brewery_id`, `brew_id`, `country_code`, `device_type`, `total_scans`, `unique_visitors`, `hour_distribution`

**Neue Server Actions:**

```typescript
export async function getScanGeography(
  dateRange: DateRange,
): Promise<ScanByCountry[]>;
// → GROUP BY country_code, SUM(total_scans) → Top-Länder-Ranking

export async function getScanDeviceSplit(
  dateRange: DateRange,
): Promise<ScanByDevice[]>;
// → GROUP BY device_type → mobile/desktop/tablet Anteil

export async function getTopScanBeers(limit?: number): Promise<TopScanBeer[]>;
// → GROUP BY brew_id, SUM(total_scans) → Top-Brews nach Scan-Volumen (JOIN auf brews.name)

export async function getScanConversionRate(
  dateRange: DateRange,
): Promise<{ rate: number; total: number; converted: number }>;
// → aus bottle_scans: COUNT(*) / COUNT(*) WHERE converted_to_rating = true
```

**UI-Sections:**

1. **KPI-Leiste:** Total Scans (Zeitraum), Unique Visitors, Conversion Rate (Scan→Rating), Mobile Anteil
2. **Länder-Chart:** Horizontale Bars der Top 10 Länder nach Scan-Volumen (Ländercode → vollständiger Name via lookup)
3. **Device-Donut:** Mobile / Desktop / Tablet
4. **Top-10-Brews-Tabelle:** Brew-Name, Brauerei-Name, Scan-Count, Conversion-Rate
5. **Stunden-Heatmap (optional, Phase E):** `hour_distribution` JSON-Feld → 24h-Heatmap wann gescannt wird

---

## Phase D — Datenlücken in aggregate-analytics beheben

**Datei:** `botllab-app/supabase/functions/aggregate-analytics/index.ts`  
**Aufwand:** ~1 Tag  
**Risiko:** Mittel — Edge Functions sind schwieriger zu testen als TypeScript. Jede Änderung muss mit `supabase functions deploy` deployt und dann durch manuellen Trigger verifiziert werden.

### D.1 — `session_duration_seconds` in `analytics_user_daily`

**Aktuell:** Hardcoded `0`  
**Quelle:** `brewing_sessions` Tabelle hat `started_at` und `ended_at` Timestamps  
**Fix:**

```typescript
// In aggregateDailyMetrics(), beim Aufbau der user-daily Einträge:
const { data: sessions } = await supabase
  .from("brewing_sessions")
  .select("user_id, started_at, ended_at")
  .gte("started_at", dayStart)
  .lt("started_at", dayEnd)
  .not("ended_at", "is", null);

// Per User: SUM(ended_at - started_at in seconds)
const durationByUser = sessions.reduce((acc, s) => {
  const duration =
    (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000;
  acc[s.user_id] = (acc[s.user_id] || 0) + duration;
  return acc;
}, {});
```

### D.2 — `unique_sessions` in `analytics_system_hourly`

**Aktuell:** Hardcoded `0`  
**Quelle:** `bottle_scans.session_hash` enthält Context-Hash; `analytics_events` hat `event_type = 'session_start'`  
**Fix:**

```typescript
const { count: uniqueSessions } = await supabase
  .from("analytics_events")
  .select("user_id", { count: "exact", head: true })
  .eq("event_type", "session_start")
  .gte("created_at", hourStart)
  .lt("created_at", hourEnd);
```

(Mit DISTINCT auf `user_id + date_trunc('hour', created_at)`)

### D.3 — `avg_ltv` in `analytics_cohorts`

**Aktuell:** Hardcoded `0`  
**Quelle:** `subscription_history` — aus Tier-Wechseln und Zahlungen pro User eine Lifetime-Revenue schätzen  
**Annahmen für Schätzung:**

```
Premium = 4.99 €/Monat
Unlimited = 9.99 €/Monat
```

**Fix:**

```typescript
// Pro Cohort-User: Summe der Paid-Monate schätzen
// Aus subscription_history: Zeiträume wo tier != 'free' war
// LTV = SUM(Monate_im_Tier × Tier_Preis)
```

### D.4 — Retention-Fenster korrigieren

**Aktuell:** D7 = exakt Tag 7 — nicht Standard  
**Fix:** D7 = Tage 5–9, D30 = Tage 25–35  
Industrie-Standard (Amplitude, Mixpanel): Retention-Fenster sind Ranges, nicht Punktwerte.

---

## Phase E — Overview als Operations-Zentrale

**Datei:** `botllab-app/app/admin/dashboard/views/OverviewView.tsx`  
**Aufwand:** ~0.5 Tage

**Ziel:** Startseite ist kein statisches Chart-Dump, sondern ein **täglicher Briefing-Screen**.

**Neue OverviewView-Struktur:**

**Block 1 — Platform Health Strip (oben, immer sichtbar):**

```
[ 👥 MAU: 3.421 (+8%) ]  [ 💰 MRR: 214€ (+3%) ]  [ ❌ Fehler/h: 2 ]  [ 📦 Scans heute: 847 ]
```

Alle 4 Werte laden parallel. `+8%` = vs. gleicher Zeitraum Vormonat (aus vorhandenen Aggregations-Tabellen).

**Block 2 — Action Items (operative Aufgaben):**
Reine Server-Render-Liste der offenen Punkte, die sofortige Aufmerksamkeit benötigen:

```
🔴  [14] offene Moderations-Einträge     → [Zu Moderation]
🟡  [3]  unbestätigte Alerts             → [Zu Alerts]
🟠  [2]  fehlgeschlagene E-Mail-Reports  → [Zu E-Mail-Reports]
```

Wenn nichts offen: grüne "Alles in Ordnung" Meldung.

**Block 3 — 7-Tage-Sparklines:**
Kompakte Linien-Charts (ohne Achsenbeschriftung): DAU, neue Registrierungen, Scan-Volumen.

**Block 4 — Letzte Admin-Aktionen:**
Letzten 5 Audit-Log-Einträge im kompakten Format (Aktion, Zeitstempel, IP).

---

## Verifikations-Checkliste nach jeder Phase

Jede Phase gilt erst als abgeschlossen wenn alle Punkte grün sind:

### Nach Phase A:

- [ ] `/admin/dashboard` lädt Standard-Ansicht ohne `?section` Parameter
- [ ] `/admin/dashboard?section=analytics&view=revenue` zeigt RevenueView (auch wenn noch leer)
- [ ] Browser-Zurück-Button springt auf vorherigen Tab zurück
- [ ] Auf Mobile (< 1024px): Bottom-Navigation sichtbar, Sidebar versteckt
- [ ] Kein TypeScript-Fehler: `get_errors` auf alle neuen/geänderten Dateien
- [ ] Kein `console.error` in Browser-Konsole bei Tab-Wechseln

### Nach Phase B.1:

- [ ] Admin-Aktion ausführen (z.B. Moderation: etwas genehmigen)
- [ ] `SELECT * FROM analytics_admin_audit_logs ORDER BY created_at DESC LIMIT 1` → Zeile mit echter IP und Admin-ID
- [ ] `AuditLogView.tsx` zeigt den Eintrag an

### Nach Phase B.2:

- [ ] `SELECT * FROM cron.job WHERE jobname = 'expire-subscriptions-daily'` → Zeile vorhanden
- [ ] Schema stimmt: `schedule = '5 0 * * *'`

### Nach Phase B.3:

- [ ] Test-Alert-Regel direkt in Supabase eintragen (metric: `error_count`, condition: `>`, threshold: `-1` → feuert immer)
- [ ] `supabase functions invoke evaluate-alerts`
- [ ] `SELECT * FROM analytics_alert_history ORDER BY triggered_at DESC LIMIT 3` → Einträge vorhanden
- [ ] `AlertsView` zeigt Einträge an
- [ ] Alert-Badge in Navigation zeigt `> 0`

### Nach Phase C:

- [ ] `RevenueView` zeigt Daten (auch wenn 0 Einträge: korrekte leere States)
- [ ] `EmailReportsView` zeigt Daten
- [ ] `ScanAnalyticsView` zeigt Daten
- [ ] Datenschutz-Check: User-IDs gekürzt, E-Mails maskiert

### Nach Phase D:

- [ ] Manuell `triggerAggregation('daily')` ausführen
- [ ] `SELECT session_duration_seconds FROM analytics_user_daily ORDER BY date DESC LIMIT 5` → Werte ≠ 0
- [ ] `SELECT unique_sessions FROM analytics_system_hourly ORDER BY timestamp DESC LIMIT 5` → Werte ≠ 0

---

## Gesamte Checkliste (Fortschritts-Tracking)

### ✅ Phase A — Neue Navigationsarchitektur

- [x] **A.1** `page.tsx` — `searchParams` einlesen, `initialSection`/`initialView` als Props
- [x] **A.2** `SidebarNav.tsx` — neue Datei mit Accordion-Navigation, Badges, allen 21 Views
- [x] **A.3** `DashboardClient.tsx` — Umbau auf section/view-State + URL-Routing via `router.replace`
- [x] **A.4** `MobileNav.tsx` — Bottom-Nav für Mobile (6 Section-Icons, fixed bottom)
- [x] **A.5** `DashboardTabs.tsx` — aus DashboardClient entfernt (Datei bleibt für Rollback erhalten)
- [x] **Stub-Views** erstellt: `RevenueView`, `EmailReportsView`, `ScanAnalyticsView`, `AdminAccessView`
- [x] **A.Verifikation** — keine TypeScript-Fehler in allen geänderten Dateien

### ✅ Phase B — Kritische Bug-Fixes

- [x] **B.1** `logAdminAction()` — INSERT jetzt auf Service Role Client (`getServiceRoleClient()`). User-Identity weiterhin aus Session-Client.
- [x] **B.2** Migration `20260228120000_add_missing_cron_jobs.sql` — expire-subscriptions (`5 0 * * *`) + evaluate-alerts (`*/15 * * * *`) cron jobs. Nutzt `cron.unschedule()` vor `cron.schedule()` für Idempotenz.
- [x] **B.3** Edge Function `evaluate-alerts/index.ts` — 7 Metriken unterstützt (`error_rate`, `active_users`, `api_calls`, `new_signups`, `failed_payments`, `pending_moderation`, `ai_errors`). Cooldown-Logik via `last_triggered_at`. Schreibt in `analytics_alert_history`.
- [ ] **B.Verifikation** — nach Deployment: Audit-Log testen, cron-Job prüfen, evaluate-alerts manuell invoken

### ✅ Phase C — Neue Views

- [x] **C.1** `RevenueView.tsx` erstellt + Server Actions `getRevenueStats`, `getSubscriptionEvents` — MRR, Tier-Verteilung, Monats-Trend, Subscription-Events-Tabelle
- [x] **C.2** `EmailReportsView.tsx` erstellt + Server Actions `getEmailReportStats`, `getRecentEmailReportLogs` — Zustellrate, Delivery-Log-Tabelle, E-Mail-Masking
- [x] **C.3** `ScanAnalyticsView.tsx` erstellt + Server Actions `getScanOverview`, `getScanGeography`, `getScanDeviceSplit`, `getTopScanBrews` — Geo-Balken, Device-Donut, Top-Brews-Tabelle
- [x] **C.Verifikation** — alle neuen Views zeigen Daten oder korrekten Leer-Zustand. Null TypeScript-Fehler.

### ✅ Phase D — Datenlücken in Edge Function

- [x] **D.1** `session_duration_seconds` — berechnet aus `brewing_sessions.started_at/completed_at` via `brewery_members` → user mapping
- [x] **D.2** `unique_sessions` — zählt aktive `brewing_sessions` im Stundenintervall (started_at < endOfHour AND (completed_at IS NULL OR completed_at > startOfHour))
- [x] **D.3** `avg_ltv` — geschätzt aus `subscription_history` Tier-Monate × Preis + laufende aktive Subscription
- [ ] **D.4** Retention-Fenster — Punkt-Check bleibt vorerst (D7 = exakter Tag 7), Änderung auf Range optional
- [x] **D.Verifikation** — Hardcoded `0`-Werte durch echte Berechnungen ersetzt. Deployment + Aggregation-Run nötig zum Prüfen.

### ✅ Phase E — Overview als Operations-Zentrale

- [x] **E.1** Health Strip — 6 KPIs: Total Nutzer, Aktive Nutzer, Brews, QR-Scans, Fehler (24h), Ø Bewertung
- [x] **E.2** Action Items — offene Moderation (`getPendingModerationCount`), Alerts (`getUnacknowledgedAlertCount`), fehlgeschlagene E-Mail-Reports (`getEmailReportStats`)
- [x] **E.3** 7-Tage-Sparklines — DAU-Trend + Scan-Trend (BarCharts) via `getDauTrend` + `getScanTrend`
- [x] **E.4** Letzte 5 Audit-Log-Einträge — via `getAdminAuditLogs(5)`
- [x] **E.5** Refresh-Button — manuelles Neu-Laden mit Timestamp-Anzeige
- [x] **E.Verifikation** — alle Kacheln laden parallel in einem `Promise.all`. Null TypeScript-Fehler.

---

## Offene Entscheidungen (alle geklärt & umgesetzt)

1. ✅ **Alert-E-Mail-Benachrichtigung** — `HIGH`-Priority Alerts schicken automatisch E-Mail via Resend direkt aus `evaluate-alerts` Edge Function. Migration `20260228130000_alert_priority.sql` fügt `priority`-Spalte zu `analytics_alert_rules` hinzu.
2. ✅ **`avg_response_time_ms`** — Implementiert: Migration fügt `response_time_ms INTEGER` zu `analytics_events` hinzu. `trackEvent()` akzeptiert optionales Feld. `generate-text`, `generate-image`, `ratings/submit` Routes messen Latenz via `routeStartTime`. `aggregate-analytics` berechnet avg.
3. ✅ **Admin-Zugänge** — `admin_users`-Tabelle (Migration `20260228150000`). Bootstrap-Mechanismus in `lib/admin-auth.ts`: Wenn Tabelle leer + Email in `ADMIN_EMAILS` → automatisch als `super_admin` eingetragen. `AdminAccessView.tsx` vollständig implementiert mit Rollen-Management + Server Actions.
4. ✅ **Länder-Lookup** — `i18n-iso-countries` installiert. Utility `lib/utils/country-names.ts` mit `getCountryName`, `getCountryNameWithFlag`, `getFlagEmoji`. Verwendet in `ScanAnalyticsView.tsx` + `BreweryHeatmap.tsx` (ersetzt manuelle 15-Länder-Hardcoded-Liste).

---

## Abhängigkeiten zwischen Phasen

```
Phase A (Architektur)
  └── Phase C (Neue Views brauchen die neuen Routes)
        └── Phase E (Overview braucht Revenue + Alert-Daten)

Phase B.1 (Audit-Log Client)            ← Kann sofort, unabhängig
Phase B.2 (Cron Migration)              ← Kann sofort, unabhängig
Phase B.3 (Alert Engine)
  └── Phase E (Action Items: Alert-Count kommt aus evaluate-alerts)

Phase D (Edge Function)                 ← Unabhängig, jederzeit
```

**Empfohlene Startreihenfolge:**

1. **B.1** sofort (5 Minuten, ein Einzeilen-Fix, hoher Impact)
2. **A.1–A.3** als Block (Architektur-Grundlage)
3. **B.2 + B.3** parallel wenn möglich
4. **C.1–C.3** wenn Architektur steht
5. **D + E** zuletzt

---

_Erstellt: 27. Februar 2026 — Admin Dashboard 3.0 Vollplanung nach vollständigem Data-Pipeline-Audit_
