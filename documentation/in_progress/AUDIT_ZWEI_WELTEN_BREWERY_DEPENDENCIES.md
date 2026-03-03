# AUDIT: Brewery-Dependency-Analyse für ZWEI_WELTEN Architektur

> **Erstellt:** 2026-03-01  
> **Zweck:** Alle Stellen im BotlLab-Codebase identifizieren, die eine Brewery/Team-Mitgliedschaft voraussetzen und für die ZWEI_WELTEN-Architektur (B2C-Consumer ohne Brewery) angepasst werden müssen.

---

## Legende

| Symbol     | Bedeutung                                     |
| ---------- | --------------------------------------------- |
| 🔴 BREAK   | Feature bricht komplett für User ohne Brewery |
| 🟡 DEGRADE | Feature degradiert, aber crasht nicht         |
| 🟢 OK      | Funktioniert auch ohne Brewery                |
| **B2B**    | Rein für Brauer (Brewery-Owner/Member)        |
| **B2C**    | Consumer-relevant (Trinker braucht es auch)   |
| **BOTH**   | Relevant für beide Welten                     |

---

## 1. CORE FUNCTIONS (lib/supabase.ts)

### `getActiveBrewery(userId)` — Zeile 65-127

- **Was:** Holt die aktive Brewery des Users via `profiles.active_brewery_id` → `brewery_members` → `breweries`
- **Typ:** B2B
- **Impact:** 🟢 OK — Gibt `null` zurück wenn keine Mitgliedschaft existiert
- **ZWEI_WELTEN:** Alle Aufrufer müssen den `null`-Fall sauber abfangen. Aktuell oft Voraussetzung für weitere Logik.

### `getUserBreweries(userId)` — Zeile 129-159

- **Was:** Holt ALLE Breweries eines Users via `brewery_members`
- **Typ:** B2B
- **Impact:** 🟢 OK — Gibt leeres Array `[]` zurück
- **ZWEI_WELTEN:** Sicher, aber UI muss leeres Array als "Consumer-Modus" interpretieren.

### `profiles.active_brewery_id` — Spalte in profiles

- **Was:** FK → `breweries.id`, ON DELETE SET NULL. Speichert zuletzt besuchte Brewery.
- **Typ:** B2B
- **Impact:** 🟢 OK — Nullable, Consumer hat einfach `null`
- **ZWEI_WELTEN:** Kein Problem, aber Logik die `active_brewery_id` als "User hat Brewery" interpretiert muss geprüft werden.

---

## 2. SERVER ACTIONS (lib/actions/)

### 2.1 Rein B2B — Brewery erforderlich (kein Umbau nötig)

| Datei                                                                | Funktion                         | Was                                                                   | Impact |
| -------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------- | ------ |
| [brew-actions.ts](botllab-app/lib/actions/brew-actions.ts)           | `createBrew()`                   | Erstellt Brew mit `brewery_id`                                        | 🔴 B2B |
| [brew-actions.ts](botllab-app/lib/actions/brew-actions.ts)           | `updateBrew()`                   | Updated Brew, revalidiert `/team/{id}/brews`                          | 🔴 B2B |
| [session-actions.ts](botllab-app/lib/actions/session-actions.ts)     | `createQuickSession()`           | Erstellt Brewing Session, prüft `brewery_members` Membership explizit | 🔴 B2B |
| [label-actions.ts](botllab-app/lib/actions/label-actions.ts)         | `createDefaultBreweryTemplate()` | Erstellt Default-Label für Brewery                                    | 🔴 B2B |
| [inventory-actions.ts](botllab-app/lib/actions/inventory-actions.ts) | `createBottleBatch()`            | Erstellt Flaschen-Batch mit `brewery_id`                              | 🔴 B2B |
| [inventory-actions.ts](botllab-app/lib/actions/inventory-actions.ts) | `assignBottlesToBrew()`          | Weist Flaschen zu Brew zu                                             | 🔴 B2B |
| [inventory-actions.ts](botllab-app/lib/actions/inventory-actions.ts) | `deleteBottles()`                | Löscht Flaschen                                                       | 🔴 B2B |
| [library-actions.ts](botllab-app/lib/actions/library-actions.ts)     | `saveBrewToLibrary()`            | Speichert Rezept in Brewery-Bibliothek — prüft `brewery_members`      | 🔴 B2B |
| [library-actions.ts](botllab-app/lib/actions/library-actions.ts)     | `removeBrewFromLibrary()`        | Entfernt aus Bibliothek                                               | 🔴 B2B |
| [team-actions.ts](botllab-app/lib/actions/team-actions.ts)           | `dissolveBrewery()`              | Löscht Brewery komplett                                               | 🔴 B2B |
| [team-actions.ts](botllab-app/lib/actions/team-actions.ts)           | `transferOwnership()`            | Überträgt Ownership                                                   | 🔴 B2B |
| [report-actions.ts](botllab-app/lib/actions/report-actions.ts)       | ALLE Funktionen                  | Analytics-Reports — alle mit `brewery_id` Parameter                   | 🔴 B2B |

