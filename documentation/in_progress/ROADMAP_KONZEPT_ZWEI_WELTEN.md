# ROADMAP: KONZEPT ZWEI WELTEN — Implementierung

> **Zieldatum:** Vor Phase 11 der Analytics-USP-Roadmap (harte Abhängigkeit).
> **Geschätzte Gesamtdauer:** 12–18 Arbeitstage
> **Erstellt:** 01.03.2026

---

## 📋 Inhaltsverzeichnis

1. [Ist-Analyse (Deep Dive)](#ist-analyse)
2. [Risiko-Matrix](#risiko-matrix)
3. [Phase 0 — Datenbank-Migration (Foundation)](#phase-0)
4. [Phase 1 — Entry-Point-Weiche (Smart Routing)](#phase-1)
5. [Phase 2 — Consumer Dashboard (`/my-cellar`)](#phase-2)
6. [Phase 3 — Navigation & UX-Trennung](#phase-3)
7. [Phase 4 — Consumer Profil & Gamification](#phase-4)
8. [Phase 5 — Altdaten-Migration & Bereinigung](#phase-5)
9. [Phase 6 — Testing, Smoke-Tests & Rollback](#phase-6)
10. [Checkliste](#checkliste)
11. [Zeitplanung](#zeitplanung)
12. [Designentscheidungen](#designentscheidungen)

---

## 🔍 Ist-Analyse (Deep Dive) {#ist-analyse}

### Das Kernproblem

BotlLab ist ein Two-Sided Marketplace:

- **Brauer (B2B):** Erstellen Rezepte, drucken Etiketten, zahlen für Analytics.
- **Trinker (B2C):** Scannen Flaschen, bewerten Biere, sammeln Kronkorken, generieren die Daten.

**Aktuell existiert nur eine Welt.** Jeder User wird implizit als Brauer behandelt. Ein Konsument, der über einen QR-Code auf einer Flasche kommt, landet nach dem Login auf einem Dashboard, das ihn auffordert, eine Brauerei zu gründen. Das ist die "kognitive Dissonanz", die wir eliminieren müssen.

### Was bereits funktioniert (Consumer-safe)

Das System ist besser vorbereitet als man denkt. Viele Consumer-Features existieren bereits, werden aber in einer Brauer-UI versteckt:

| Feature               | Route                               | Brewery-abhängig?  | Status    |
| --------------------- | ----------------------------------- | ------------------ | --------- |
| Flaschenscan          | `/b/[id]`                           | Nein (voll anonym) | ✅ Fertig |
| Rating abgeben        | `/b/[id]`                           | Nein (IP-basiert)  | ✅ Fertig |
| Kronkorken sammeln    | `/b/[id]` → `/dashboard/collection` | Nein (`user_id`)   | ✅ Fertig |
| Favoriten             | `/dashboard/favorites`              | Nein (`user_id`)   | ✅ Fertig |
| Achievements          | `/dashboard/achievements`           | Nein (`user_id`)   | ✅ Fertig |
| Forum                 | `/forum`                            | Nein (`author_id`) | ✅ Fertig |
| Öffentliches Profil   | `/brewer/[id]`                      | Nein               | ✅ Fertig |
| Entdecken             | `/discover`                         | Nein               | ✅ Fertig |
| Account-Einstellungen | `/dashboard/account`                | Nein               | ✅ Fertig |

### Was fehlt

| Gap                                          | Problem                                                                                                                                                        | Lösung                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Kein `app_mode`-Feld                         | System kann Brauer nicht von Trinker unterscheiden                                                                                                             | Neues Feld auf `profiles`                                            |
| `tier`-Feld muss vollständig weg             | Brauer-Gamification-Tiers (`hobby`→`braumeister`) sind semantisch falsch für Consumer; Consumer brauchen eigenen Score; Brewery-Größen gehören auf `breweries` | `tier` droppen, `tasting_iq` + `tasting_score_events` einführen      |
| Dashboard ohne Brewery = Sackgasse           | "Kein Team, kein Ruhm" statt Consumer-Content                                                                                                                  | Consumer-Dashboard (`/my-cellar`)                                    |
| Kein Smart Routing                           | Login → immer `/dashboard`                                                                                                                                     | Intent-basierte Weiche                                               |
| Header zwingt zu Brewery                     | Mobile "Brauerei"-Tab zeigt "Team Gründen"                                                                                                                     | Consumer-Navigation                                                  |
| Kein `/my-cellar`                            | Trinker hat kein dediziertes Zuhause                                                                                                                           | Neue Route mit Consumer-Layout                                       |
| Signup-Trigger setzt kein `app_mode`         | `handle_new_user()` kennt nur `subscription_tier`                                                                                                              | Trigger erweitern                                                    |
| `/dashboard/*`-Layout ohne Mode-Guard        | Ein Consumer kann `/dashboard/collection` etc. direkt aufrufen (falsche URL-Welt)                                                                              | Blanket-Guard in `dashboard/layout.tsx` (Server Component)           |
| `account/page.tsx` sitzt im Brauer-Dashboard | Einstellungen gehören keiner der beiden Welten                                                                                                                 | Auslagern als eigenständige `/account`-Route mit konditionellen Tabs |

### Datenbank-Abhängigkeiten (vollständige Inventur)

**Consumer-safe Tabellen (Kein `brewery_id` nötig):**

- `profiles` — universell, PK = `auth.users.id`
- `collected_caps` — `user_id`, kein `brewery_id`
- `likes` — `user_id`
- `notifications` — `user_id`
- `user_achievements` — `user_id`
- `ratings` — komplett anonym (kein `user_id`-Feld!), IP-Hash
- `forum_threads` / `forum_posts` — `author_id` → profiles
- `analytics_events` — `user_id`
- `ai_usage_logs` — `user_id`

**Brewery-only Tabellen (Braucher immer `brewery_id`):**

- `breweries`, `brewery_members`, `brewery_feed`, `brewery_saved_brews`
- `brewing_sessions`, `session_log_entries`
- `analytics_daily_stats`, `analytics_report_logs`, `analytics_report_settings`
- `inventory_items`, `inventory_categories`

**Dual-Mode Tabellen (Optional `brewery_id`):**

- `brews` — hat `user_id` UND `brewery_id` (nullable)
- `bottles` — hat `user_id` UND `brewery_id` (nullable)
- `bottle_scans` — `viewer_user_id` (Consumer) + `brewery_id` (Brew-Owner für Analytics)

### Auth-System (aktueller Zustand)

```
Login → signInWithPassword()
  → email bestätigt?
    NEIN → "Bitte bestätige deine E-Mail"
    JA   → ?callbackUrl vorhanden?
           JA  → router.push(callbackUrl)   // z.B. /b/[id]
           NEIN → router.push('/dashboard')  // ← PROBLEM: Immer Brauer-Dashboard
```

**Middleware (`middleware.ts`):** Nur Session-Refresh, keine Routen-Guards, kein Redirect-Logik.
**AuthContext:** Liefert `{ user, session, loading, signOut }` — kein Brewery-Kontext, kein Mode.
**`getActiveBrewery()`:** Gibt sauber `null` zurück wenn kein Team existiert — kein Crash.

### RLS-Policies (kein Handlungsbedarf)

Die bestehenden RLS-Policies sind bereits korrekt getrennt:

- `profiles` → öffentlich lesbar, nur eigenes schreibbar
- `ratings` → öffentlich lesbar, authentifiziert erstellbar
- `collected_caps` → nur eigene lesbar/schreibbar
- `bottle_scans` → jeder kann inserten, nur Brewery-Mitglieder können lesen (Analytics-Schutz)
- `forum_*` → authentifiziert erstellbar, öffentlich lesbar

**Keine einzige RLS-Policy muss für ZWEI_WELTEN geändert werden.** Die Datenschicht ist bereits sauber getrennt.

---

## ⚠️ Risiko-Matrix {#risiko-matrix}

| #   | Risiko                                                                     | Wahrscheinlichkeit | Impact  | Mitigation                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------- | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Migration überschreibt echte Brauer als "drinker"                          | Mittel             | Hoch    | Konservative Heuristik: Nur User ohne Brews UND ohne Sessions werden als Drinker klassifiziert                                                                                                                                                                       |
| R2  | Bestehende URLs/Bookmarks auf `/dashboard` brechen für Consumer            | Hoch               | Mittel  | `/dashboard` bleibt erhalten, redirected basierend auf `app_mode`                                                                                                                                                                                                    |
| R3  | `tier`-Drop bricht Code-Stellen die `profile.tier` lesen                   | Mittel             | Mittel  | `subscription_tier` bleibt unverändert. `tier` (Gamification) wird gedroppt — alle Stellen im Code die `profile.tier` lesen müssen auf `tasting_iq` oder `subscription_tier` umgestellt werden. `grep -r 'profile\.tier\|profiles\.tier' .` vor Migration ausführen. |
| R4  | Consumer-Signup ohne Brewery bricht bestehende Notification-Logik          | Niedrig            | Niedrig | `notifications` sind bereits `user_id`-basiert, kein `brewery_id`-Check                                                                                                                                                                                              |
| R5  | Mobile Header-Umbau erzeugt Regressions in bestehender Brauer-Navigation   | Mittel             | Mittel  | Brauer-Tab bleibt identisch, nur Consumer bekommt Alternative                                                                                                                                                                                                        |
| R6  | `/my-cellar` Route-Naming kollidiert mit SEO oder bestehenden Routen       | Niedrig            | Niedrig | Kein bestehender `/my-cellar`-Pfad im System (verifiziert)                                                                                                                                                                                                           |
| R7  | `handle_new_user()` Trigger-Änderung löst Fehler bei laufenden Signups aus | Niedrig            | Hoch    | Trigger-Update als atomare Migration, neue Spalte hat DEFAULT                                                                                                                                                                                                        |
| R8  | Consumer sieht "falsche" Navigation nach Mode-Switch zu Brewer             | Mittel             | Mittel  | Hard-Refresh nach Mode-Switch (`window.location.href` statt `router.push`)                                                                                                                                                                                           |
| R9  | `dashboard/layout.tsx` Client→Server-Komponent-Umbau bricht AdminHeader    | Mittel             | Mittel  | `AdminHeader` bleibt Client Component (erlaubt durch Next.js RSC-Komposition). Nur der Layout-Wrapper selbst wird Server Component. Alle Client-Hooks aus dem Layout entfernen, Auth via `createClient()`                                                            |

---

## 🗄️ PHASE 0: DATENBANK-MIGRATION (FOUNDATION) {#phase-0}

> **Status:** ✅ ABGESCHLOSSEN
> **Geschätzte Dauer:** 1–2 Tage
> **Abhängigkeiten:** Keine
> **Risiko:** Niedrig (additive Änderungen, keine Breaking Changes)

### 0.1 — Neues Feld: `app_mode` auf `profiles`

```sql
-- Migration: add_app_mode_to_profiles.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_mode TEXT NOT NULL DEFAULT 'drinker';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_mode_check
  CHECK (app_mode IN ('drinker', 'brewer'));

COMMENT ON COLUMN public.profiles.app_mode IS
  'Bestimmt die primäre UI-Experience: drinker = Consumer/My-Cellar, brewer = Team/Dashboard.
   Kann jederzeit per "Brauer werden" auf brewer geupgraded werden.
   Ein brewer kann nie zurück zu drinker degradiert werden.';
```

**Warum `drinker` als Default?** Jeder neue User startet als Consumer. Nur wer aktiv eine Brauerei gründet oder beitritt, wird zum `brewer` geupgraded. Das ist die goldene Regel: _"Zwinge niemals einen Nutzer dazu, ein Team zu gründen."_

**Warum keine Flag `is_brewer BOOLEAN`?** Weil wir uns die Option offenhalten, in Zukunft weitere Modi hinzuzufügen (z.B. `distributor`, `event_organizer`). Ein TEXT-Feld mit CHECK-Constraint ist flexibler.

### 0.2 — Signup-Trigger erweitern

```sql
-- Migration: update_handle_new_user_trigger.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    app_mode,           -- NEU
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'app_mode', 'drinker'),  -- NEU: Default 'drinker'
    'free',
    'active',
    NOW(),
    0,
    date_trunc('month', NOW() + interval '1 month')
  );
  RETURN NEW;
END;
$$;
```

**Der Trick:** Der `app_mode` wird aus `raw_user_meta_data` gelesen. Wenn der User über die B2B-Startseite kommt und auf "Jetzt losbrauen" klickt, setzt das Signup-Form `options.data.app_mode = 'brewer'`. Wenn er über einen Flaschenscan kommt, wird kein `app_mode` gesetzt → Default `'drinker'`.

### 0.3 — Legacy-Gamification-System ablösen: `tier` droppen, `tasting_iq` einführen

Das bestehende `profiles.tier`-Feld vermischt zwei Konzepte — und **beide werden ersetzt, nicht umbenannt:**

- **Gamification-Tiers** (`hobby`, `lehrling`, `geselle`, `meister`, `legende`, `braumeister`) — ein brauer-zentrisches Progressions-System, das in der Zwei-Welten-Architektur semantisch falsch ist: Ein Trinker ist kein „Lehrling". Das System war ein Versuch, Engagement durch Titelvergabe zu erzwingen; echtes Engagement entsteht aber durch intrinsische Motivation (guter Content, Tasting-Spaß, Leaderboard-Wettbewerb). Das Tier-System löst das Problem nicht und schafft neue Verwirrung. **→ Wird gedroppt.**

- **Brewery-Größen-Tiers** (`garage`, `micro`, `craft`, `industrial`) — gehören konzeptionell auf die `breweries`-Tabelle, nicht auf `profiles`. **→ Werden migriert.**

**Was kommt für Consumer:** Ein dedizierter numerischer Score `profiles.tasting_iq INTEGER DEFAULT 0`:

- **Leaderboard-tauglich:** Triviales `ORDER BY tasting_iq DESC`
- **Kontinuierlich:** Kein Level-Cap — wächst dauerhaft mit jedem Tasting-Event
- **Audit-nachvollziehbar:** Jede Punkt-Änderung landet in `tasting_score_events`
- **Sauber getrennt:** `user_achievements` bleibt für One-Shot-Badges (erster Scan, 10 Ratings etc.) — Tasting IQ ist der _Kompetenz-Score_, Badges sind _Meilensteine_

**Was kommt für Brauer:** **Kein neues Tier-System.** Die Brauer-Progression läuft über `subscription_tier` (free → brewer → brewery → enterprise). Das ist die echte Währung für Brauer: Datenzugang, nicht Ehrentitel.

```sql
-- Migration: drop_tier_introduce_tasting_iq.sql

-- 1. Brewery-Size auf breweries verschieben
ALTER TABLE public.breweries
  ADD COLUMN IF NOT EXISTS brewery_size TEXT DEFAULT 'garage';

ALTER TABLE public.breweries
  ADD CONSTRAINT breweries_size_check
  CHECK (brewery_size IN ('garage', 'micro', 'craft', 'industrial'));

-- 2. Bestehende Brewery-Size-Werte von profiles auf breweries übertragen
UPDATE public.breweries b
SET brewery_size = p.tier
FROM public.brewery_members bm
JOIN public.profiles p ON p.id = bm.user_id
WHERE bm.brewery_id = b.id
  AND bm.role = 'owner'
  AND p.tier IN ('garage', 'micro', 'craft', 'industrial');

-- 3. Legacy-Gamification-Tier-Feld droppen
--    (bewusste Entscheidung: kein Rename — wir brechen mit dem alten System)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tier;

-- 4. Consumer Tasting IQ Score einführen
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tasting_iq INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.tasting_iq IS
  'Kontinuierlicher Consumer-Kompetenz-Score. Wächst mit jedem Beat-the-Brewer-Match,
   abgegebenen Rating und Vibe-Check. Basis für Leaderboards (Analytics Phase 11).
   Unabhängig von user_achievements (die für One-Shot-Badges bleiben).
   Detailhistorie in tasting_score_events.';

-- 5. Audit-Tabelle für Score-Events
CREATE TABLE IF NOT EXISTS public.tasting_score_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL
    CHECK (event_type IN ('beat_the_brewer', 'rating_given', 'vibe_check', 'bonus', 'correction')),
  brew_id      UUID REFERENCES public.brews(id) ON DELETE SET NULL,
  points_delta INTEGER NOT NULL,     -- positiv = Gewinn, negativ = Korrektur
  match_score  NUMERIC(5,2),         -- NULL wenn kein Match-Score applicable
  metadata     JSONB,                -- z.B. { "slider_values": {...}, "style": "IPA" }
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tasting_score_events_user_id
  ON public.tasting_score_events(user_id, created_at DESC);

COMMENT ON TABLE public.tasting_score_events IS
  'Audit-Log aller Tasting-IQ-Änderungen. Single Source of Truth für Reberechnungen.
   Ermöglicht History-View in /my-cellar/taste-dna und zukünftige Anomalie-Korrekturen.';

-- RLS
ALTER TABLE public.tasting_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasting score events"
  ON public.tasting_score_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Server-side insert only"
  ON public.tasting_score_events FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

**Punkte-Richtwerte (implementiert in Analytics Phase 11):**

| Event                   | Punkte                    | Hinweis                            |
| ----------------------- | ------------------------- | ---------------------------------- |
| Beat the Brewer         | `ROUND(match_score * 10)` | 0–100 Pkt, je nach Treffsicherheit |
| Rating abgeben          | 5                         | Max 1× pro Brew                    |
| Vibe Check              | 3                         | Max 1× pro Brew                    |
| Kommentar (≥20 Zeichen) | 5                         | Zusatz-Bonus auf Rating            |

**Warum kein Level-System?** Level-Namen (Lehrling → Meister) erzeugen nach Erreichen des Caps keinen weiteren Pull-Effekt. Ein linearer Score ohne Cap bleibt dauerhaft motivierend. Falls eine Level-Anzeige fürs UI gewünscht ist, lässt sie sich jederzeit als computed label auf dem Frontend aus dem Score ableiten (`< 50 = Einsteiger, < 200 = Kenner, ...`) — ohne DB-Schema-Änderung.

**Vorher: Code-Stellen finden die `profile.tier` lesen:**

```bash
cd botllab-app && grep -r "profile\.tier\b\|profiles\.tier\b" --include="*.ts" --include="*.tsx" .
```

Diese Stellen müssen auf `tasting_iq`, `subscription_tier` oder `brewery_size` umgestellt werden je nach Kontext.

### 0.4 — Automatischer Mode-Upgrade bei Brewery-Erstellung

```sql
-- Migration: auto_upgrade_app_mode_on_brewery_join.sql

CREATE OR REPLACE FUNCTION public.upgrade_to_brewer_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Wenn ein User einer Brauerei beitritt, wird er automatisch zum Brewer
  UPDATE public.profiles
  SET app_mode = 'brewer',
      active_brewery_id = NEW.brewery_id
  WHERE id = NEW.user_id
    AND app_mode = 'drinker';

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_brewery_member_created
  AFTER INSERT ON public.brewery_members
  FOR EACH ROW
  EXECUTE FUNCTION public.upgrade_to_brewer_on_join();
```

**Warum ein Trigger statt App-Code?** Weil es drei Wege gibt, einer Brauerei beizutreten: (1) `create_own_squad` RPC, (2) `/team/join/[code]`, (3) Admin-Invite. Der Trigger fängt alle drei ab, ohne dass jeder Code-Pfad manuell aktualisiert werden muss. **Single Source of Truth.**

### 0.5 — TypeScript-Typen aktualisieren

Die generierten Types (`lib/database.types.ts`) müssen regeneriert werden:

```bash
npx supabase gen types typescript --project-id <id> > lib/database.types.ts
```

Zusätzlich ein expliziter Typ für die App:

```typescript
// lib/types/user-mode.ts
export type AppMode = "drinker" | "brewer";

export interface UserProfile {
  id: string;
  display_name: string | null;
  app_mode: AppMode;
  active_brewery_id: string | null;
  tasting_iq: number; // Consumer Kompetenz-Score (kein brewer_tier mehr)
  subscription_tier: "free" | "brewer" | "brewery" | "enterprise";
  // ... rest
}

/**
 * Prüft ob ein User Brauer ist.
 * Ein Brauer hat IMMER app_mode='brewer' UND mindestens eine Brewery-Membership.
 * Ein Drinker hat app_mode='drinker' UND KEINE Brewery-Membership.
 */
export function isBrewer(profile: Pick<UserProfile, "app_mode">): boolean {
  return profile.app_mode === "brewer";
}
```

---

## 🚦 PHASE 1: ENTRY-POINT-WEICHE (SMART ROUTING) {#phase-1}

> **Status:** ✅ ABGESCHLOSSEN
> **Geschätzte Dauer:** 2–3 Tage
> **Abhängigkeiten:** Phase 0 (Datenbank)
> **Risiko:** Mittel (Login-Flow ist kritischer Pfad)

### 1.1 — Intent-Erkennung im Flaschenscan-Flow

**Datei:** `app/b/[id]/page.tsx`

Wenn ein nicht-eingeloggter User auf der Flaschenseite eine Aktion ausführt, die Auth erfordert (Kronkorken sammeln, erweitertes Rating), wird der `callbackUrl` um einen `intent`-Parameter erweitert:

```typescript
// Bestehend:
const loginUrl = `/login?callbackUrl=${encodeURIComponent(`/b/${bottleId}`)}`;

// NEU:
const loginUrl = `/login?callbackUrl=${encodeURIComponent(`/b/${bottleId}`)}&intent=drink`;
```

**Wo überall muss `intent=drink` angehängt werden?**

- `CrownCap`-Komponente: "Einloggen um zu sammeln" Button
- Rating-Bereich: Falls erweitertes Rating Auth erfordert
- Alle "Anmelden"-CTAs auf der B2C-Seite

### 1.2 — Signup-Flow: `intent` Parameter durchreichen

**Datei:** `app/login/page.tsx`

```typescript
// NEU: Intent aus URL lesen und in Signup-Metadata durchreichen
const intent = searchParams.get("intent");

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${origin}/auth/callback?${callbackUrl ? `callbackUrl=${callbackUrl}` : ""}`,
    data: {
      display_name: username,
      birthdate,
      app_mode: intent === "drink" ? "drinker" : undefined,
      // ↑ Nur explizit setzen wenn Drink-Intent.
      // Sonst: undefined → Trigger nutzt Default 'drinker'
    },
  },
});
```

**Hinweis:** Da der Default `'drinker'` ist, passiert bei normalen Signups ohne Intent das Richtige. Nur wenn jemand explizit über die B2B-Startseite kommt und "Jetzt losbrauen" klickt, muss dort `app_mode: 'brewer'` gesetzt werden.

### 1.3 — B2B-Startseite: `app_mode: 'brewer'` bei Signup

**Datei:** `app/page.tsx` (Startseite) — der "Jetzt losbrauen" CTA

```typescript
// Der Link zum Signup von der B2B-Startseite setzt den Intent explizit:
<Link href="/login?intent=brew">Jetzt losbrauen</Link>
```

**Datei:** `app/login/page.tsx` — `intent=brew` wird zu `app_mode: 'brewer'`:

```typescript
const intent = searchParams.get('intent');
const appMode = intent === 'brew' ? 'brewer' : 'drinker'; // Default: drinker

// Im signUp:
options: {
  data: {
    display_name: username,
    birthdate,
    app_mode: appMode,
  },
}
```

### 1.4 — Post-Login Redirect: Die Weiche

**Datei:** `app/login/page.tsx` — Redirect-Logik nach erfolgreichem Login

```typescript
// BESTEHENDES Verhalten (zu ersetzen):
// if (!authLoading && user) {
//   const callbackUrl = params.get('callbackUrl');
//   if (callbackUrl) router.push(callbackUrl);
//   else router.push('/dashboard');
// }

// NEUES Verhalten:
if (!authLoading && user) {
  const callbackUrl = params.get("callbackUrl");

  if (callbackUrl) {
    // Priorität 1: Immer zum Callback zurückkehren (z.B. /b/[id])
    router.push(decodeURIComponent(callbackUrl));
  } else {
    // Priorität 2: Mode-basierter Redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("app_mode")
      .eq("id", user.id)
      .single();

    if (profile?.app_mode === "brewer") {
      router.push("/dashboard");
    } else {
      router.push("/my-cellar"); // ← NEU: Consumer-Dashboard
    }
  }
}
```

### 1.5 — Auth Callback: Mode-basierter Redirect

**Datei:** `app/auth/callback/route.ts`

```typescript
// BESTEHENDES Verhalten:
// Alle Nicht-Recovery-Callbacks → /dashboard

// NEUES Verhalten:
if (type === "recovery") {
  return NextResponse.redirect(new URL("/auth/reset-password", origin));
}

// Callback-URL aus Query-Param lesen (von Phase 1.2 durchgereicht)
const callbackUrl = requestUrl.searchParams.get("callbackUrl");
if (callbackUrl) {
  return NextResponse.redirect(
    new URL(decodeURIComponent(callbackUrl), origin),
  );
}

// Kein Callback: Mode-basierter Redirect
const { data: profile } = await supabase
  .from("profiles")
  .select("app_mode")
  .eq("id", session.user.id)
  .single();

const target = profile?.app_mode === "brewer" ? "/dashboard" : "/my-cellar";
return NextResponse.redirect(new URL(target, origin));
```

### 1.6 — Routing-Architektur: Zwei saubere Territorien

Dies ist die komplexeste Aufgabe in Phase 1. Die bestehende Route-Struktur unter `/dashboard/*` enthält aktuell eine Mischung aus Brauer- und Consumer-Seiten. Für die Zwei-Welten-Architektur müssen wir klare Grenzen ziehen.

**Aktueller Zustand (`/dashboard/*`):**

| Route                             | Typ                              | Problem                                                         |
| --------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `dashboard/page.tsx`              | Brauer (Brewery-Feed)            | Zeigt Consumer "Kein Team, kein Ruhm"                           |
| `dashboard/team/page.tsx`         | Brauer (→ `/team/[id]/settings`) | Sinnlos für Consumer                                            |
| `dashboard/collection/page.tsx`   | Consumer (Kronkorken)            | Kein Problem                                                    |
| `dashboard/favorites/page.tsx`    | Consumer (Favoriten)             | Kein Problem                                                    |
| `dashboard/achievements/page.tsx` | Consumer (Achievements)          | Kein Problem                                                    |
| `dashboard/account/page.tsx`      | **Geteilt** (1257 Zeilen)        | Hat einen Teams-Tab für Brewery-Memberships — semi-brewer-aware |

**`/team/[breweryId]/*` ist bereits selbst-schützend** — Die `layout.tsx` unter `app/team/[breweryId]/layout.tsx` prüft Membership. Ein Consumer ohne `breweryId` kann diese URLs schlichtweg nicht aufbauen. **Hier ist NICHTS zu ändern.**

---

#### 1.6a — Neues `/account`-Route (Geteilte Einstellungen)

**Das Problem mit einem blanket Layout-Guard:** Wenn wir in `dashboard/layout.tsx` alle Consumer zu `/my-cellar` redirecten, verlieren sie den Zugriff auf `/dashboard/account` (Profil, Passwort, Datenschutz). Diese Einstellungen brauchen beide Modi.

**Lösung:** `account/page.tsx` aus dem Dashboard-Kontext herauslösen und als **eigenständige, mode-neutrale Route** etablieren.

**Neue Dateistruktur:**

```
app/account/
  page.tsx    ← Der eigentliche Inhalt (aus /dashboard/account/ hierher verschoben)
  layout.tsx  ← Minimal-Layout (nur Auth-Guard, kein AdminHeader, kein ConsumerHeader)
```

**Migration der bestehenden Datei:**

```
app/dashboard/account/page.tsx  →  app/account/page.tsx  (Datei verschieben)
app/dashboard/account/page.tsx  →  Redirect-Stub zu /account (bleibt für alte Bookmarks)
```

**Mode-abhängige Tabs innerhalb von `/account`:** Die bestehende `account/page.tsx` hat bereits einen `'teams'`-Tab (`activeTab: 'teams'`), der Brewery-Memberships zeigt. Dieser wird konditionell gerendert:

```typescript
// In app/account/page.tsx
const tabs = [
  { id: "profile", label: "Profil", icon: User },
  { id: "subscription", label: "Abonnement", icon: CreditCard },
  { id: "security", label: "Sicherheit", icon: Key },
  { id: "privacy", label: "Datenschutz", icon: ShieldCheck },
  // ↓ Nur für Brauer sichtbar:
  ...(profile.app_mode === "brewer"
    ? [{ id: "teams", label: "Brauereien", icon: Factory }]
    : []),
  { id: "danger", label: "Gefahrenzone", icon: AlertTriangle },
];
```

**Consumer ohne Brauer-Kontext:** Wenn ein Consumer `/account` öffnet und auf den (versteckten) Teams-Tab zugreift (direkte URL), wird er auf `/my-cellar` redirected. Der Tab ist für Consumer nicht navigierbar.

**Beide Header verlinken auf `/account`** (nicht `/dashboard/account`):

- `AdminHeader` (Brauer): Profil-Menü → Einstellungen → `/account`
- `ConsumerHeader` (Consumer): Profil-Menü → Einstellungen → `/account`

---

#### 1.6b — Blanket Layout-Guard in `dashboard/layout.tsx`

Nachdem `/account` aus dem Dashboard herausgelöst wurde, gibt es keine legitimen Consumer-Seiten mehr unter `/dashboard/*` (die Consumer-Pages `collection`, `favorites`, `achievements` sind als Re-Exports auch unter `/my-cellar/*` erreichbar).

**Datei:** `app/dashboard/layout.tsx`

```typescript
// app/dashboard/layout.tsx
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  // NEU: Mode-Check — Consumer gehören nicht ins Dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('app_mode')
    .eq('id', user.id)
    .single();

  if (profile?.app_mode === 'drinker') {
    redirect('/my-cellar');
  }

  return (
    <AchievementNotificationProvider>
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </AchievementNotificationProvider>
  );
}
```

**Konsequenz:** Das Layout ist jetzt ein Server Component (mit `createClient()` statt Client-Hooks). Das verhindert das Flash-of-wrong-content, das beim Client-seitigen `useEffect`-Redirect zwangsläufig entsteht — der Consumer sieht die Brauer-UI nie, nicht einmal kurz.

**Warum Server Component besser ist als `useEffect`-Redirect:** Bei einem Client-Component-Layout rendered Next.js zuerst den Inhalt, dann läuft JavaScript an, dann erkennt es den falschen Mode, dann redirected es. Das ergibt ein kurzes visuelles Flackern. Ein `redirect()` im Server Component bricht die Response sofort ab — kein Render, kein Flackern.

> ⚠️ **Achtung Kollision:** Das bestehende `dashboard/layout.tsx` ist derzeit ein Client Component (`'use client'`). Die Umstellung auf Server Component erfordert, dass alle Client-Hooks (`useAuth`, `useEffect`) aus dem Layout entfernt werden. Die Auth-Logik wandert in den Server-seitigen `createClient()`. Der `AdminHeader` innerhalb des Layouts bleibt Client Component — das ist mit Next.js Server/Client-Komposition kein Problem.

---

#### 1.6c — `/dashboard/account` Redirect-Stub

```typescript
// app/dashboard/account/page.tsx (ersetzt durch Redirect)
import { redirect } from "next/navigation";
export default function AccountRedirect() {
  redirect("/account");
}
```

Dieser Stub ist wichtig für bestehende Bookmarks und für alle Komponenten, die noch auf `/dashboard/account` zeigen.

---

## 🍺 PHASE 2: CONSUMER DASHBOARD (`/my-cellar`) {#phase-2}

> **Status:** ✅ ABGESCHLOSSEN (Achievements-Tab bewusst entfernt — Brewer-only Feature)
> **Geschätzte Dauer:** 3–4 Tage
> **Abhängigkeiten:** Phase 0, Phase 1
> **Risiko:** Niedrig (komplett neue Route, kein Refactor bestehender Seiten)

### 2.1 — Route & Layout anlegen

**Neue Dateien:**

```
app/account/
  layout.tsx          ← Minimal-Layout (Auth-Guard, kein Header-System) [Phase 1.6a]
  page.tsx            ← Einstellungen (aus /dashboard/account/ verschoben) [Phase 1.6a]

app/my-cellar/
  layout.tsx          ← Consumer-Layout (ConsumerHeader, Auth-Guard)
  page.tsx            ← Consumer-Dashboard-Startseite
  collection/
    page.tsx          ← Re-Export von /dashboard/collection
  favorites/
    page.tsx          ← Re-Export von /dashboard/favorites
  achievements/
    page.tsx          ← Re-Export von /dashboard/achievements
  settings/
    page.tsx          ← Redirect auf /account (kein eigener Content)
  # ── Durch Analytics Phase 11 ergänzte Sub-Routes (Platzhalter) ──────
  # taste-dna/
  #   page.tsx        ← Taste DNA Heatmap (Analytics Phase 11.2)
  # beat-the-brewer/
  #   [brewId]/
  #     page.tsx      ← Beat-the-Brewer Ergebnis-Seite (Analytics Phase 11.1)
  # ConsumerHeader (Phase 3) wird dann um den Tab "Taste DNA" erweitert
```

**Wichtig:** `/my-cellar/settings` ist nur ein dünner Redirect-Stub zu `/account`. Es gibt keinen eigenen Consumer-Einstellungs-Inhalt — die Einstellungen sind mode-neutral und leben unter `/account`. Der Grund für den Stub: Der `ConsumerHeader` kann auf `/my-cellar/settings` zeigen (URL-Konsistenz für den Consumer), wird aber sofort weiterleitet.

**Architekturentscheidung:** Die bestehenden Consumer-Pages (`/dashboard/collection`, `/dashboard/favorites`, `/dashboard/achievements`) werden NICHT verschoben, sondern unter `/my-cellar/` per Re-Export verfügbar gemacht. Die `/dashboard/*`-Versionen bleiben für Brauer erreichbar (und für bestehende Bookmarks intakt).

### 2.2 — Consumer Layout

**Datei:** `app/my-cellar/layout.tsx`

```typescript
export default function MyCellarLayout({ children }: { children: React.ReactNode }) {
  return (
    <AchievementNotificationProvider>
      <ConsumerHeader />  {/* ← Neuer Header, siehe Phase 3 */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </AchievementNotificationProvider>
  );
}
```

**Auth-Guard:** Identisch zum Dashboard — wenn nicht eingeloggt, Redirect zu `/login?callbackUrl=/my-cellar`.

### 2.3 — Consumer Dashboard Homepage

**Datei:** `app/my-cellar/page.tsx`

Die Startseite des Consumer-Dashboards zeigt **auf einen Blick**, was der Trinker bisher erlebt hat, und motiviert ihn, mehr zu scannen:

```
┌─────────────────────────────────────────────────────────────┐
│  Willkommen zurück, {displayName}! 🍻                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  12 🍺   │  │  4 🏭    │  │  3 🏆    │  │  ★ 4.1   │  │
│  │ Getrunken│  │ Brauereien│  │Achievements│ │ Ø Rating │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  ── Letzte Aktivität ────────────────────────────────────  │
│  📸  Rauensteiner Helles bewertet (★★★★½)     vor 2 Tagen │
│  🎖️  "Ersten Kronkorken" Achievement freigeschaltet       │
│  📸  La Ferme Blanche IPA gescannt               vor 5 T. │
│                                                             │
│  ── Trending in deiner Nähe ───────────────────────────── │
│  [DiscoverWidget — 3 Featured Brews]                       │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│  🍺 "Werde vom Genießer zum Macher"                       │
│  [Button: Eigene Brauerei gründen →]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Datenquellen (alle bereits existierend):**

- `collected_caps` → Anzahl getrunkener Biere, beteiligte Brauereien
- `user_achievements` → Achievement-Count
- `ratings` JOIN `brews` → durchschnittliches eigenes Rating (via `author_name` Match oder zukünftig `user_id`)
- `bottle_scans` WHERE `viewer_user_id = user.id` → letzte Scans
- `DiscoverWidget` → bereits als Komponente vorhanden

**Der "Brauer werden" CTA:** Ein dezenter, aber attraktiver Banner am Ende der Seite. Klick → `/team/create` (bestehender Flow). Der `on_brewery_member_created`-Trigger (Phase 0.4) upgraded den `app_mode` automatisch.

### 2.4 — Aktivitäts-Timeline (Consumer Feed)

Anstelle des Brewery-Feeds (der auf dem Brauer-Dashboard lebt) bekommt der Consumer eine persönliche Timeline:

```typescript
// Server Action: getConsumerActivityFeed(userId)
// Quellen:
// 1. collected_caps → "Kronkorken gesammelt"
// 2. user_achievements → "Achievement freigeschaltet"
// 3. bottle_scans WHERE viewer_user_id = userId → "Bier gescannt"
// 4. likes → "Bier geliked"
// 5. ratings JOIN brews (über author_name Match) → "Bier bewertet"

// UNION ALL, ORDER BY created_at DESC, LIMIT 20
```

**Hinweis zur Rating-Zuordnung:** Aktuell haben `ratings` kein `user_id`-Feld. Die Zuordnung läuft über `author_name` + `ip_address`-Heuristik. Das ist fragil. In Phase 4 wird ein optionaler `user_id`-FK auf `ratings` ergänzt, der die Zuordnung robust macht.

---

## 🧭 PHASE 3: NAVIGATION & UX-TRENNUNG {#phase-3}

> **Status:** ✅ ABGESCHLOSSEN (3.1+3.4 in Phase 2 vorgezogen; 3.2 öffentl. Header; 3.3 AdminHeader unverändert)
> **Geschätzte Dauer:** 2–3 Tage
> **Abhängigkeiten:** Phase 2
> **Risiko:** Mittel (Header ist auf jeder Seite sichtbar, Regression möglich)

### 3.1 — Neuer ConsumerHeader

**Datei:** `app/my-cellar/components/ConsumerHeader.tsx` (neu)

Der ConsumerHeader ist eine **vereinfachte Version** des bestehenden AdminHeader, ohne Brewery-Kontext:

**Desktop-Tabs:**

```typescript
const tabs = [
  { name: "Übersicht", path: "/my-cellar", icon: Home },
  { name: "Sammlung", path: "/my-cellar/collection", icon: FlaskConical },
  { name: "Favoriten", path: "/my-cellar/favorites", icon: Heart },
  { name: "Achievements", path: "/my-cellar/achievements", icon: Trophy },
  // Analytics Phase 11 ergänzt hier einen weiteren Tab:
  // { name: "Taste DNA", path: "/my-cellar/taste-dna", icon: Dna },
```

**Desktop-Dropdowns (links):**

- **"Entdecken"** → Rezepte (`/discover`), Forum (`/forum`)
- ~~**"Team"**~~ → **NICHT vorhanden** beim Consumer

**Profil-Menü (rechts):**

- Einstellungen (`/dashboard/account`)
- Öffentliches Profil (`/brewer/{userId}`)
- 🍺 **_Brauer werden_** (`/team/create`) ← NEU, dezent
- Abmelden

**Mobile (Segmented Control — 2 Tabs statt 3):**

- **"Mein Keller":** Übersicht, Sammlung, Favoriten, Achievements
- **"Entdecken":** Rezepte, Forum
- ~~**"Brauerei"**~~ → Existiert nicht für Consumer

### 3.2 — Bestehenden Header anpassen (öffentliche Seiten)

**Datei:** `app/components/Header.tsx`

Der öffentliche Header (auf Discover, Forum, Landing etc.) muss den `app_mode` berücksichtigen:

```typescript
// Mobile Segmented Control:
// BISHER: 3 Tabs (Labor / Brauerei / Entdecken)
// NEU: Mode-abhängig

const tabs =
  profile?.app_mode === "brewer"
    ? ["Labor", "Brauerei", "Entdecken"]
    : ["Mein Keller", "Entdecken"]; // Kein "Brauerei"-Tab für Consumer
```

**Änderung im "Labor"/"Mein Keller" Tab:**

- Für Brauer: Links zeigen auf `/dashboard/...`
- Für Consumer: Links zeigen auf `/my-cellar/...`

**"Dashboard"-Link im Profil-Dropdown:**

```typescript
const dashboardUrl =
  profile?.app_mode === "brewer" ? "/dashboard" : "/my-cellar";
```

### 3.3 — AdminHeader für Brauer: Keine Änderungen nötig

Der AdminHeader (`app/dashboard/components/AdminHeader.tsx`) bleibt unverändert. Er wird nur unter `/dashboard/*` gerendert, und dort sind nur Brauer. Der Consumer sieht den `ConsumerHeader` unter `/my-cellar/*`.

### 3.4 — "Brauer werden" CTA-Komponente

**Datei:** `app/my-cellar/components/BecomeBrewerCTA.tsx` (neu)

Wiederverwendbare Komponente für den "Airbnb Become-a-Host"-Moment:

```typescript
export function BecomeBrewerCTA({ variant = 'banner' }: { variant: 'banner' | 'inline' | 'card' }) {
  // Varianten:
  // 'banner' → volle Breite am Seitenende (Consumer Dashboard)
  // 'inline' → ein Link im Profil-Dropdown
  // 'card' → eine Karte in der Consumer-Sidebar

  return (
    <Link href="/team/create" className={/* variant-specific styles */}>
      <Beaker className="..." />
      <div>
        <h3>Werde vom Genießer zum Macher</h3>
        <p>Gründe deine eigene Brauerei und digitalisiere deinen Brauprozess.</p>
      </div>
      <ArrowRight />
    </Link>
  );
}
```

---

## 👤 PHASE 4: CONSUMER PROFIL & GAMIFICATION {#phase-4}

> **Status:** ✅ ABGESCHLOSSEN
> **Geschätzte Dauer:** 2–3 Tage
> **Abhängigkeiten:** Phase 2, Phase 3
> **Risiko:** Niedrig (additive Features, keine Breaking Changes)

### 4.1 — `user_id` auf `ratings` Tabelle (Vorarbeit für Phase 11 Analytics-Roadmap)

Die `ratings`-Tabelle hat aktuell kein `user_id`-Feld. Ratings werden anonym (IP-Hash) oder mit `author_name` abgegeben. Für die Consumer-Activity-Timeline (Phase 2.4), für Taste DNA (Analytics Phase 11.2) und für die robuste Zuordnung "Welche Biere hat dieser User bewertet?" brauchen wir einen FK:

```sql
-- Migration: add_user_id_to_ratings.sql
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings(user_id) WHERE user_id IS NOT NULL;

-- RLS-Policy ergänzen: User können eigene Ratings sehen
CREATE POLICY "Users can view their own ratings"
  ON public.ratings FOR SELECT
  USING (user_id = auth.uid() OR true);
  -- "OR true" weil Ratings ohnehin öffentlich sind, aber Index hilft bei gefilterten Queries
```

**App-Code-Änderung:** Die Rating-Submit-API (`app/api/ratings/submit/route.ts`) setzt `user_id` wenn der User authentifiziert ist:

```typescript
// Bestehend: author_name, rating, comment, brew_id, ip
// NEU: user_id hinzufügen
const ratingData = {
  brew_id: brewId,
  rating: stars,
  comment,
  author_name: name,
  ip_address: hashedIp,
  user_id: session?.user?.id ?? null, // ← NEU
};
```

**Rückwirkende Zuordnung:** Ein Migration-Script versucht, bestehende Ratings nachträglich `user_id`s zuzuordnen, basierend auf Author-Name + Profile-Display-Name + zeitlicher Nähe zum Scan. Konservativ: nur wenn der Match eindeutig ist.

### 4.2 — Consumer-Profilseite überarbeiten

**Datei:** `app/brewer/[id]/page.tsx` (bestehend)

Die bestehende öffentliche Profilseite (`/brewer/[id]`) zeigt aktuell nur Brau-Aktivität (Brews, Forum-Posts, Reputation). Für Consumer muss sie erweitert werden:

```typescript
// Mode-abhängige Anzeige:
if (profileData.app_mode === 'drinker') {
  // Consumer-Profil zeigen:
  return (
    <>
      <ConsumerProfileHeader />     {/* Avatar, Name, Bio, Joined-Datum */}
      <ConsumerStatsGrid />         {/* Biere getrunken, Brauereien, Achievements */}
      <ConsumerCapCollection />     {/* Top-6 Kronkorken als visuelles Grid */}
      <ConsumerAchievements />      {/* Letzte freigeschaltete Achievements */}
      <ConsumerForumActivity />     {/* Falls im Forum aktiv */}
    </>
  );
} else {
  // Bestehende Brewer-Profil-Ansicht (unverändert)
  return <BrewerProfile ... />;
}
```

**URL-Naming:** Die Route bleibt `/brewer/[id]` — vorerst. Ein Rename zu `/profile/[id]` wäre semantisch sauberer, aber ein Breaking Change für alle geteilten Profil-Links. Optionaler Follow-Up: Redirect `/profile/[id]` → `/brewer/[id]` oder umgekehrt.

### 4.3 — Gamification-Stats-Karte (Consumer Dashboard)

**Datei:** `app/my-cellar/components/ConsumerStatsCard.tsx` (neu)

```typescript
interface ConsumerStats {
  totalCaps: number; // collected_caps COUNT
  uniqueBreweries: number; // collected_caps JOIN brews JOIN breweries DISTINCT
  totalRatings: number; // ratings WHERE user_id = X (nach Phase 4.1)
  averageRating: number; // ratings WHERE user_id = X AVG(rating)
  achievementCount: number; // user_achievements COUNT
  achievementPoints: number; // user_achievements JOIN achievements SUM(points)
  memberSince: string; // profiles.joined_at
}
```

**Server Action:** `getConsumerStats(userId)` — ein einzelner, optimierter Query statt 5 separate Fetches.

### 4.4 — "Meine Reise" Trink-Timeline (Grundlage)

Auf dem Consumer-Profil und im My-Cellar-Dashboard eine visuelle Timeline:

```
── 2026 ──────────────────────────────────
 📍 März    Rauensteiner Helles ★★★★½    Berlin
 📍 Feb.    La Ferme Blanche IPA ★★★★    Potsdam
 🎖️ Feb.    "Kronkorken-Sammler" Badge
 📍 Jan.    Berliner Weisse ★★★         Berlin
── 2025 ──────────────────────────────────
 📍 Dez.    Weihnachtsbock ★★★★★        München
```

**Datenquellen:** `collected_caps` JOIN `brews` JOIN `breweries` + `bottle_scans` für Geo/Datum + `user_achievements`.

**Geo-Anzeige:** Nur City-Level (aus `bottle_scans.city`), kein exakter Standort. DSGVO-konform.

---

## ✅ PHASE 5: ALTDATEN-MIGRATION & BEREINIGUNG {#phase-5}

> **Status:** ✅ ABGESCHLOSSEN
> **Geschätzte Dauer:** 1–2 Tage
> **Abhängigkeiten:** Phase 0 (Migration), Phase 2 (Consumer Dashboard muss existieren)
> **Risiko:** HOCH — falsche Klassifikation kann echte Brauer zu Drinker degradieren
>
> **Implementiert:**
>
> - `supabase/migrations/20260305130000_zwei_welten_phase5_classification_rpc.sql` — 5 Postgres RPCs (preview + run für 5.1, 5.2, 5.3)
> - `lib/actions/zwei-welten-admin-actions.ts` — Server Actions für alle 5 RPCs
> - `app/admin/dashboard/views/ZweiWeltenView.tsx` — Admin-UI mit 2-Klick-Safety für alle Operationen
> - Nav-Eintrag "Zwei Welten" in SidebarNav (Einstellungen) + Route in DashboardClient

### 5.1 — Klassifikations-Heuristik für bestehende User

```sql
-- Script: classify_existing_users.sql
-- ACHTUNG: Erst im Staging/Preview testen, dann Produktion!

-- Schritt 1: Alle User mit echtem Brau-Content → brewer
UPDATE public.profiles p
SET app_mode = 'brewer'
WHERE EXISTS (
  SELECT 1 FROM public.brewery_members bm
  WHERE bm.user_id = p.id
)
AND (
  -- Hat mindestens einen Brew erstellt
  EXISTS (SELECT 1 FROM public.brews b WHERE b.user_id = p.id)
  OR
  -- Hat mindestens eine Brewing-Session
  EXISTS (
    SELECT 1 FROM public.brewing_sessions bs
    JOIN public.brewery_members bm ON bm.brewery_id = bs.brewery_id
    WHERE bm.user_id = p.id
  )
  OR
  -- Hat mindestens ein Etikett erstellt
  EXISTS (
    SELECT 1 FROM public.bottles bt
    WHERE bt.user_id = p.id
  )
);

-- Schritt 2: Alle User MIT Brewery-Membership ABER OHNE Content → brewer
-- (Konservativ: Wer eine Brauerei hat, bleibt Brauer — auch wenn sie leer ist.
--  Er hat sich aktiv dafür entschieden.)
UPDATE public.profiles p
SET app_mode = 'brewer'
WHERE app_mode = 'drinker'
AND EXISTS (
  SELECT 1 FROM public.brewery_members bm
  WHERE bm.user_id = p.id
);

-- Schritt 3: Alle übrigen (kein Brewery-Member) → bleiben 'drinker' (Default)
-- Hier brauchen wir kein UPDATE, da DEFAULT = 'drinker'
```

**Warum so konservativ?** Wir degradieren niemals einen Brauer zu einem Drinker. Selbst wenn jemand eine "Fake-Brauerei" hat (0 Brews, 0 Sessions), bleibt er Brauer. Der Grund: Er hat sich aktiv entschieden, dem Brauer-Flow zu folgen. Ihn jetzt in den Consumer-Modus zu zwingen wäre eine UX-Verletzung.

### 5.2 — Optionale Bereinigung von Leeren Brauereien

**NICHT automatisiert.** Stattdessen: Admin-Dashboard-View, die leere Brauereien listet (0 Brews, 0 Sessions, 0 Bottles). Der Admin kann einzeln entscheiden, ob sie gelöscht werden.

```sql
-- Admin-Query: leere Brauereien finden
SELECT
  b.id, b.name, b.created_at,
  (SELECT COUNT(*) FROM brews WHERE brewery_id = b.id) AS brew_count,
  (SELECT COUNT(*) FROM brewing_sessions WHERE brewery_id = b.id) AS session_count,
  (SELECT COUNT(*) FROM bottles WHERE brewery_id = b.id) AS bottle_count,
  array_agg(p.display_name) AS members
FROM breweries b
JOIN brewery_members bm ON bm.brewery_id = b.id
JOIN profiles p ON p.id = bm.user_id
GROUP BY b.id
HAVING (SELECT COUNT(*) FROM brews WHERE brewery_id = b.id) = 0
   AND (SELECT COUNT(*) FROM brewing_sessions WHERE brewery_id = b.id) = 0
ORDER BY b.created_at;
```

### 5.3 — Bestehende Ratings nachträglich User zuordnen

```sql
-- Script: backfill_ratings_user_id.sql
-- Zuordnung über display_name-Match + IP-Nähe

UPDATE public.ratings r
SET user_id = p.id
FROM public.profiles p
WHERE r.user_id IS NULL
  AND LOWER(r.author_name) = LOWER(p.display_name)
  -- Nur wenn der Name eindeutig ist (keine Duplikate)
  AND (SELECT COUNT(*) FROM public.profiles WHERE LOWER(display_name) = LOWER(r.author_name)) = 1;
```

**Konservativ:** Nur bei eindeutigem Name-Match. Besser ein Rating unverknüpft lassen als es dem falschen User zuordnen.

---

## 🧪 PHASE 6: TESTING, SMOKE-TESTS & ROLLBACK {#phase-6}

> **Status:** ⏭️ NÄCHSTE PHASE
> **Geschätzte Dauer:** 1–2 Tage
> **Abhängigkeiten:** Phase 0–5

### 6.1 — End-to-End Test-Szenarien (Playwright)

```typescript
// tests/zwei-welten.spec.ts

test.describe("ZWEI_WELTEN: Consumer Flow", () => {
  test("Scan → Signup → Consumer Dashboard", async ({ page }) => {
    // 1. Flaschenseite öffnen (anonym)
    await page.goto("/b/test-bottle-id");

    // 2. "Kronkorken sammeln" klicken → Redirect zu Login mit intent=drink
    await page.click('[data-testid="collect-cap"]');
    await expect(page).toHaveURL(/\/login\?.*intent=drink/);

    // 3. Signup durchführen
    await page.fill('[name="email"]', "consumer@test.de");
    await page.fill('[name="password"]', "TestPass123!");
    // ...

    // 4. Nach Email-Bestätigung: Redirect zurück zu /b/[id], NICHT zu /dashboard
    await expect(page).toHaveURL(/\/b\//);

    // 5. Profil prüfen: app_mode = 'drinker'
    const profile = await supabase.from("profiles").select("app_mode").single();
    expect(profile.data.app_mode).toBe("drinker");
  });

  test("Consumer → Dashboard redirected zu /my-cellar", async ({ page }) => {
    // Login als Consumer
    await loginAsConsumer(page);

    // /dashboard manuell aufrufen → sollte zu /my-cellar redirecten
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/my-cellar");
  });

  test('Consumer → "Brauer werden" → Mode-Switch', async ({ page }) => {
    await loginAsConsumer(page);
    await page.goto("/my-cellar");

    // "Brauer werden" CTA klicken
    await page.click('[data-testid="become-brewer-cta"]');
    await expect(page).toHaveURL("/team/create");

    // Brauerei erstellen
    await page.fill('[name="brewery-name"]', "Testbrauerei");
    await page.click('[type="submit"]');

    // Profil prüfen: app_mode = 'brewer'
    const profile = await supabase.from("profiles").select("app_mode").single();
    expect(profile.data.app_mode).toBe("brewer");

    // Dashboard ist jetzt das Brauer-Dashboard
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL("/my-cellar");
  });

  test("Bestehender Brauer: Dashboard bleibt unverändert", async ({ page }) => {
    await loginAsBrewer(page);
    await page.goto("/dashboard");

    // Brauerei-Feed ist sichtbar
    await expect(page.locator('[data-testid="brewery-feed"]')).toBeVisible();

    // /my-cellar sollte trotzdem erreichbar sein (Brewer hat auch Sammlung)
    // ABER: Brauer werden NICHT zu /my-cellar redirected
  });
});
```

### 6.2 — Smoke-Test-Checkliste

**Consumer-Pfad:**

- [ ] Anonymer Flaschenscan `/b/[id]` funktioniert weiterhin
- [ ] Rating-Abgabe ohne Login funktioniert weiterhin
- [ ] Kronkorken-Claim → Login mit `intent=drink` → Signup → Redirect zurück zu `/b/[id]`
- [ ] Neuer Consumer-Signup → `profiles.app_mode = 'drinker'`
- [ ] Consumer-Login → Redirect zu `/my-cellar` (nicht `/dashboard`)
- [ ] `/my-cellar` zeigt Stats-Grid, Aktivitäts-Timeline, Discover-Widget
- [ ] `/my-cellar/collection` zeigt Kronkorken-Sammlung
- [ ] `/my-cellar/favorites` zeigt gelikte Biere
- [ ] `/my-cellar/achievements` zeigt Achievements
- [ ] `/dashboard` als Consumer → Redirect zu `/my-cellar`
- [ ] Header (öffentliche Seiten) zeigt "Mein Keller" statt "Brauerei" Tab
- [ ] Profil-Dropdown zeigt "Brauer werden" Link
- [ ] Forum funktioniert weiterhin für Consumer
- [ ] `/discover` funktioniert weiterhin für Consumer

**Brauer-Pfad (Regression):**

- [ ] Brauer-Signup über B2B-Startseite → `profiles.app_mode = 'brewer'`
- [ ] Brauer-Login → Redirect zu `/dashboard` (nicht `/my-cellar`)
- [ ] `/dashboard` zeigt Brewery-Feed wie bisher
- [ ] Team-Navigation funktioniert unverändert
- [ ] Analytics-Zugriff funktioniert unverändert
- [ ] Header zeigt "Brauerei"-Tab wie bisher
- [ ] Brauer kann weiterhin `Sammlung`, `Favoriten`, `Achievements` sehen

**Mode-Switch:**

- [ ] Consumer klickt "Brauer werden" → Team erstellen → `app_mode = 'brewer'`
- [ ] Nach Mode-Switch: `/dashboard` zeigt Brauer-Dashboard
- [ ] Consumer-Einladung via Invite-Code → `app_mode = 'brewer'` nach Join
- [ ] Mode-Switch ist irreversibel (kein Zurück zu 'drinker')

### 6.3 — Rollback-Plan

**Datenbank:** Alle Migrationen sind additiv (neue Spalten, nicht destruktiv). Rollback:

```sql
-- Rollback Phase 0:
ALTER TABLE public.profiles DROP COLUMN IF EXISTS app_mode;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tasting_iq;
DROP TABLE IF EXISTS public.tasting_score_events;
ALTER TABLE public.breweries DROP COLUMN IF EXISTS brewery_size;
-- Trigger zurücksetzen auf alte Version
DROP TRIGGER IF EXISTS on_brewery_member_created ON public.brewery_members;
-- Hinweis: profiles.tier wird NICHT wiederhergestellt — das alte Gamification-System
-- bleibt intentional gelöscht. Ein Rollback stellt nur die Auth-Logik zurück.
```

**Frontend:** Feature-Flag `NEXT_PUBLIC_ZWEI_WELTEN_ENABLED`:

```typescript
// In allen betroffenen Komponenten:
const zweiWeltenEnabled =
  process.env.NEXT_PUBLIC_ZWEI_WELTEN_ENABLED === "true";

// Login-Redirect:
if (zweiWeltenEnabled && profile?.app_mode === "drinker") {
  router.push("/my-cellar");
} else {
  router.push("/dashboard");
}
```

**Rollback-Schritte:**

1. `NEXT_PUBLIC_ZWEI_WELTEN_ENABLED=false` in Vercel Environment Variables
2. Deploy
3. Consumer landen wieder auf `/dashboard` (bestehender "Kein Team"-Flow)
4. Neue Routen (`/my-cellar/*`) sind verwaist aber erreichbar → kein Schaden
5. Datenbank-Spalten bleiben erhalten → kein Datenverlust

---

## 📋 Checkliste {#checkliste}

### Phase 0 — Datenbank-Migration

- [x] **0.1** Migration: `app_mode TEXT DEFAULT 'drinker'` auf `profiles`
- [x] **0.2** Trigger: `handle_new_user()` liest `app_mode` aus `raw_user_meta_data`
- [x] **0.3** Migration: `tier` → drop, `tasting_iq` + `tasting_score_events` + `breweries.brewery_size`
- [x] **0.4** Trigger: `on_brewery_member_created` upgraded `app_mode` zu 'brewer'
- [x] **0.5** TypeScript-Typen: `lib/types/user-mode.ts` angelegt

### Phase 1 — Entry-Point-Weiche

- [x] **1.1** `intent=drink` Parameter an Login-URLs auf `/b/[id]`
- [x] **1.2** Signup: `app_mode` aus `intent` in `raw_user_meta_data` setzen
- [x] **1.3** B2B-Startseite: `intent=brew` an Signup-Link
- [x] **1.4** Login-Redirect: Mode-basiert (`/my-cellar` vs. `/dashboard`)
- [x] **1.5** Auth-Callback: Mode-basierter Redirect
- [x] **1.6a** Neue Route `app/account/` anlegen: `account/page.tsx` aus `dashboard/account/` hierher verschieben
- [x] **1.6a** `app_mode`-bedingte Sichtbarkeit des "Brauereien"-Tabs in `account/page.tsx`
- [x] **1.6a** Alle Header-Links auf `/dashboard/account` → auf `/account` umstellen
- [x] **1.6a** `app/dashboard/account/page.tsx` → Redirect-Stub zu `/account`
- [x] **1.6b** `dashboard/layout.tsx` auf Server Component umbauen + Blanket-Guard (Consumer → `/my-cellar`)
- [x] **1.6c** Sicherstellen: `/team/[breweryId]/*` braucht KEINE Änderungen (bereits self-protecting)

### Phase 2 — Consumer Dashboard

- [x] **2.1** Route-Struktur: `/my-cellar/*` anlegen (Layout, Startseite, Re-Exports, Settings-Stub → `/account`)
- [x] **2.2** Consumer Layout mit Auth-Guard (Server Component, kein AdminHeader)
- [x] **2.3** Consumer Dashboard Homepage (Stats, Activity, Discover, CTA)
- [x] **2.4** Activity-Timeline (Consumer Feed)

### Phase 3 — Navigation & UX-Trennung

- [x] **3.1** `ConsumerHeader` Komponente (Desktop + Mobile)
- [x] **3.2** Öffentlicher Header: Mode-abhängige Tabs
- [x] **3.3** AdminHeader: Keine Änderung (Bestätigung)
- [x] **3.4** `BecomeBrewerCTA` Komponente

### Phase 4 — Consumer Profil & Gamification

- [x] **4.1** Migration: `user_id UUID` auf `ratings` Tabelle + API-Anpassung
- [x] **4.2** Öffentliche Profilseite: Consumer-Variante
- [x] **4.3** `ConsumerStatsCard` Komponente + Server Action
- [x] **4.4** "Meine Reise" Trink-Timeline (Grundlage)

### Phase 5 — Altdaten-Migration

- [x] **5.1** SQL-Script + RPC: bestehende User klassifizieren (`app_mode` setzen) — Admin-UI in ZweiWeltenView
- [x] **5.2** Admin-Query + RPC: leere Brauereien identifizieren — Admin-UI in ZweiWeltenView
- [x] **5.3** SQL-Script + RPC: Ratings nachträglich `user_id` zuordnen — Admin-UI in ZweiWeltenView

### Phase 6 — Testing

- [ ] **6.1** Playwright E2E-Tests (Consumer Flow, Brewer Regression, Mode-Switch)
- [ ] **6.2** Smoke-Test-Checkliste abarbeiten (Consumer, Brauer, Switch)
- [ ] **6.3** Rollback-Plan dokumentiert und getestet

---

## 🗓️ Zeitplanung {#zeitplanung}

| Phase      | Beschreibung                       | Komplexität                                             | Geschätzte Dauer | Abhängigkeiten   |
| ---------- | ---------------------------------- | ------------------------------------------------------- | ---------------- | ---------------- |
| Phase 0    | Datenbank-Migration (Foundation)   | Mittel (SQL + Trigger)                                  | 1–2 Tage         | —                |
| Phase 1    | Entry-Point-Weiche (Smart Routing) | Hoch (Auth-Flow + Layout-Refactor + /account-Migration) | 3–5 Tage         | Phase 0          |
| Phase 2    | Consumer Dashboard (`/my-cellar`)  | Mittel (Neue Route + UI)                                | 3–4 Tage         | Phase 0, Phase 1 |
| Phase 3    | Navigation & UX-Trennung           | Mittel (Header-Refactor)                                | 2–3 Tage         | Phase 2          |
| Phase 4    | Consumer Profil & Gamification     | Mittel (DB + UI)                                        | 2–3 Tage         | Phase 2, Phase 3 |
| Phase 5    | Altdaten-Migration & Bereinigung   | Niedrig–Mittel (SQL-Scripts)                            | 1–2 Tage         | Phase 0, Phase 2 |
| Phase 6    | Testing & Smoke-Tests              | Niedrig (E2E-Tests)                                     | 1–2 Tage         | Phase 0–5        |
| **Gesamt** |                                    |                                                         | **14–22 Tage**   |                  |

**Kritischer Pfad:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 6.
Phase 4 und Phase 5 können parallel zu Phase 3 laufen.

```
Woche 1:  ████ Phase 0  ████████ Phase 1 ██████████
Woche 2:  ████████████ Phase 2 ████████████████████
Woche 3:  ██████ Phase 3 ██████  ██████ Phase 4 ██████
          ████ Phase 5 ████      ████ Phase 6 ████████
```

---

## ⚠️ Designentscheidungen {#designentscheidungen}

1. **`app_mode` statt `is_brewer` Boolean** — TEXT-Feld mit CHECK-Constraint ist erweiterbar. Falls zukünftig Modi wie `distributor` oder `event_organizer` dazukommen, ist kein Schema-Change nötig. Aktuell: `'drinker' | 'brewer'`.

2. **Default ist `drinker`, nicht `brewer`** — Die überwältigende Mehrheit der zukünftigen User wird über QR-Scans kommen (B2C), nicht über die B2B-Startseite. Der Default muss den häufigsten Pfad abbilden.

3. **Mode-Upgrade ist irreversibel** — Ein Brauer kann nicht zurück zu `drinker` degradiert werden. Begründung: Er hat eine Brauerei mit Daten (Brews, Sessions, Etiketten). Diese Daten würden verwaisen. Der umgekehrte Weg (Drinker → Brewer) ist jederzeit möglich über "Brauerei gründen"/"Team beitreten".

4. **`/my-cellar` statt `/me` als Consumer-Route** — `/me` ist semantisch generisch. `/my-cellar` transportiert die BotlLab-Marke ("Mein Bierkeller") und ist sofort verständlich. Es erzeugt ein Besitzgefühl. Alternative `/my-cellar` vs. `/mein-keller`: Englisch gewählt, weil die gesamte URL-Struktur der App englisch ist (`/dashboard`, `/discover`, `/brew`).

5. **Bestehende Consumer-Pages werden re-exportiert, nicht verschoben** — `/dashboard/collection`, `/dashboard/favorites`, `/dashboard/achievements` bleiben bestehen. Sie werden unter `/my-cellar/collection` etc. als Re-Exports verfügbar gemacht. Dadurch: keine Breaking Changes für bestehende Links, kein Code-Duplikation.

6. **`tier` wird vollständig gedroppt — kein Rename, kein Nachfolger für Brauer** — Das alte Gamification-System (Lehrling → Braumeister) war brauer-zentrisch und in der Zwei-Welten-Architektur semantisch falsch. Statt umbenennen: sauberer Bruch. Für Consumer kommt `tasting_iq` (numerischer Score, leaderboard-tauglich, kein Cap). Für Brauer gibt es kein neues Tier-System — ihre Progression ist `subscription_tier`. Brewery-Größen-Werte werden auf die `breweries`-Tabelle migriert.

7. **Signup-Trigger liest `app_mode` aus `raw_user_meta_data`** — Das Signup-Form setzt `app_mode` über die `options.data`-API von Supabase Auth. Der Trigger liest es aus `raw_user_meta_data` und schreibt es in `profiles`. So bleibt die gesamte Logik in der Datenbank (Single Source of Truth) und nicht im Application Code verteilt über 3 Signup-Endpunkte.

8. **Automatischer Mode-Upgrade per DB-Trigger statt App-Code** — Es gibt drei Wege einer Brauerei beizutreten (`create_own_squad`, `/team/join/[code]`, Admin-Invite). Ein `AFTER INSERT ON brewery_members`-Trigger fängt alle drei ab. Kein Risiko, dass ein Code-Pfad den Mode-Switch vergisst.

9. **`ratings.user_id` ist nullable, nicht NOT NULL** — Anonyme Ratings (IP-only) bleiben möglich. Ein authentifizierter User bekommt seinen `user_id` gesetzt, ein anonymer nicht. Bestehende anonyme Ratings bleiben anonym.

10. **Consumer kann `/dashboard` aufrufen und wird sanft redirected** — Kein 403 oder Error-Page. Stattdessen: `router.replace('/my-cellar')`. Bestehende Bookmarks auf `/dashboard` funktionieren weiterhin für beide Modi.

11. **Feature-Flag für Rollback** — `NEXT_PUBLIC_ZWEI_WELTEN_ENABLED` steuert alle Mode-Checks. Im Notfall reicht ein Environment-Variable-Toggle in Vercel + Deploy, um auf den alten Flow zurückzufallen. Die Datenbank-Spalten bleiben erhalten.

12. **User-Klassifikation bei Altdaten: Konservativ — nie automatisch degradieren** — Jeder User mit `brewery_members`-Eintrag wird `brewer`, egal ob er Content hat oder nicht. Nur User OHNE jegliche Brewery-Membership bleiben `drinker`. Das Risiko einer falschen Klassifikation überwiegt den Nutzen einer "sauberen" Datenbank.

13. **Consumer sieht KEINEN "Brauerei"-Tab in der Navigation** — Die Mobile-Navigation hat nur 2 statt 3 Tabs. Das reduziert die kognitive Last und verhindert die Verwirrung "Was soll ich mit einer Brauerei?" für reine Trinker.

14. **Ratings-Backfill nur bei eindeutigem Name-Match** — Die rückwirkende Zuordnung von `ratings.user_id` basiert auf exaktem `LOWER(author_name) = LOWER(display_name)` UND Eindeutigkeit (COUNT = 1). Lieber ein Rating unverknüpft lassen als dem falschen User zuordnen.

15. **`/brewer/[id]` URL bleibt bestehen, zeigt aber mode-abhängige Inhalte** — Ein Rename zu `/profile/[id]` wäre semantisch sauberer, aber ein Breaking Change für alle bereits geteilten Profil-Links (URLs in Foren, Social Media, Google-Index). Die URL ist ein permanenter Vertrag.

16. **`/account` ist die einzige Route außerhalb beider Welten** — Einstellungen (Profil, Passwort, Datenschutz, Abonnement) sind mode-neutral und gehören keiner der beiden Welten an. Die Seite lebt deshalb auf einem eigenen, schlanken Layout ohne AdminHeader oder ConsumerHeader. Beide Header verlinken dorthin. Nur der "Brauereien"-Tab ist brewer-only und wird konditionell ausgeblendet. Zukünftige mode-spezifische Einstellungen (z.B. Favorisierte Bierstile für Consumer, Brauerei-Profil für Brauer) werden als konditionelle Tabs in derselben Seite ergergänzt — keine separaten Settings-Pages.

17. **`/dashboard/layout.tsx` wird Server Component** — Der Mode-Redirect gehört ins Layout (nicht in `page.tsx`), damit er für alle Sub-Routen unter `/dashboard/*` greift. Da Next.js Layouts Server Components sein können (und Client Components innerhalb Server Components rendern dürfen), ist das sauber möglich. Der `AdminHeader` bleibt Client Component. Vorteil: Kein Flash-of-wrong-content, da der Redirect serverseitig erfolgt bevor HTML gesendet wird.

18. **`/team/[breweryId]/*` bleibt unangetastet** — Diese Routes sind bereits durch URL-Struktur selbst-schützend: Ohne eine gültige `breweryId` in der URL ist die Route unerreichbar. Ein Consumer ohne Brauerei kann niemals eine `breweryId` konstruieren. Das Membership-Check im `team/[breweryId]/layout.tsx` ist zusätzliche Sicherheit. Kein einziger Migrations-Schritt in diesem Bereich.

---

## 🔗 Abhängigkeit zur Analytics-USP-Roadmap

Diese Roadmap ist eine **harte Voraussetzung für Phase 11 (Drinker Experience Engine)** der Analytics-USP-Roadmap. Ohne ZWEI_WELTEN:

- Kann der B2C-Flow (`/b/[id]` → `/my-cellar` → Taste DNA) nicht existieren
- Haben User ohne `team_id` keine Heimat in der App
- Funktioniert Beat the Brewer nicht (Consumer braucht ein Profil ohne Brewery)
- Kann die Gamification-Engine (Tasting IQ, Badges, Leaderboard) nicht user_id-basiert arbeiten

**Reihenfolge:** ZWEI_WELTEN (diese Roadmap) → Analytics Phase 11 → Analytics Phase 12 (Viral Loops).

---

## 📝 Offene Fragen & Entscheidungen

1. **Soll ein Brauer auch `/my-cellar` sehen können?** Ein Brauer ist oft auch Trinker. Aktueller Vorschlag: Ja, aber als sekundäre Route (kein Redirect). Der Brauer erreicht seine Sammlung weiterhin über `/dashboard/collection`. `/my-cellar` ist für ihn optional erreichbar, aber nicht sein Default.

2. **Was passiert mit dem `active_brewery_id` eines Consumers?** Bleibt `NULL`. Das Feld war schon immer nullable. `getActiveBrewery()` gibt schon heute sauber `null` zurück.

3. **Soll die B2B-Startseite (`/`) für Consumer erreichbar bleiben?** Ja, keine Einschränkung. Die Startseite ist Marketing-Material für alle. Nur der Login-Redirect ändert sich.

4. **Brauchen wir ein separates Consumer-Notification-System?** Nicht sofort. Das bestehende `notifications`-System ist `user_id`-basiert und funktioniert für Consumer. Erst wenn Consumer-spezifische Notifications dazukommen (z.B. "Dein Lieblingsbier hat ein neues Batch!"), muss es erweitert werden.

5. **☑️ ENTSCHIEDEN: Wo leben die Account-Einstellungen?** Unter der neuen geteilten `/account`-Route (Phase 1.6a). Nicht unter `/dashboard/account`, nicht unter `/my-cellar/settings`. Beide Header verlinken auf `/account`. Der "Brauereien"-Tab ist konditionell für `app_mode === 'brewer'` sichtbar. Zukünftige mode-spezifische Einstellungen werden als konditionelle Sektionen in derselben Seite ergänzt.
