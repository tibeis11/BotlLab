# Technical Debt & Architecture Improvements Roadmap

**Status:** Active 🟡 (Phase 1 In Progress)  
**Last Updated:** 2026-02-17  
**Priority:** High  
**Estimated Timeline:** 10-14 Wochen

---

## 📋 Current Progress Checklist

**Phase 0: Safety Net**
- [x] Playwright Setup
- [x] Smoke Tests for Auth
- [x] Smoke Tests for Core Features
- [x] CI Integration

**Phase 1: Critical Fixes**
- [x] **1.1 Supabase Client Refactoring** (Singleton Removed)
- [ ] **1.2 Input Validation & Server Actions**
  - [x] Zod Setup & Base Schemas
  - [x] **Brews:** Schemas & Safe Actions created
  - [x] **Profiles:** Schemas & Safe Actions created
  - [x] **Inventory:** Schemas & Safe Actions created (`inventory-actions.ts`)
  - [ ] **Inventory:** Refactor `inventory/page.tsx` to use actions 👈 **(WE ARE HERE)**
  - [ ] **Brews/Profiles:** Refactor UI to use actions
- [ ] **1.3 Type Safety (DB Types)**
- [ ] **1.4 Error Boundaries**

**Phase 2: Architecture**
- [ ] 2.1 Analytics Refactoring (RSC)
- [ ] 2.2 Rate Limiting
- [ ] 2.3 Query Optimization
- [ ] 2.4 Env Validation

---

## Executive Summary

Diese Roadmap adressiert kritische technische Schulden und Architektur-Probleme.

**⚡️ CURRENT FOCUS:**

- Input Validation mit Zod für Server Actions (Phase 1.2) - In Vorbereitung
- Type Safety Refactoring für Server Actions (DB Types)

---

**Hauptziele:**

- Eliminierung kritischer Security- und Performance-Bottlenecks
- Verbesserung der Code-Qualität und Wartbarkeit
- Einführung von Type Safety und Testing
- Optimierung der Entwickler-Experience

**⚠️ KRITISCH:** Phase 0 (Smoke Tests) ist **PFLICHT** vor jedem Refactoring. Ohne Safety Net ist das Risiko für Production-Ausfälle zu hoch.

---

## ✅ PHASE 0: SAFETY NET (COMPLETED)

### 0.1 E2E Smoke Tests Setup

**Problem:**  
Wir planen massive Refactorings (Singleton-Entfernung, Analytics-Umbau) ohne automatisierte Tests. Ein einziger Bug im Auth-Flow oder Like-System und die App ist unbenutzbar. **Refactoring ohne Tests ist Blindflug.**

**Warum Phase 0 zuerst kommen MUSS:**

- Wenn wir `lib/supabase.ts` anfassen, können wir den Login-Flow zerstören
- Ohne Tests merken wir Bugs erst, wenn User sich beschweren
- Tests sind das **Safety Net**, das uns erlaubt, mutig zu refactoren

**Lösung:**

**Schritt 1:** Playwright installieren

```bash
npm install -D @playwright/test
npx playwright install
```

**Schritt 2:** Kritische User Journeys testen

```typescript
// tests/smoke/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Critical Auth Flows", () => {
  test("user can sign up and access dashboard", async ({ page }) => {
    await page.goto("/login");

    // Sign up
    await page.click("text=Registrieren");
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', "Test123456!");
    await page.click('button:has-text("Registrieren")');

    // Verify redirect
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=Willkommen")).toBeVisible();
  });

  test("user can login with existing account", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "existing@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Anmelden")');

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

```typescript
// tests/smoke/core-features.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Critical Features", () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "Test123!");
    await page.click('button:has-text("Anmelden")');
  });

  test("user can like a brew", async ({ page }) => {
    await page.goto("/discover");
    await page.waitForSelector('[data-testid="brew-card"]');

    const likeButton = page.locator('[data-testid="like-button"]').first();
    const initialState = await likeButton.getAttribute("data-liked");

    await likeButton.click();
    await page.waitForTimeout(500); // Wait for optimistic update

    const newState = await likeButton.getAttribute("data-liked");
    expect(newState).not.toBe(initialState);
  });

  test("user can create a brew", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Neues Brew");

    await page.fill('input[name="name"]', "Test IPA");
    await page.selectOption('select[name="style"]', "IPA");
    await page.click('button:has-text("Erstellen")');

    await expect(page.locator("text=Test IPA")).toBeVisible();
  });

  test("analytics page loads without crash", async ({ page }) => {
    // Upgrade to Brewer tier first
    await page.goto("/team/test-brewery-id/analytics");

    // Should not throw 500, either shows content or upgrade prompt
    await expect(page.locator("body")).not.toContainText("500");
  });
});
```

**Schritt 3:** CI Integration

```yaml
# .github/workflows/smoke-tests.yml
name: Smoke Tests
on: [push, pull_request]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:smoke
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_KEY }}
```

**Schritt 4:** Pre-Push Hook (optional)

```json
// package.json
{
  "scripts": {
    "test:smoke": "playwright test tests/smoke/",
    "prepush": "npm run test:smoke"
  }
}
```

**Minimum Viable Coverage:**

- ✅ **Auth:** Login, Signup, Logout
- ✅ **Core Features:** Like, Create Brew, View Brew
- ✅ **Critical Pages:** Dashboard, Discover, Analytics (no crash)
- ✅ **Payment:** Checkout Flow (Stripe Test Mode)

**Erfolgskriterien:**

- ✅ Alle Smoke Tests laufen grün (Verified 2026-02-17)
- ✅ Tests laufen in < 1 Minute (~42s)
- ✅ CI Pipeline blockiert Merge bei Failures
- ✅ Alle Devs können Tests lokal laufen lassen via `npm run test:smoke`

**Zeitaufwand:** 3-4 Tage  
**Risiko:** Niedrig (Keine Code-Änderungen)  
**Blocker für:** Alle weiteren Phasen

---

## ✅ RATING & SOCIAL INFRASTRUCTURE FIXES (COMPLETED)

**Problem:**  
Das bestehende Rating-System war anfällig für Spam und anonyme Bewertungen wurden nicht automatisch mit User-Accounts verknüpft. Zudem waren die generierten Digital Caps (Bild-Prompts) unbefriedigend.

**Lösungen:**

1.  **User Linking**: Automatisches Verknüpfen von Gast-Bewertungen mit User-Profilen bei Login/Registrierung über die Email-Adresse.
2.  **Spam-Schutz**: Implementierung eines Honeypot-Feldes und einer Zeit-basierten Validierung (keine Ratings unter 2 Sekunden).
3.  **DB Fix**: Hinzufügen von `ON DELETE CASCADE` für Profiles/Brews/Bottles, um sauberes Löschen von Test-Usern zu ermöglichen.
4.  **AI Image Prompting**: Refactoring der Gemini-Prompts für Bottle Caps (Besseres Full-Bleed Design, keine Texte, Esports Badge Style).

**Erfolgskriterien:**

- ✅ Gast-Ratings werden bei Account-Erstellung automatisch zugewiesen
- ✅ Bot-Spam wird effektiv blockiert
- ✅ Test-Environment ist stabil und löschbar
- ✅ Digitale Kronkorken sehen deutlich hochwertiger aus

---

## � PHASE 1: KRITISCHE FIXES (Woche 2-3 - IN ARBEIT)

### 1.1 Supabase Client Architecture Refactoring

**Status:** ✅ Completed

**Problem:**  
Das globale Singleton-Pattern in `lib/supabase.ts` führt zu Auth-Problemen, Race Conditions und Server/Client Context-Konfusion. Der aktuelle Ansatz (`typeof window !== 'undefined'`) ist ein Anti-Pattern für Next.js App Router.

**Technische Details:**

```typescript
// ❌ AKTUELL: Gefährliches Singleton
export const supabase =
  typeof window !== "undefined"
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createClient(supabaseUrl, supabaseAnonKey);
```

**Probleme:**

- Server Components greifen auf veraltete Sessions zu
- Cookie-Updates werden nicht korrekt propagiert
- Auth-State kann zwischen Client/Server divergieren
- Middleware-Updates erreichen nicht alle Components

**Lösung:**

**Schritt 1:** Neuer Client-Side Hook

```typescript
// lib/hooks/useSupabase.ts
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useMemo } from "react";