**Fazit:** Diese Actions sind alle rein B2B und brauchen KEINEN Umbau. Sie bleiben nur für Brewery-Member erreichbar.

### 2.2 BOTH — Müssen Consumer-kompatibel sein oder werden

| Datei                                                                                | Funktion                    | Was                                                          | Impact       | Handlungsbedarf                                     |
| ------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------ | ------------ | --------------------------------------------------- |
| [analytics-actions.ts](botllab-app/lib/actions/analytics-actions.ts)                 | `trackEvent()`              | Trackt Events — `brewery_id` optional                        | 🟢 OK        | Bereits `brewery_id?: string`                       |
| [analytics-actions.ts](botllab-app/lib/actions/analytics-actions.ts)                 | `trackBottleScan()`         | Flaschenscan — sucht `brewery_id` aus Brew                   | 🟢 OK        | Prüft `if (brew.brewery_id)`                        |
| [analytics-actions.ts](botllab-app/lib/actions/analytics-actions.ts)                 | `trackConversion()`         | Konversion — sucht `brewery_id` aus Brew                     | 🟢 OK        | Hat `if (brew.brewery_id)` Guard                    |
| [analytics-actions.ts](botllab-app/lib/actions/analytics-actions.ts)                 | `getBreweryAnalytics()`     | Brewery-Analytics abrufen                                    | 🔴 B2B       | Nur für Brewery-Member                              |
| [analytics-actions.ts](botllab-app/lib/actions/analytics-actions.ts)                 | `getBrewAnalytics()`        | Brew-Level Analytics                                         | 🟡 BOTH      | Könnte auch Consumer für eigene Ratings nutzen      |
| [notification-actions.ts](botllab-app/lib/actions/notification-actions.ts)           | `notifyNewBrew()`           | Benachrichtigt Members über neues Brew                       | 🔴 B2B       | Nur Brewery-Kontext                                 |
| [notification-actions.ts](botllab-app/lib/actions/notification-actions.ts)           | `notifyNewRating()`         | Benachrichtigt über neues Rating                             | 🟡 BOTH      | Consumer-Ratings sollten B2C-Notifications auslösen |
| [notification-actions.ts](botllab-app/lib/actions/notification-actions.ts)           | `notifyNewForumReply()`     | Forum-Reply Notification                                     | 🟢 OK        | Kein Brewery-Bezug                                  |
| [premium-actions.ts](botllab-app/lib/actions/premium-actions.ts)                     | `getPremiumStatus()`        | Holt Premium-Status des Users                                | 🟢 OK        | User-basiert, nicht Brewery                         |
| [premium-actions.ts](botllab-app/lib/actions/premium-actions.ts)                     | `getBreweryPremiumStatus()` | Brewery Premium Status                                       | 🔴 B2B       | Nur für Breweries                                   |
| [premium-actions.ts](botllab-app/lib/actions/premium-actions.ts)                     | `getBreweryBranding()`      | Logo/Branding einer Brewery                                  | 🔴 B2B       | Nur für Breweries                                   |
| [forum-actions.ts](botllab-app/lib/actions/forum-actions.ts)                         | `createThread()`            | Forum Thread erstellen — sucht `brewery_id` für Author-Badge | 🟡 BOTH      | Consumer kann posten, aber ohne Brewery-Badge       |
| [moderation-actions.ts](botllab-app/lib/actions/moderation-actions.ts)               | ALLE                        | Admin/Mod Functions — nutzt `brewery_id` zum Notify          | 🔴 B2B/Admin | Nur Admin-Panel                                     |
| [content-reporting-actions.ts](botllab-app/lib/actions/content-reporting-actions.ts) | `resolveReport()`           | Nutzt `brewery_members` um Owner zu finden                   | 🔴 Admin     | Admin-only                                          |
| [like-actions.ts](botllab-app/lib/actions/like-actions.ts)                           | `toggleBrewLike()`          | Like/Unlike Brew                                             | 🟢 OK        | Kein Brewery-Bezug                                  |
| [profile-actions.ts](botllab-app/lib/actions/profile-actions.ts)                     | `updateProfile()`           | Profil updaten                                               | 🟢 OK        | User-basiert                                        |

