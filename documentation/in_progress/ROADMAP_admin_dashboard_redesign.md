# Roadmap: Admin Dashboard Redesign

**Status:** Geplant  
**Erstellt:** 10. März 2026  
**Ziel:** Komplettes Redesign des Admin-Dashboards — Desktop-only, Design-System-konform, klar strukturiert

---

## 1. Motivation

Das aktuelle Admin-Dashboard leidet unter mehreren strukturellen Problemen:

- **21 Views auf einer einzigen Route** (`/admin/dashboard`) — von KI-Modell-Monitoring bis Enterprise-Code-Verwaltung
- **Kein Design-System** — Überall hardgecodete `zinc-800`, `cyan-500` statt semantischer Tokens
- **Views vermischen Analyse mit Aktionen** — `ContentView` (800 LOC) macht gleichzeitig Analytics, Quality Scoring, Trending-Pins UND Featured-Verwaltung
- **Toter Code** — `DashboardTabs.tsx` wird nirgends verwendet, `MobileNav.tsx` wird überflüssig
- **Überlappungen** — `BusinessView` und `UsersView` holen teilweise dieselben Daten, `SystemView` taucht in zwei Sektionen auf
- **README veraltet** — Dokumentiert 6 Views, es gibt aber 21

---

## 2. Neue Architektur: Drei eigenständige Bereiche

### 2.1 `/admin` — Command Center (Übersicht + Analytics)
> *"Was passiert auf meiner Plattform?"*

| Bereich | Inhalt | Bisherige Views |
|---|---|---|
| **Dashboard** (Startseite) | KPI-Strip, Action Items, Activity Feed | `OverviewView` |
| **Nutzer** | Growth-Chart, Retention-Kohorten, Tier-Verteilung, Brewery-Metriken | `UsersView` + `BusinessView` (zusammenführen) |
| **Content** | Content-Wachstum, Sichtbarkeit, Rating-Verteilung, Top Brews | `ContentView` (nur Analytics-Teil) |
| **Revenue** | MRR, Subscriptions, Tier-Trends | `RevenueView` |
| **Scans & CIS** | QR-Analyse, Geography, Devices, CIS-Metriken | `ScanAnalyticsView` |
| **BotlGuide** | AI-Usage, Feedback, Capabilities | `BotlguideView` |
| **E-Mail-Zustellung** | Delivery-Rate, Logs | `EmailReportsView` |

### 2.2 `/admin/moderation` — Trust & Safety
> *"Was muss ich tun?"*

| Bereich | Inhalt | Bisherige Views |
|---|---|---|
| **Queue** (Startseite) | Pending Images (Approve/Reject) mit Counter-Badge | `ModerationView` |
| **Meldungen** | User Reports, Content-Preview, Lösch-Aktionen | `ReportsView` |
| **Widersprüche** | DSA-konforme Appeals-Bearbeitung | `AppealsView` |
| **Content-Kontrolle** | Quality Scoring, Featured verwalten, Trending-Pins | `ContentView` (nur Aktions-Teil) |
| **Audit-Log** | Vollständiger Admin-Aktivitäten-Trail | `AuditLogView` |

### 2.3 `/admin/settings` — Konfiguration & System
> *"Wie stelle ich die Plattform ein?"*

| Bereich | Inhalt | Bisherige Views |
|---|---|---|
| **System Health** (Startseite) | DB-Health, Errors, API, Nonces, Alerts | `SystemView` + `AlertsView` (zusammenführen) |
| **Algorithmen** | Trending, Quality Score, Rec-Engine Tuning | `AlgorithmsView` |
| **Model Health** | ML-Accuracy, Drift, Calibration, False Negatives | `ModelAccuracyView` |
| **Discover** | Quality-Threshold, Featured-Label, Diversity-Cap | `DiscoverView` |
| **Enterprise-Codes** | Code-CRUD, Usage-Tracking | `EnterpriseCodesView` |
| **Admin-Zugänge** | Admin-User, Rollen, Daily-Report-Toggle | `AdminAccessView` |
| **Tools** | Plan-Switcher, Mode-Switcher, Aggregation-Trigger | `SettingsView` |

---

## 3. Zusammenführungen