export function useSupabase() {
  return useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );
}
```

**Schritt 2:** Server Components behalten bestehende `supabase-server.ts`

**Schritt 3:** Migration Strategy

1. Deprecation Notice zu `lib/supabase.ts` hinzufügen
2. Alle Client Components umschreiben:
   - `discover/page.tsx`
   - `team/[breweryId]/settings/page.tsx`
   - `dashboard/**`
3. Altes Singleton nach Migration löschen

**Erfolgskriterien:**

- ✅ Keine direkten Importe von `lib/supabase.ts` mehr in kritischen Client Components (Dashboard, Team-Bereich, Header)
- ✅ Auth-Flow (`AuthContext`, `LoginPage`) vollständig auf `useSupabase` Hooks migriert
- ✅ Auth-State konsistent zwischen Client/Server
- ✅ Alle Smoke Tests bleiben grün (Auth, Core Features)

**Zeitaufwand:** 7-10 Tage (Abgeschlossen am 17.02.2026)

---

### 1.2 Input Validation mit Zod (🟡 In Arbeit)

**Problem:**  
Server Actions haben keine Input-Validierung. SQL Injection theoretisch möglich, Type Coercion Bugs, unerwartete Runtime Errors.

**⚠️ PRIORITÄT:** Dies ist wichtiger als UI Type Safety! Falsche Types in einer Card = optisches Problem. Fehlende Validation bei Writes = Datenbank-Korruption.

**Status Update (17.02.2026):**
- ✅ Zod Schemas für `Brews`, `Profiles`, und `Inventory` erstellt (`lib/validations/`)
- ✅ Server Actions für `Brews`, `Profiles` und `Inventory` auf Validierung umgestellt (`lib/actions/`)
- 🛑 **STOPPED HERE:** Integration der Inventory Actions in die UI (`app/team/[breweryId]/inventory/page.tsx`)

**Technische Details:**

```typescript
// ❌ AKTUELL
interface BrewCardProps {
  brew: any; // Keine Ahnung was hier drin ist
}

// ❌ AKTUELL
const brewery = Array.isArray(selectedMember.breweries)
  ? selectedMember.breweries[0]
  : selectedMember.breweries; // Unsicher!
```

**Lösung:**

**Schritt 1:** Types generieren

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

**Schritt 2:** Base Types definieren

```typescript
// lib/types/database.ts
import { Database } from "@/lib/database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Brew = Tables<"brews">;
export type Brewery = Tables<"breweries">;
export type Profile = Tables<"profiles">;
export type Like = Tables<"likes">;
export type Rating = Tables<"ratings">;

// Extended Types mit Joins
export type BrewWithRelations = Brew & {
  breweries: Brewery | null;
  ratings: Rating[];
  user_has_liked?: boolean;
  likes_count: number;
};

export type BreweryWithRole = Brewery & {
  userRole: "owner" | "member";
};
```

**Schritt 3:** Migration Priority

1. **High Priority:** Core Data Models (`BrewCard`, `BreweryHeader`, etc.)
2. **Medium Priority:** Pages (`discover`, `team/[breweryId]`)
3. **Low Priority:** Admin, Seed Scripts

**Schritt 4:** Typed Client

```typescript
import { Database } from "@/lib/database.types";

export function useSupabase() {
  return createBrowserClient<Database>();
  // ...
}
```

**Erfolgskriterien:**

- ✅ Kein `any` mehr in Data-kritischen Components
- ✅ Autocomplete für alle DB-Felder in IDE
- ✅ Type Errors beim Build für falsche Query-Strukturen

**Zeitaufwand:** 2-3 Tage  
**Risiko:** Niedrig (Breaking Changes sind sofort sichtbar)

**Technische Details:**

```typescript
// ❌ AKTUELL: Keine Validierung
export async function toggleBrewLike(brewId: string) {
  // Was wenn brewId = undefined, null, oder kein UUID?
  await supabase.from("likes").insert({ brew_id: brewId });
}
```

**Lösung:**

**Schritt 1:** Zod installieren

```bash
npm install zod
```

**Schritt 2:** Schema Library erstellen

```typescript
// lib/validations/schemas.ts
import { z } from "zod";

export const UUIDSchema = z.string().uuid("Invalid UUID format");

export const BrewLikeSchema = z.object({
  brewId: UUIDSchema,
});

export const BrewCreateSchema = z.object({
  name: z.string().min(3).max(100),
  style: z.string().optional(),
  brewType: z.enum(["beer", "wine", "softdrink"]),
  isPublic: z.boolean().default(true),
  breweryId: UUIDSchema,
});

export const BreweryUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  customSlogan: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
});
```

**Schritt 3:** Server Actions updaten

```typescript
// lib/actions/like-actions.ts
import { BrewLikeSchema } from "@/lib/validations/schemas";

export async function toggleBrewLike(input: unknown) {
  // Validation
  const { brewId } = BrewLikeSchema.parse(input);

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Rest of logic...
}
```

**Schritt 4:** Client-Side Integration

```tsx
// app/components/LikeButton.tsx
try {
  await toggleBrewLike({ brewId });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation failed:", error.errors);
  }
}
```

**Migration Priority:**

1. **Critical:** Auth Actions, Payment Actions
2. **High:** Like/Rating Actions, Brewery Management
3. **Medium:** Profile Updates, Settings
4. **Low:** Analytics Filters

**Erfolgskriterien:**

- ✅ Alle Server Actions haben Input Validation
- ✅ Type-safe Error Handling im Frontend
- ✅ Keine unerwarteten Runtime Type Errors

---

### 1.3 Type Safety durch Supabase Database Types

**Problem:**  
Überall `any` Types, keine Type Safety bei DB Queries, Runtime-Fehler statt Compile-Time-Fehler.

**⚠️ PRIORISIERUNG:** Fokus auf **Write Operations** (Server Actions, Mutations). UI Types sind Nice-to-Have.

**Technische Details:**

```typescript
// ❌ AKTUELL
interface BrewCardProps {
  brew: any; // Keine Ahnung was hier drin ist
}

// ❌ AKTUELL
const brewery = Array.isArray(selectedMember.breweries)
  ? selectedMember.breweries[0]
  : selectedMember.breweries; // Unsicher!
```

**Lösung:**

**Schritt 1:** Types generieren

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

**Schritt 2:** Base Types definieren

```typescript
// lib/types/database.ts
import { Database } from "@/lib/database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Brew = Tables<"brews">;
export type Brewery = Tables<"breweries">;
export type Profile = Tables<"profiles">;
export type Like = Tables<"likes">;
export type Rating = Tables<"ratings">;

// Extended Types mit Joins
export type BrewWithRelations = Brew & {
  breweries: Brewery | null;
  ratings: Rating[];
  user_has_liked?: boolean;
  likes_count: number;
};

export type BreweryWithRole = Brewery & {
  userRole: "owner" | "member";
};
```

**Schritt 3:** Migration Priority

1. **High Priority:** Server Actions (`like-actions.ts`, `brewery-actions.ts`)
2. **Medium Priority:** API Routes (`/api/stripe/webhook`, `/api/generate-text`)
3. **Low Priority:** UI Components (`BrewCard`, `BreweryHeader`)

**Schritt 4:** Typed Client

```typescript
import { Database } from "@/lib/database.types";

export function useSupabase() {
  return createBrowserClient<Database>();
  // ...
}
```

**Erfolgskriterien:**

- ✅ Alle Server Actions sind typsicher
- ✅ Alle API Routes haben Typed Responses
- ✅ Autocomplete für DB-Felder in IDE
- ✅ Type Errors beim Build für falsche Query-Strukturen

**Zeitaufwand:** 4-5 Tage  
**Risiko:** Niedrig (Breaking Changes sind sofort sichtbar)

---

### 1.4 Error Boundaries Implementation

**Problem:**  
Ein Component-Crash führt zum Totalausfall der App. Keine lokalen Error Recovery Mechanismen.

**Technische Details:**

- Nur `global-error.tsx` vorhanden (Root-Level)
- Kein Graceful Degradation bei Teil-Failures
- Schlechte User Experience bei Fehlern

**Lösung:**

**Schritt 1:** Layout-Level Error Boundaries

```tsx
// app/team/[breweryId]/error.tsx
"use client";

export default function BreweryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Brewery Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">
          Brauerei konnte nicht geladen werden
        </h2>
        <p className="text-zinc-400 mb-6">
          {error.message || "Ein unerwarteter Fehler ist aufgetreten"}
        </p>
        <button
          onClick={reset}
          className="bg-cyan-500 text-black px-6 py-3 rounded-xl"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
```

**Schritt 2:** Critical Sections mit React Error Boundary

```tsx
// lib/components/ErrorBoundary.tsx
"use client";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Etwas ist schiefgelaufen.</div>;
    }
    return this.props.children;
  }
}
```

**Schritt 3:** Wrap Critical Components

```tsx
// app/team/[breweryId]/analytics/page.tsx
<ErrorBoundary fallback={<AnalyticsErrorFallback />}>
  <AnalyticsCharts data={data} />
</ErrorBoundary>

<ErrorBoundary fallback={<PaymentErrorFallback />}>
  <CheckoutForm />
</ErrorBoundary>
```

**Bereiche für Error Boundaries:**

- Analytics Dashboard
- Payment/Checkout Flow
- AI Generation (Image/Text)
- File Uploads
- Brewery Settings

**Erfolgskriterien:**

- ✅ Partial Failures crashen nicht die ganze App
- ✅ User bekommt hilfreiche Error Messages
- ✅ Recovery-Actions (Retry) funktionieren

**Zeitaufwand:** 2 Tage  
**Risiko:** Niedrig

---

## 🟠 PHASE 2: ARCHITEKTUR-VERBESSERUNGEN (Woche 4-7)

### 2.1 Analytics Page Refactoring (Server Components)

**Problem:**  
`team/[breweryId]/analytics/page.tsx` hat 818 Zeilen. Unmaintainable, schwer zu testen, langsam zu laden.

**Analyse:**

- 15+ useState Hooks
- Business Logic gemischt mit UI
- Keine Component-Wiederverwendung
- Props Drilling überall

**⚠️ ARCHITEKTUR-ENTSCHEIDUNG:** Nutze **Server Components** statt Client-Side Hooks!

**Warum Server Components:**

- ❌ **Nicht:** `useEffect` → Request → Loading Spinner (Client Side Fetching)
- ✅ **Stattdessen:** Server lädt Daten → Streaming mit `<Suspense>` → Instant UI
- **Vorteil:** Kein Waterfall, kein Layout Shift, kleinere Bundle Size

**Lösung:**

**Neue Architektur:**

```
app/team/[breweryId]/analytics/
├── page.tsx (Server Component, ~50 Zeilen)
├── loading.tsx (Suspense Fallback)
├── actions/
│   └── getBreweryAnalytics.ts (Server Action)
├── components/
│   ├── AnalyticsDashboard.tsx (Server Component)
│   ├── AnalyticsFilters.tsx (Client Component für Interaktivität)
│   ├── MetricCard.tsx (Server Component)
│   ├── ScansByDateChart.tsx (Client Component - Recharts)
│   ├── ScansByCountryChart.tsx (Client Component)
│   ├── ScansByDeviceChart.tsx (Client Component)
│   ├── TopBrewsTable.tsx (Server Component mit Pagination)
│   ├── ConversionFunnel.tsx (Client Component)
│   └── BreweryHeatmap.tsx (bereits vorhanden)
└── utils/
    ├── chartHelpers.ts
    └── analyticsCalculations.ts
```

**Schritt 1:** Server Action für Data Fetching

```typescript
// actions/getBreweryAnalytics.ts
"use server";
import { createClient } from "@/lib/supabase-server";
import { cache } from "react";

export const getBreweryAnalytics = cache(
  async (breweryId: string, filters?: AnalyticsFilters) => {
    const supabase = await createClient();

    // Single optimized query
    const { data, error } = await supabase.rpc("get_brewery_analytics", {
      brewery_id: breweryId,
      start_date: filters?.startDate,
      end_date: filters?.endDate,
    });

    if (error) throw error;
    return data;
  },
);
```

**Schritt 2:** Server Component Page

```tsx
// page.tsx (Server Component!)
import { Suspense } from "react";
import { getBreweryAnalytics } from "./actions/getBreweryAnalytics";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { AnalyticsSkeleton } from "./components/AnalyticsSkeleton";

interface Props {
  params: { breweryId: string };
  searchParams: { startDate?: string; endDate?: string };
}

export default async function AnalyticsPage({ params, searchParams }: Props) {
  // Server-side data loading - NO useState, NO useEffect!
  const data = await getBreweryAnalytics(params.breweryId, searchParams);

  return (
    <div className="space-y-6">
      <h1>Analytics</h1>

      {/* Interactive Filters bleiben Client Component */}
      <AnalyticsFilters />

      {/* Dashboard mit Suspense Streaming */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsDashboard data={data} />
      </Suspense>
    </div>
  );
}
```

**Schritt 3:** Atomare Components

```typescript
// components/MetricCard.tsx (Server Component)
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
}