---

## 3. API ROUTES (app/api/)

| Route                                                                                            | Was                                                        | Impact  | Handlungsbedarf                                                                 |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| [api/team/[breweryId]/labels/route.ts](botllab-app/app/api/team/%5BbreweryId%5D/labels/route.ts) | Label CRUD für Brewery                                     | 🔴 B2B  | Rein Brewery-Feature                                                            |
| [api/ratings/submit/route.ts](botllab-app/app/api/ratings/submit/route.ts)                       | Rating abgeben — sucht `brew.brewery_id` für Notifications | 🟡 BOTH | Muss auch ohne Brewery funktionieren. Hat bereits `if (brew.brewery_id)` Guard. |
| [api/delete-account/route.ts](botllab-app/app/api/delete-account/route.ts)                       | Account löschen — räumt `brewery_members` auf              | 🟢 OK   | Prüft ob Memberships existieren, funktioniert auch mit 0                        |

---

## 4. DASHBOARD PAGES (app/dashboard/)

### 4.1 `/dashboard` (Hauptseite) — [page.tsx](botllab-app/app/dashboard/page.tsx)

- **Impact:** 🟡 DEGRADE
- **Verhalten ohne Brewery:** Zeigt "Onboarding" UI mit "Squad erstellen" / "Squad beitreten" Buttons
- **ZWEI_WELTEN Problem:**
  - Dashboard zeigt NUR Brewery-Onboarding wenn keine Brewery existiert
  - Kein Consumer-Dashboard-Content (Trinker-Favoriten, Collection, Achievements, etc.)
  - `userName` wird als "Brauer" defaulted (Zeile 72): `userProfile.display_name || user.email?.split('@')[0] || 'Brauer'`
  - Feed (`getBreweryFeed`) ist leer ohne Brewery → Consumer sieht leere Seite
- **Handlungsbedarf:** 🔴 **KRITISCH** — Braucht komplett neues Consumer-Dashboard als Alternative

### 4.2 `/dashboard/team` — [page.tsx](botllab-app/app/dashboard/team/page.tsx)

- **Impact:** 🟡 DEGRADE
- **Verhalten ohne Brewery:** Redirected zu `/dashboard` (Zeile 22)
- **ZWEI_WELTEN:** OK, Consumer kommt nie hierhin

### 4.3 `/dashboard/account` — [page.tsx](botllab-app/app/dashboard/account/page.tsx)

- **Impact:** 🟢 OK
- **Verhalten ohne Brewery:** Zeigt leere Team-Liste, "Team erstellen"/"Team beitreten" Formulare
- **ZWEI_WELTEN:** Funktioniert, aber Team-Bereich sollte für Consumer optional/collapsed sein

### 4.4 `/dashboard/favorites` — [page.tsx](botllab-app/app/dashboard/favorites/page.tsx)

- **Impact:** 🟢 OK
- **Verhalten ohne Brewery:** Zeigt gelikte Brews des Users — kein Brewery-Bezug
- **ZWEI_WELTEN:** Perfekt für Consumer! Keine Änderung nötig.

### 4.5 `/dashboard/achievements` — [page.tsx](botllab-app/app/dashboard/achievements/page.tsx)

- **Impact:** 🟢 OK
- **Verhalten ohne Brewery:** Zeigt User-Achievements — kein Brewery-Bezug
- **ZWEI_WELTEN:** Perfekt für Consumer!

### 4.6 `/dashboard/collection` — [page.tsx](botllab-app/app/dashboard/collection/page.tsx)