| Aktion | Begründung |
|---|---|
| `UsersView` + `BusinessView` → **NutzerView** | Beide zeigen Wachstum und Engagement. Brewery-Metriken sind User-Aktivität. Spart ~150 LOC Duplikation. |
| `SystemView` + `AlertsView` → **SystemHealthView** | Alerts SIND Systemgesundheit. Alert-Rules + DB-Health + Error-Tracking gehören logisch zusammen. |
| `ContentView` aufteilen → **ContentAnalyticsView** + **ContentModerationView** | 800 LOC ist zu viel. Analytics-Charts und aktive Eingriffe (Featured, Trending-Pin) sind zwei verschiedene Workflows. |

---

## 4. Layout-Architektur (Desktop-Only)

```
┌─────────────────────────────────────────────────────────┐
│  Top Bar: [Command Center] [Trust & Safety] [Settings]  │
│           ─────────────────────────────────────────────  │
│  Breadcrumb: Admin > Moderation > Meldungen             │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │  Main Content Area                           │
│ (Views)  │  ┌──────────┬──────────┐                     │
│          │  │ KPI Card │ KPI Card │  ← MetricStrip      │
│ • Queue  │  ├──────────┼──────────┤                     │
│ • Meld.  │  │ KPI Card │ KPI Card │                     │
│ • Appeals│  ├──────────┴──────────┤                     │
│ • Content│  │                     │                     │
│ • Audit  │  │  Chart / Table      │  ← Hauptinhalt      │
│          │  │                     │                     │
│          │  ├─────────────────────┤                     │
│          │  │  Detail-Sektion     │                     │
│          │  │                     │                     │
│          │  └─────────────────────┘                     │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Kernprinzipien:**
- **Top-Bar** für die 3 Hauptbereiche (ersetzt die aktuelle Section-Auswahl)
- **Sidebar** nur für die Views innerhalb des aktiven Bereichs
- **Desktop-only**: `min-width: 1280px`, darunter Hinweis "Bitte Desktop verwenden"
- Kein `MobileNav`, keine responsive Breakpoints unter `lg`

---

## 5. Design-System Umstellung

| Element | Aktuell (hardcoded) | Neu (Token-basiert) |
|---|---|---|
| Hintergrund | `bg-black`, `bg-zinc-900` | `bg-[var(--background)]`, `bg-[var(--card-bg)]` |
| Text | `text-white`, `text-zinc-400` | `text-[var(--text-primary)]`, `text-[var(--text-secondary)]` |
| Borders | `border-zinc-800` | `border-[var(--border-default)]` |
| Brand-Akzent | `text-cyan-500`, `bg-cyan-500/10` | `text-[var(--brand)]`, `bg-[var(--brand)]/10` |
| Charts | Hardcoded Hex-Strings | Token-Variablen aus CSS |
| Karten | Inline Tailwind Mix | Einheitliche Card-Klasse mit Tokens |

---

## 6. Lösch-Liste (Dead Code)

| Datei | Grund |
|---|---|
| `DashboardTabs.tsx` | Wird nirgends importiert. Totes Relikt der alten Tab-Navigation. |
| `MobileNav.tsx` | Desktop-only Umstellung macht sie überflüssig. |
| `BusinessView.tsx` | Geht in neue `NutzerView` auf. |
| `ZweiWeltenView.tsx` | Feature weitestgehend abgeschlossen, nicht mehr relevant. |
| `zwei-welten-admin-actions.ts` | Zugehörige Server Actions zu ZweiWelten. |
| `README.md` (aktuell) | Komplett veraltet. Wird am Ende neu geschrieben. |

---

## 7. Umsetzungsphasen

### Phase 1: Routing & Layout-Grundgerüst
- [ ] Shared Admin-Layout erstellen (`app/admin/layout.tsx`) mit Top-Bar + Desktop-Gate
- [ ] Drei Routen anlegen: `/admin`, `/admin/moderation`, `/admin/settings`
- [ ] Jede Route bekommt eigene `page.tsx` + lokale Sidebar-Config
- [ ] Auth-Check + Rollen-Logik in Shared Layout zentralisieren
- [ ] Breadcrumb-Komponente bauen

### Phase 2: Design-System Tokens
- [ ] Fehlende Admin-Tokens in `globals.css` definieren (Card-BG, Surface, Divider etc.)
- [ ] Shared Components migrieren: `MetricCard`, `DateRangePicker`, `ErrorBoundary`
- [ ] Chart-Wrapper migrieren: `BarChart`, `LineChart`, `PieChart` (+ TypeScript Generics statt `any[]`)
- [ ] Neue `AdminCard`-Komponente als einheitlicher Container

### Phase 3: Views umziehen & zusammenführen
- [ ] `UsersView` + `BusinessView` → `NutzerView` (nach `/admin`)
- [ ] `ContentView` aufteilen → `ContentAnalyticsView` (nach `/admin`) + `ContentModerationView` (nach `/admin/moderation`)
- [ ] `SystemView` + `AlertsView` → `SystemHealthView` (nach `/admin/settings`)
- [ ] Restliche Views in ihre neuen Routen verschieben
- [ ] Jede View auf Design-System Tokens umstellen

### Phase 4: Cleanup & Dokumentation
- [ ] Dead Code entfernen (`DashboardTabs`, `MobileNav`, `BusinessView`, `ZweiWeltenView`)
- [ ] Alte `DashboardClient.tsx` + `SidebarNav.tsx` durch neue Architektur ersetzen
- [ ] TypeScript Generics in Chart-Komponenten (`any[]` → typisiert)
- [ ] Neues `README.md` mit aktueller Architektur-Dokumentation
- [ ] `SkipLink` beibehalten (Accessibility)

---

## 8. Technische Details

### Shared Layout (`app/admin/layout.tsx`)
```tsx
// Zentrale Auth-Prüfung + Role-Check
// Top-Bar mit 3 Hauptbereichen
// Desktop-Gate: min-width 1280px
// Children = jeweilige Bereichs-Page
```

### Routing-Struktur (Ziel)
```
app/admin/
├── layout.tsx                    # Shared: Auth, Top-Bar, Desktop-Gate
├── page.tsx                      # Command Center Startseite
├── components/
│   ├── AdminTopBar.tsx           # NEU: 3-Bereich-Navigation
│   ├── AdminSidebar.tsx          # NEU: View-Navigation pro Bereich
│   ├── AdminCard.tsx             # NEU: Einheitlicher Card-Container
│   ├── MetricCard.tsx            # Migriert auf Tokens
│   ├── DateRangePicker.tsx       # Migriert auf Tokens
│   ├── ErrorBoundary.tsx         # Beibehalten
│   ├── SkipLink.tsx              # Beibehalten
│   └── charts/
│       ├── BarChart.tsx          # + TypeScript Generics
│       ├── LineChart.tsx         # + TypeScript Generics
│       └── PieChart.tsx          # + TypeScript Generics
├── views/
│   ├── OverviewView.tsx          # Command Center Default
│   ├── NutzerView.tsx            # Users + Business merged
│   ├── ContentAnalyticsView.tsx  # Content (nur Charts)
│   ├── RevenueView.tsx           # Unverändert, Tokens
│   ├── ScanAnalyticsView.tsx     # Unverändert, Tokens
│   ├── BotlguideView.tsx         # Unverändert, Tokens
│   └── EmailReportsView.tsx      # Unverändert, Tokens
├── moderation/
│   ├── page.tsx                  # Trust & Safety Startseite
│   └── views/
│       ├── ModerationView.tsx    # Queue (Default)
│       ├── ReportsView.tsx       # User Reports
│       ├── AppealsView.tsx       # DSA Appeals
│       ├── ContentModerationView.tsx  # Featured, Trending, Quality
│       └── AuditLogView.tsx      # Audit Trail
└── settings/
    ├── page.tsx                  # Konfiguration Startseite
    └── views/
        ├── SystemHealthView.tsx  # System + Alerts merged
        ├── AlgorithmsView.tsx    # Algo Tuning
        ├── ModelAccuracyView.tsx  # ML Monitoring
        ├── DiscoverView.tsx      # Discover Config
        ├── EnterpriseCodesView.tsx # Enterprise Codes
        ├── AdminAccessView.tsx   # Admin Users
        └── ToolsView.tsx         # Plan/Mode Switcher, Aggregation
```

---

## 9. Offene Fragen

- [ ] Soll die Top-Bar auch Badges anzeigen (z.B. Moderation-Queue-Anzahl)?
- [ ] Soll der Audit-Log auch von `/admin/settings` aus erreichbar sein, oder nur unter Moderation?
- [ ] Brauchen wir einen Dark/Light-Mode Toggle im Admin, oder bleibt es bei Dark-only?