export function MetricCard({ title, value, change, icon }: MetricCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-400 text-sm">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {change !== undefined && (
        <div className={`text-sm mt-2 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}
```

**Migration Strategy:**

1. Server Action erstellen (`getBreweryAnalytics`)
2. Page.tsx auf `async` umstellen (Data Fetch im Server)
3. UI Components zu Server Components konvertieren (wo möglich)
4. Nur Charts/Filters als Client Components markieren
5. `loading.tsx` für Suspense Fallback
6. Alte useState/useEffect Logic entfernen

**Erfolgskriterien:**

- ✅ Page unter 100 Zeilen (Server Component)
- ✅ Kein `useState` oder `useEffect` für Data Fetching
- ✅ Initial Load < 1s (Server-Side Rendering)
- ✅ Bundle Size -40% (weniger Client JS)
- ✅ Keine Loading Spinners (Suspense Streaming)

**Zeitaufwand:** 5-7 Tage  
**Risiko:** Mittel (Große Änderung, aber klar abgegrenzt)

---

### 2.2 Rate Limiting für API Routes

**Problem:**  
Keine Rate Limits auf `/api/generate-text` und `/api/generate-image`. Gemini API kann gespammt werden, Kosten explodieren.

**Technische Details:**

- Ein Angreifer kann unbegrenzt Requests senden
- Keine DDoS-Protection
- Premium-Limits werden clientseitig gecheckt (umgehbar)

**Lösung:**

**Option A: Vercel Rate Limiting (Einfach)**

```typescript
// middleware.ts
import { Ratelimit } from "@vercel/edge";

const ratelimit = new Ratelimit({
  limit: 10, // 10 Requests
  interval: "1m", // pro Minute
});

export async function middleware(req: NextRequest) {
  // Rate Limit nur für AI Endpoints
  if (req.nextUrl.pathname.startsWith("/api/generate")) {
    const identifier = req.ip ?? "anonymous";
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }
  }

  // Auth Middleware
  // ...
}
```

**Option B: Upstash Redis (Production-Ready)**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
});
```

**Integration in API Route:**

```typescript
// app/api/generate-text/route.ts
import { aiRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const identifier = req.ip ?? user?.id ?? "anonymous";
  const { success, limit, remaining } = await aiRateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        limit,
        remaining,
        resetAt: new Date(Date.now() + 60000).toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      },
    );
  }

  // Rest of logic...
}
```

**Rate Limit Strategy:**
| Endpoint | Anon | Free | Brewer | Brewery | Enterprise |
|----------|------|------|--------|---------|------------|
| `/api/generate-text` | 5/day | 10/day | 50/month | 200/month | Unlimited |
| `/api/generate-image` | 0 | 3/day | 20/month | 100/month | Unlimited |
| `/api/stripe/webhook` | N/A | N/A | N/A | N/A | Unlimited |
| `/api/ratings` | 10/hr | 50/hr | 100/hr | 200/hr | Unlimited |

**Erfolgskriterien:**

- ✅ API Kosten bleiben unter Kontrolle
- ✅ DDoS-Schutz vorhanden
- ✅ Premium User haben höhere Limits
- ✅ Rate Limit Headers in Response

**Zeitaufwand:** 2-3 Tage  
**Risiko:** Niedrig (Keine Breaking Changes)

---

### 2.3 Database Query Optimization (N+1 Elimination)

**Problem:**  
Discover Page und andere Listen führen N+1 Queries aus. Bei 100 Brews = 101 Queries.

**Beispiel:**

```typescript
// ❌ AKTUELL: discover/page.tsx
const { data } = await supabase.from("brews").select("*");
// Dann für JEDEN Brew:
const { data: likesData } = await supabase
  .from("likes")
  .select("brew_id")
  .eq("user_id", user.id);