- **Impact:** 🟢 OK
- **Verhalten ohne Brewery:** Zeigt gesammelte Crown Caps — kein Brewery-Bezug
- **ZWEI_WELTEN:** Perfekt für Consumer! Kern-Feature.

---

## 5. TEAM PAGES (app/team/[breweryId]/)

Alle Seiten unter `/team/[breweryId]/` sind **rein B2B** und durch das Layout geschützt:

### Team Layout — [layout.tsx](botllab-app/app/team/%5BbreweryId%5D/layout.tsx)

- Prüft `brewery_members` Membership (Zeile 67-75)
- Setzt `isMember` State
- Zeigt "Brauerei nicht gefunden" wenn keine Brewery existiert
- Ruft `update_active_brewery` RPC wenn Member

### Team-Seiten (alle 🔴 B2B, kein Umbau nötig):

| Seite          | Route                                          |
| -------------- | ---------------------------------------------- |
| Dashboard      | `/team/[breweryId]/dashboard`                  |
| Feed           | `/team/[breweryId]/feed`                       |
| Brews          | `/team/[breweryId]/brews`                      |
| New Brew       | `/team/[breweryId]/brews/new`                  |
| Edit Brew      | `/team/[breweryId]/brews/[brewId]/edit`        |
| Sessions       | `/team/[breweryId]/sessions`                   |
| New Session    | `/team/[breweryId]/sessions/new`               |
| Quick Session  | `/team/[breweryId]/sessions/new-quick`         |
| Session Detail | `/team/[breweryId]/sessions/[sessionId]`       |
| Inventory      | `/team/[breweryId]/inventory`                  |
| Labels         | `/team/[breweryId]/labels`                     |
| Label Editor   | `/team/[breweryId]/labels/editor/[templateId]` |
| Analytics      | `/team/[breweryId]/analytics`                  |
| Brew Analytics | `/team/[breweryId]/analytics/brew/[brewId]`    |
| Members        | `/team/[breweryId]/members`                    |
| Settings       | `/team/[breweryId]/settings`                   |
| Join           | `/team/join/[breweryId]`                       |

**Fazit:** Diese Seiten bleiben alle rein B2B. Kein Umbau nötig, nur saubere Zugangs-Trennung.

---

## 6. COMPONENTS

### 6.1 Header — [Header.tsx](botllab-app/app/components/Header.tsx)

- **Impact:** 🟡 DEGRADE
- **Problem:**
  - Lädt `getUserBreweries()` und `getActiveBrewery()` bei Init (Zeile 117-132)
  - Mobile-Menu hat "Team"-Tab der "Kein Team" zeigt mit Link zu `/dashboard/team/create` (Zeile 579-586)
  - Desktop-Brewery-Dropdown basiert auf `activeBreweryId` State
- **ZWEI_WELTEN:**
  - Team-Tab sollte für Consumer entweder ausgeblendet oder als "Brauer werden" CTA umgestaltet werden
  - Consumer braucht andere Navigation (Discover, Collection, Forum statt Team/Brews/Sessions)

### 6.2 AdminHeader (Dashboard) — [AdminHeader.tsx](botllab-app/app/dashboard/components/AdminHeader.tsx)

- **Impact:** 🟡 DEGRADE
- **Problem:**
  - Zeigt Brewery-Dropdown-Menu mit allen Squad-Links (Zeile 225-320)
  - Mobile: "Kein Team" Fallback mit Link zu `/dashboard/team/create` (Zeile 680-690)
  - Brewery-Links (Feed, Brews, Sessions, Inventory, Labels, Analytics, Members, Settings) nur sichtbar wenn `breweryId` gesetzt
- **ZWEI_WELTEN:**
  - Consumer sieht leeres Dropdown, keine sinnvollen Links
  - Braucht Consumer-spezifische Navigation

### 6.3 BrewCard — [BrewCard.tsx](botllab-app/app/components/BrewCard.tsx)

- **Impact:** 🟢 OK
- **Was:** Nutzt `brewery_id` nur für Rating-Insert — optional
- **ZWEI_WELTEN:** Funktioniert für Consumer

### 6.4 BottleScanner — [BottleScanner.tsx](botllab-app/app/components/BottleScanner.tsx)