```

**Lösung:**

**Schritt 1:** JOIN statt multiple Queries

```typescript
// ✅ NEU: Single Query mit LEFT JOIN
const { data } = await supabase
  .from("brews")
  .select(
    `
    *,
    breweries:brewery_id (id, name, logo_url),
    ratings(rating),
    likes!left(user_id)
  `,
  )
  .eq("is_public", true)
  .eq("likes.user_id", user?.id || "")
  .order("created_at", { ascending: false });

// Transform in Client
const brewsWithLikeStatus = data.map((brew) => ({
  ...brew,
  user_has_liked: brew.likes.length > 0,
  avg_rating: calculateAvgRating(brew.ratings),
}));
```

**Schritt 2:** Materialized Views für komplexe Aggregationen

**⚠️ WARNUNG:** Materialized Views sind **nicht realtime**. User könnten verwirrt sein, wenn Likes "verschwinden".

**Alternative (empfohlen):** Nutze **Trigger** für Realtime-Counters:

```sql
-- BESSER: Realtime Counter via Trigger
CREATE OR REPLACE FUNCTION update_brew_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update likes_count on brews table
  IF TG_OP = 'INSERT' THEN
    UPDATE brews SET likes_count = likes_count + 1 WHERE id = NEW.brew_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE brews SET likes_count = likes_count - 1 WHERE id = OLD.brew_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER likes_counter
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_brew_stats();
```

**Nur wenn Trigger nicht ausreichen:** Materialized View (für komplexe Aggregationen)

```sql
-- supabase/migrations/20260125000000_create_brew_stats_view.sql
CREATE MATERIALIZED VIEW brew_stats AS
SELECT
  b.id,
  b.name,
  b.style,
  b.image_url,
  b.created_at,
  b.brewery_id,
  b.likes_count,
  COUNT(DISTINCT r.id) as rating_count,
  AVG(r.rating) as avg_rating,
  br.name as brewery_name,
  br.logo_url as brewery_logo
FROM brews b
LEFT JOIN ratings r ON r.brew_id = b.id
LEFT JOIN breweries br ON br.id = b.brewery_id
WHERE b.is_public = true
GROUP BY b.id, br.id;

CREATE INDEX idx_brew_stats_created ON brew_stats(created_at DESC);
CREATE INDEX idx_brew_stats_likes ON brew_stats(likes_count DESC);
CREATE INDEX idx_brew_stats_rating ON brew_stats(avg_rating DESC);

-- Refresh jeden Tag um 3 Uhr (NICHT realtime!)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'refresh-brew-stats',
  '0 3 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY brew_stats'
);

-- ⚠️ User müssen verstehen: Stats sind max. 24h alt!
```

**Schritt 3:** Query mit View

```typescript
const { data } = await supabase
  .from("brew_stats")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(50);

// Check User Likes separat (nur einmal!)
const { data: userLikes } = await supabase
  .from("likes")
  .select("brew_id")
  .eq("user_id", user.id);

const likedIds = new Set(userLikes.map((l) => l.brew_id));
const brewsWithStatus = data.map((b) => ({
  ...b,
  user_has_liked: likedIds.has(b.id),
}));
```

**Weitere Optimierungen:**

1. **Indexes prüfen**: Alle Foreign Keys indexiert?
2. **Pagination**: Infinite Scroll statt "Alles laden"
3. **Prefetching**: Next.js Link Prefetch nutzen
4. **Denormalization**: `likes_count` bereits vorhanden (gut!)

**Erfolgskriterien:**

- ✅ Discover Page lädt in < 500ms
- ✅ Max 3 DB Queries pro Page Load
- ✅ Postgres Query Time < 50ms

**Zeitaufwand:** 4-5 Tage  
**Risiko:** Mittel (DB Schema Changes)

---

### 2.4 Environment Variables Validation

**Problem:**  
Fallback-Werte bei fehlenden ENVs führen zu "works on my machine"-Bugs. Production Crashes bei fehlendem Stripe Key.

**Lösung:**

**Schritt 1:** Env Schema mit Zod

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // APIs
  GOOGLE_AI_API_KEY: z.string().min(1),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_BREWER: z.string().startsWith("price_"),
  STRIPE_PRICE_BREWERY: z.string().startsWith("price_"),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_PAYMENTS: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // Analytics
  ANALYTICS_SALT: z.string().min(32),

  // Optional: Admin
  ADMIN_EMAILS: z.string().optional(),

  // Node Env
  NODE_ENV: z.enum(["development", "production", "test"]),
});

export const env = envSchema.parse(process.env);

// Type-safe Export
export type Env = z.infer<typeof envSchema>;
```