- **Impact:** 🔴 B2B
- **Was:** Erfordert `breweryId` für Flaschen-Zuordnung
- **ZWEI_WELTEN:** Consumer-Scanner (`/b/[id]`) ist eine separate Route, nicht diese Component

---

## 7. RLS POLICIES (db_schema.sql)

### 7.1 Policies die auf `brewery_members` gaten:

| Tabelle                 | Policy                                                         | Effekt für Consumer                                                  |
| ----------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `bottle_scans`          | "Brewery owners can view their analytics"                      | 🔴 Consumer sieht keine Scan-Daten — **OK, B2B-only**                |
| `analytics_daily_stats` | "Brewery owners can view their stats"                          | 🔴 Kein Zugriff — **OK, B2B-only**                                   |
| `brewing_sessions`      | "Manage sessions for members"                                  | 🔴 Kein Zugriff — **OK, B2B-only**                                   |
| `brewing_sessions`      | "View sessions for members"                                    | 🔴 Kein Zugriff — **OK, B2B-only**                                   |
| `brews`                 | "Members can create/update/delete brewery brews"               | 🔴 Consumer kann keine Brews erstellen — **OK, B2B-only**            |
| `brews`                 | "Members can view brewery brews"                               | 🟢 Hat Fallback: `OR is_public = true OR user_id = auth.uid()`       |
| `bottles`               | "Members can manage/view brewery bottles"                      | 🔴/🟢 Manage: B2B-only. View: Hat Fallback `OR user_id = auth.uid()` |
| `brewery_members`       | "Owners/admins can add/update/remove members"                  | 🔴 B2B-only — **OK**                                                 |
| `brewery_members`       | "Public view brewery members"                                  | 🟢 Lesezugriff für alle                                              |
| `breweries`             | "Owners can update/delete their brewery"                       | 🔴 B2B-only — **OK**                                                 |
| `breweries`             | "Everyone can view breweries" / "Authenticated users can view" | 🟢 Lesen für alle                                                    |
| `analytics_report_logs` | "Users can view own brewery report logs"                       | 🔴 B2B-only — **OK**                                                 |

### 7.2 Policies die KEIN brewery_members-Gate haben (Consumer-safe):

| Tabelle                              | Policies                                                           | Consumer-Status |
| ------------------------------------ | ------------------------------------------------------------------ | --------------- |
| `profiles`                           | "Profiles are viewable by everyone", "Anyone can create a profile" | 🟢 OK           |
| `ratings`                            | "Enable read access for all users", "Jeder kann Ratings erstellen" | 🟢 OK           |
| `likes`                              | (RLS enabled, policies exist)                                      | 🟢 OK           |
| `collected_caps`                     | (RLS enabled)                                                      | 🟢 OK           |
| `achievements` / `user_achievements` | "Achievements sind öffentlich lesbar"                              | 🟢 OK           |
| `notifications`                      | (RLS enabled)                                                      | 🟢 OK           |

### 7.3 Helper Function `get_my_brewery_ids()`

- **Was:** Gibt alle `brewery_id`s zurück wo `user_id = auth.uid()`
- **Consumer-Verhalten:** Gibt leeres Set zurück → Policies die `IN (get_my_brewery_ids())` nutzen geben keine Rows
- **Problem:** Kein Crash, aber Consumer kann keine brewery-gebundenen Daten sehen — **Gewollt für B2B-Daten**

---

## 8. DATABASE FUNCTIONS

| Function                            | Was                                         | Consumer-Impact                                      |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `create_own_squad(name)`            | Erstellt Brewery + Membership + Invite-Code | 🟢 OK — Consumer ruft es nur auf wenn er Brauer wird |
| `update_active_brewery(brewery_id)` | Setzt `profiles.active_brewery_id`          | 🟢 OK — Consumer ruft es nie auf                     |
| `get_my_brewery_ids()`              | Gibt Brewery-IDs des Users zurück           | 🟢 OK — Gibt leeres Set für Consumer                 |

---

## 9. AUTH & CONTEXT

### 9.1 AuthContext — [AuthContext.tsx](botllab-app/app/context/AuthContext.tsx)

- **Impact:** 🟢 OK
- **Was:** Rein Auth-basiert (User/Session). **Kein Brewery-Bezug!**
- **Bietet:** `useAuth()` Hook → `{ user, session, loading, signOut }`
- **ZWEI_WELTEN:** Perfekt, keine Änderung nötig.