**Schritt 2:** Nutzung

```typescript
// Statt process.env.STRIPE_SECRET_KEY
import { env } from "@/lib/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
```

**Schritt 3:** Build-Time Validation

```json
// package.json
{
  "scripts": {
    "validate-env": "tsx lib/env.ts",
    "prebuild": "npm run validate-env",
    "predev": "npm run validate-env"
  }
}
```

**Schritt 4:** .env.example updaten

```bash
# .env.example (Template für neue Devs)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

GOOGLE_AI_API_KEY=your_gemini_api_key_here

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BREWER=price_...
STRIPE_PRICE_BREWERY=price_...

NEXT_PUBLIC_ENABLE_PAYMENTS=false

ANALYTICS_SALT=generate_with_openssl_rand_base64_32

ADMIN_EMAILS=admin@example.com

NODE_ENV=development
```

**Erfolgskriterien:**

- ✅ Build schlägt fehl bei fehlenden ENVs
- ✅ Type-safe ENV Access überall
- ✅ Keine Fallback-Werte mehr

**Zeitaufwand:** 1 Tag  
**Risiko:** Niedrig

---

## 🟡 PHASE 3: CODE QUALITY (Woche 8-9)

### 3.1 Extended Testing Coverage

**Problem:**  
Phase 0 liefert nur Smoke Tests. Wir brauchen tiefere Coverage für Business Logic und Edge Cases.

**⚠️ HINWEIS:** Smoke Tests (E2E) sind bereits in Phase 0 eingerichtet. Phase 3 erweitert Coverage.

**Lösung:**

**Schritt 1:** Unit Testing Setup

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom
```

**Vitest Config:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

**Schritt 2:** Unit Tests für Utilities

```typescript
// lib/brewing-calculations.test.ts
import { describe, it, expect } from "vitest";
import { calculateABV, calculateIBU } from "./brewing-calculations";

describe("Brewing Calculations", () => {
  describe("calculateABV", () => {
    it("calculates ABV correctly for standard beer", () => {
      expect(calculateABV(12, 3)).toBeCloseTo(4.7, 1);
    });

    it("returns 0 for invalid input", () => {
      expect(calculateABV(0, 0)).toBe(0);
      expect(calculateABV(null, 3)).toBe(0);
    });
  });
});
```

**Schritt 3:** Integration Tests für Actions

```typescript
// lib/actions/like-actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toggleBrewLike } from "./like-actions";

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(),
}));

describe("toggleBrewLike", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when user not authenticated", async () => {
    // Mock: No user
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(toggleBrewLike({ brewId: "test-uuid" })).rejects.toThrow(
      "User must be logged in",
    );
  });

  it("creates like when none exists", async () => {
    // Mock: User exists, no existing like
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabase.from().select().single.mockResolvedValue({ data: null });

    await toggleBrewLike({ brewId: "test-uuid" });

    expect(mockSupabase.from("likes").insert).toHaveBeenCalledWith({
      user_id: mockUser.id,
      brew_id: "test-uuid",
    });
  });
});
```

**Test Coverage Goals:**

- **Unit Tests:** 80%+ für `lib/` utilities (NEU in Phase 3)
- **Integration Tests:** Alle Server Actions (NEU)
- **E2E Tests:** ✅ Bereits in Phase 0 (Smoke Tests)
  - ✅ Auth (Sign Up, Login, Logout)
  - ✅ Brew Creation & Publish
  - ✅ Like & Rating
  - 🆕 Extended: Payment Edge Cases
  - 🆕 Extended: Analytics Filters
  - 🆕 Extended: Internationalization

**CI/CD Integration:**

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

**Erfolgskriterien:**

- ✅ CI/CD Pipeline läuft grün
- ✅ Critical Paths haben E2E Coverage
- ✅ Refactorings sind safe

**Zeitaufwand:** 5-7 Tage  
**Risiko:** Niedrig (Keine Code-Änderungen)

---

### 3.2 Constants & Magic Numbers Elimination

**Problem:**  
String Literals und Magic Numbers überall. Schwer zu ändern, fehleranfällig.

**Lösung:**

```typescript
// lib/constants/subscription.ts
export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  BREWER: "brewer",
  BREWERY: "brewery",
  ENTERPRISE: "enterprise",
} as const;

export type SubscriptionTier =
  (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS];

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  PAUSED: "paused",
  TRIAL: "trial",
} as const;

export const AI_CREDITS = {
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.BREWER]: 50,
  [SUBSCRIPTION_TIERS.BREWERY]: 200,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: -1, // Unlimited
} as const;

export const ANALYTICS_RETENTION_DAYS = {
  [SUBSCRIPTION_TIERS.FREE]: 7,
  [SUBSCRIPTION_TIERS.BREWER]: 30,
  [SUBSCRIPTION_TIERS.BREWERY]: 90,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 365,
} as const;
```

```typescript
// lib/constants/brew.ts
export const BREW_TYPES = {
  BEER: "beer",
  WINE: "wine",
  SOFTDRINK: "softdrink",
} as const;

export const BREW_STYLES = {
  // Beer
  IPA: "IPA",
  PALE_ALE: "Pale Ale",
  STOUT: "Stout",
  LAGER: "Lager",
  PILSNER: "Pilsner",
  WHEAT: "Weizen",
  // Wine
  RED: "Rotwein",
  WHITE: "Weißwein",
  ROSE: "Rosé",
  // Soft Drink
  LEMONADE: "Limonade",
  COLA: "Cola",
} as const;

export const MAX_BREW_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_IMAGE_SIZE_MB = 5;
```

```typescript
// lib/constants/ui.ts
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
} as const;
```

**Migration:**

1. Constants definieren
2. Find & Replace im Code
3. Type Imports aktualisieren

**Erfolgskriterien:**

- ✅ Keine String Literals für Enums
- ✅ Alle Zahlen als Named Constants
- ✅ Type Safety durch `as const`

**Zeitaufwand:** 2 Tage  
**Risiko:** Niedrig

---

### 3.3 Structured Logging Implementation

**Problem:**  
`console.log()` überall. In Production nicht suchbar, keine Kontext-Info, kein Monitoring.

**Lösung:**

**Schritt 1:** Pino installieren

```bash
npm install pino pino-pretty
```

**Schritt 2:** Logger konfigurieren

```typescript
// lib/logger.ts
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: process.env.NODE_ENV,
  },
});

// Child Loggers für Bereiche
export const authLogger = logger.child({ module: "auth" });
export const paymentLogger = logger.child({ module: "payment" });
export const analyticsLogger = logger.child({ module: "analytics" });
export const aiLogger = logger.child({ module: "ai" });
```

**Schritt 3:** Nutzung

```typescript
// Statt: console.log(`[Webhook] User ${userId} upgraded to ${tier}`)
paymentLogger.info({ userId, tier }, "User upgraded subscription");

// Statt: console.error('Error:', error)
authLogger.error({ error: error.message, stack: error.stack }, "Login failed");

// Statt: console.warn('Session error')
authLogger.warn({ sessionId, reason: "expired" }, "Session validation failed");
```

**Schritt 4:** Request ID Tracking

```typescript
// middleware.ts
import { v4 as uuidv4 } from "uuid";

export async function middleware(req: NextRequest) {
  const requestId = uuidv4();
  req.headers.set("x-request-id", requestId);

  logger.info(
    {
      requestId,
      method: req.method,
      path: req.nextUrl.pathname,
    },
    "Incoming request",
  );

  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  return res;
}
```

**Schritt 5:** Production Monitoring (Optional)

```typescript
// Integration mit Axiom, Datadog, etc.
import { AxiomLogger } from "@axiomhq/pino";

const logger = pino(
  process.env.NODE_ENV === "production"
    ? new AxiomLogger({
        dataset: "botllab-logs",
        token: process.env.AXIOM_TOKEN!,
      })
    : undefined,
);
```

**Log Levels:**

- `debug`: Development only (SQL Queries, etc.)
- `info`: Normal operations (User actions, API calls)
- `warn`: Recoverable errors (Retries, Fallbacks)
- `error`: Unrecoverable errors (Exceptions, Crashes)
- `fatal`: System-critical failures

**Erfolgskriterien:**

- ✅ Keine `console.log()` in Production Code
- ✅ Alle Logs haben Kontext (userId, requestId, etc.)
- ✅ Logs sind filterbar und suchbar

**Zeitaufwand:** 2-3 Tage  
**Risiko:** Niedrig

---

## 🟢 PHASE 4: PERFORMANCE & MONITORING (Woche 8+)

### 4.1 Caching Strategy

**Problem:**  
Alle Queries schlagen direkt auf DB. Bei vielen Users = Slow Page Loads.

**Lösung:**

**Level 1: Next.js Built-in Caching**

```typescript
import { unstable_cache } from "next/cache";

export const getBreweryStats = unstable_cache(
  async (breweryId: string) => {
    const supabase = await createClient();
    return await supabase
      .from("breweries")
      .select("*, brews(count)")
      .eq("id", breweryId)
      .single();
  },
  ["brewery-stats"],
  { revalidate: 3600 }, // 1 Stunde
);
```

**Level 2: Redis für Live-Data**

```typescript
// lib/cache/redis.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function getCachedBrewery(breweryId: string) {
  const cached = await redis.get(`brewery:${breweryId}`);
  if (cached) return cached;

  const brewery = await fetchBreweryFromDB(breweryId);
  await redis.set(`brewery:${breweryId}`, brewery, { ex: 600 }); // 10 min
  return brewery;
}

export async function invalidateBreweryCache(breweryId: string) {
  await redis.del(`brewery:${breweryId}`);
}
```

**Level 3: Edge Caching für Public Pages**

```typescript
// app/brew/[id]/page.tsx
export const revalidate = 60; // ISR: 1 Minute

export async function generateStaticParams() {
  // Pre-render top 100 brews
  const { data } = await supabase
    .from("brews")
    .select("id")
    .eq("is_public", true)
    .order("likes_count", { ascending: false })
    .limit(100);

  return data.map((brew) => ({ id: brew.id }));
}
```

**Cache Invalidation Strategy:**

- **Brewery Update** → Invalidate `brewery:${id}`
- **New Brew** → Invalidate `brewery:${breweryId}:brews`
- **Like** → Revalidate `brew:${id}` (Background)
- **Analytics** → Cache 15 min, Refresh Button bypasses

**Erfolgskriterien:**

- ✅ Page Load < 500ms (cached)
- ✅ DB Load -70%
- ✅ Cache Hit Rate > 80%

**Zeitaufwand:** 4-5 Tage  
**Risiko:** Mittel (Cache Invalidation ist schwer)

---

### 4.2 Performance Monitoring

**Lösung:**

**Vercel Analytics:**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Custom Performance Marks:**

```typescript
// lib/performance.ts
export function measurePageLoad(pageName: string) {
  if (typeof window === "undefined") return;

  performance.mark(`${pageName}-start`);

  return () => {
    performance.mark(`${pageName}-end`);
    performance.measure(pageName, `${pageName}-start`, `${pageName}-end`);

    const measure = performance.getEntriesByName(pageName)[0];
    logger.info({ pageName, duration: measure.duration }, "Page load measured");
  };
}