### 9.2 Kein `useBrewery` Hook

- **Befund:** Es gibt **keinen** dedizierten `useBrewery()` oder `BreweryContext`.
- Brewery-State wird in einzelnen Komponenten lokal gemanaged (Header, AdminHeader, Dashboard).
- **ZWEI_WELTEN:** Vorteil — kein zentraler Brewery-Zwang der refactored werden muss. Nachteil — Brewery-Logik ist über viele Komponenten verstreut.

---

## 10. REDIRECT PATTERNS

| Von                      | Nach                                   | Bedingung          | Consumer-Impact                 |
| ------------------------ | -------------------------------------- | ------------------ | ------------------------------- |
| `/dashboard/team`        | `/team/{id}/settings`                  | Hat Brewery        | 🟢 Wird nur besucht von Brauern |
| `/dashboard/team`        | `/dashboard`                           | Keine Brewery      | 🟢 OK, leitet zurück            |
| Header Mobile "Team"-Tab | `/dashboard/team/create`               | Kein Team          | 🟡 Consumer sieht unnötige CTA  |
| AdminHeader Mobile       | `/dashboard/team/create`               | Kein Team          | 🟡 Consumer sieht unnötige CTA  |
| Team Layout              | "Brauerei nicht gefunden"              | breweryId ungültig | 🟢 OK                           |
| Team Layout              | `update_active_brewery` RPC            | Ist Member         | 🟢 Consumer kommt nie hierhin   |
| Inventory                | `/login?redirect=/team/{id}/inventory` | Nicht eingeloggt   | 🟢 B2B-only Route               |
| Brew Analytics           | `/team/{id}`                           | Kein Membership    | 🟢 B2B-only                     |
| Brew Analytics           | `/team/{id}/analytics?upgrade=true`    | Kein Premium       | 🟢 B2B-only                     |

---

## 11. ZUSAMMENFASSUNG: Dateien die für ZWEI_WELTEN geändert werden müssen

### 🔴 KRITISCH (Consumer-Erlebnis bricht oder ist leer)

1. **[app/dashboard/page.tsx](botllab-app/app/dashboard/page.tsx)** — Dashboard zeigt NUR Brewery-Onboarding wenn keine Brewery. Consumer braucht eigenes Dashboard mit Discover/Collection/Achievements/Forum-Widgets.

2. **[app/components/Header.tsx](botllab-app/app/components/Header.tsx)** — Navigation ist Brewery-zentrisch. Consumer braucht andere Mobile-Tabs (nicht "Team" sondern "Entdecken"/"Sammlung"). "Kein Team"-Fallback verweist auf `/dashboard/team/create`.

3. **[app/dashboard/components/AdminHeader.tsx](botllab-app/app/dashboard/components/AdminHeader.tsx)** — Brewery-Dropdown/Navigation leer für Consumer. Redundante "Kein Team"-CTA.

### 🟡 SHOULD FIX (Degradiert für Consumer)

4. **[app/dashboard/account/page.tsx](botllab-app/app/dashboard/account/page.tsx)** — Team-Sektion prominent für Consumer obwohl unwichtig. Sollte collapsed/optional sein.

5. **[lib/supabase.ts](botllab-app/lib/supabase.ts)** — `getActiveBrewery()` / `getUserBreweries()` — Keine Änderung nötig, aber alle Aufrufer müssen `null`/`[]` als "Consumer-Modus" interpretieren, nicht als "Error/Onboarding nötig".

6. **[app/dashboard/page.tsx](botllab-app/app/dashboard/page.tsx) Zeile 72** — Default-Name "Brauer" für User ohne Display Name. Sollte für Consumer etwas anderes sein.

7. **[api/ratings/submit/route.ts](botllab-app/app/api/ratings/submit/route.ts)** — Funktioniert, aber Notification-Logik nur für Brewery-Brews. Consumer-Ratings an Nicht-Brewery-Brews lösen keine Notifications aus.

### 🟢 KEIN UMBAU NÖTIG