// Usage
const done = measurePageLoad("discover-page");
await loadData();
done();
```

**Sentry für Error Tracking:**

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  integrations: [new Sentry.BrowserTracing()],
});
```

**Erfolgskriterien:**

- ✅ Real User Monitoring aktiv
- ✅ Errors werden automatisch geloggt
- ✅ Performance Budgets eingehalten

**Zeitaufwand:** 2 Tage  
**Risiko:** Niedrig

---

## 📊 SUCCESS METRICS

| Metrik                     | Vorher  | Ziel      | Phase   | Kritisch |
| -------------------------- | ------- | --------- | ------- | -------- |
| **Smoke Tests**            | 0       | 5/15+     | Phase 0 | ✅       |
| **Auth-Flow Refactor**     | 0%      | 100%      | Phase 1 | ✅       |
| **Type Safety (UI)**       | 10%     | 70%       | Phase 1 | -        |
| **Input Validation**       | 0%      | 100%      | Phase 1 | ⏳       |
| **Test Coverage (Unit)**   | 0%      | 80%       | Phase 3 | ✅       |
| **Discover Page Load**     | 2.5s    | < 800ms   | Phase 2 | ✅       |
| **Analytics Page Size**    | 818 LOC | < 100 LOC | Phase 2 | ✅       |
| **DB Queries per Page**    | 10-15   | < 3       | Phase 2 | ✅       |
| **Build Time**             | 2min    | < 90s     | Phase 4 | -        |
| **Bundle Size (First JS)** | ?       | < 200KB   | Phase 2 | -        |
| **Error Rate (Prod)**      | ?       | < 0.5%    | Phase 4 | ✅       |
| **Cache Hit Rate**         | 0%      | > 70%     | Phase 4 | -        |

---

## 🚀 DEPLOYMENT STRATEGY

**Week 1 (Phase 0 - Safety Net):**

- Feature Branch: `test/smoke-tests`
- Setup Playwright + CI
- **Blocker:** Kein Merge ohne grüne Tests
- Merge to Main (CI Pipeline aktiv)

**Week 2-3 (Phase 1 - Critical Fixes):**

- Feature Branch: `refactor/supabase-client`
- Incremental Migration (pro Component testen)
- Staging Deployment nach jedem Milestone
- **Rollback Plan:** Feature Flag für neuen Client
- Merge wenn alle Smoke Tests grün

**Week 4-7 (Phase 2 - Architecture):**

- Feature Branch: `refactor/analytics-rsc`
- Server Components Migration
- Canary Deployment (10% Traffic → 50% → 100%)
- Performance Monitoring aktiv

**Week 8-9 (Phase 3 - Quality):**

- Feature Branch: `test/unit-coverage`
- Continuous Integration
- Merge when Coverage > 70%

**Week 10+ (Phase 4 - Performance):**

- Feature Branch: `perf/caching`
- A/B Testing (Cached vs. Non-Cached)
- Gradual Rollout mit Feature Flags

---

## 📝 LEARNINGS & BEST PRACTICES

**Was gut war:**

- Supabase RLS → Security by Design
- Migrations in Git → Reproducibility
- TypeScript Basis → Gute Grundlage

**Was gelernt wurde:**

- Singletons sind gefährlich in Next.js App Router
- N+1 Queries killen Performance
- Tests sind nicht optional
- Type Safety spart Debugging-Zeit

**Für die Zukunft:**

- TDD für neue Features
- Code Reviews vor Merge
- Performance Budget in CI
- Documentation First

---

## 🤝 TEAM RESPONSIBILITIES

| Phase              | Lead          | Support      | Duration | Blocker für Phase |
| ------------------ | ------------- | ------------ | -------- | ----------------- |
| Phase 0 (Tests)    | QA Lead       | All Devs     | 1 week   | Alle Phasen       |
| Phase 1 (Critical) | Backend Dev   | Frontend Dev | 2 weeks  | Phase 2           |
| Phase 2 (Arch)     | Frontend Dev  | Backend Dev  | 4 weeks  | Phase 4           |
| Phase 3 (Quality)  | QA + All Devs | -            | 2 weeks  | -                 |
| Phase 4 (Perf)     | Backend Dev   | DevOps       | 3+ weeks | -                 |

---

## ⚠️ RISKS & MITIGATION

| Risk                         | Impact | Probability | Mitigation                           |
| ---------------------------- | ------ | ----------- | ------------------------------------ |
| Breaking Changes in Refactor | High   | Low         | ✅ Phase 0 Smoke Tests fangen Bugs   |
| Singleton Migration zu groß  | High   | Medium      | Feature Flag + Incremental Rollout   |
| Performance Regression       | Medium | Low         | Before/After Benchmarks + Monitoring |
| Cache Invalidation Bugs      | High   | Medium      | Extensive Testing + Observability    |
| Team Capacity                | Medium | High        | Priorisierung nach Impact            |
| Test Maintenance Overhead    | Low    | Medium      | Fokus auf Integration Tests          |

---

**Next Review:** 2026-02-15  
**Owner:** Tech Lead  
**Status Updates:** Weekly Standup