- Alle `/team/[breweryId]/*` Seiten (18 Seiten) — Rein B2B, Layout schützt Zugang
- Alle B2B-Server-Actions (brew, session, inventory, label, library, team, report) — Rein B2B
- AuthContext — Kein Brewery-Bezug
- Consumer-Dashboard-Seiten (favorites, collection, achievements) — Funktionieren bereits
- RLS Policies — Consumer-relevante Daten (public brews, ratings, likes, caps) haben passende Policies
- `get_my_brewery_ids()` — Gibt sicher leeres Set für Consumer zurück
- Account-Löschung — Handelt 0 Memberships korrekt

### 📝 NEU ZU ERSTELLEN

| Was                           | Begründung                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Consumer-Dashboard-View       | Alternative `/dashboard`-Ansicht für User ohne Brewery                                   |
| Consumer-Navigation           | Mobile-Tabs: Entdecken, Sammlung, Forum, Profil (statt Team)                             |
| "Brauer werden" CTA-Component | Ersetzt "Team erstellen" in Consumer-UI, leitet zu `/team/create` Flow                   |
| Consumer Notification System  | Notifications für Consumer-Aktionen (neue Ratings auf gelikte Brews, Achievements, etc.) |

---

## 12. RLS-IMPACT-MATRIX

```
Tabelle                  | Consumer kann LESEN? | Consumer kann SCHREIBEN?
-------------------------|----------------------|-------------------------
profiles                 | ✅ Alle              | ✅ Eigenes Profil
brews                    | ✅ Public + Eigene    | ❌ Nur via Brewery
bottles                  | ✅ Eigene            | ❌ Nur via Brewery
ratings                  | ✅ Alle              | ✅ Authenticated
likes                    | ✅ (RLS)             | ✅ (RLS)
collected_caps           | ✅ (RLS)             | ✅ (RLS)
achievements             | ✅ Alle              | N/A
user_achievements        | ✅ (RLS)             | ✅ Authenticated
breweries                | ✅ Alle              | ❌ Nur Authenticated
brewery_members          | ✅ Alle (SELECT)     | ✅ Eigenen User adden
brewing_sessions         | ❌ Nur Members       | ❌ Nur Members
bottle_scans             | ❌ Nur Owners        | ✅ Alle (INSERT)
analytics_daily_stats    | ❌ Nur Owners        | N/A
analytics_report_logs    | ❌ Nur Members       | N/A
brewery_feed             | (RLS enabled)        | (RLS enabled)
brewery_saved_brews      | (RLS enabled)        | (RLS enabled)
notifications            | (RLS enabled)        | (RLS enabled)
```

---

## 13. PROFILES TABLE STRUCTURE

```sql
profiles (
  id                       UUID PK (= auth.uid())
  active_brewery_id        UUID FK → breweries(id) ON DELETE SET NULL  -- NULL für Consumer
  subscription_tier        TEXT DEFAULT 'free'     -- 'free' | 'brewer' | 'brewery'
  subscription_status      TEXT DEFAULT 'inactive'
  tier                     TEXT                    -- Berechneter Tier
  display_name             TEXT
  bio                      TEXT
  location                 TEXT
  logo_url                 TEXT
  banner_url               TEXT
  website                  TEXT
  birthdate                TEXT
  founded_year             INTEGER
  custom_brewery_slogan    TEXT
  ai_credits_used_this_month INTEGER DEFAULT 0
  ai_credits_reset_at      TIMESTAMP
  analytics_opt_out        BOOLEAN
  total_bottle_fills       INTEGER
  total_profile_views      INTEGER
  stripe_customer_id       TEXT
  stripe_subscription_id   TEXT
  subscription_started_at  TIMESTAMP
  subscription_expires_at  TIMESTAMP
  joined_at                TIMESTAMP
  updated_at               TIMESTAMP
)
```

**Consumer-Relevante Felder:** `id`, `display_name`, `bio`, `location`, `logo_url`, `tier`, `subscription_tier`, `joined_at`  
**B2B-Felder:** `active_brewery_id`, `founded_year`, `custom_brewery_slogan`, `banner_url`, `website`  
**Neutral:** Alle `stripe_*`, `ai_credits_*`, `analytics_opt_out`, `total_*`

---

_Ende der Analyse. Nächster Schritt: ZWEI_WELTEN Implementation Roadmap basierend auf dieser Auditierung._
